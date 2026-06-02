// ============================================================
// panama building cost model
// ------------------------------------------------------------
// pure data + pure functions. NO dom access here so this module
// can be imported by the client island and unit-reasoned in isolation.
//
// every figure traces back to "Panama Building Cost Calculator Research"
// (the parametric framework doc). outputs are RANGES, never single
// points — the underlying data is itself quoted as ranges and a single
// number would be false precision.
//
// scenarios:
//   · "regular"     = a typical, non-optimised building, air-conditioned
//                     to the user's % and run at standard intensity.
//   · "sustainable" = the same building meeting panamá's RES V.2
//                     sustainable-building code via passive design +
//                     efficient systems. modelled as per-end-use
//                     reductions whose total lands inside the research's
//                     quoted 20–38.8 % savings band.
// ============================================================

export type Typology =
  | 'residential-sf'
  | 'residential-mf'
  | 'office'
  | 'commercial'
  | 'institutional';

export type Tier = 'basic' | 'standard' | 'premium';

export interface Range {
  low: number;
  high: number;
}

const r = (low: number, high: number): Range => ({ low, high });
const scale = (x: Range, k: number): Range => ({ low: x.low * k, high: x.high * k });
const addR = (a: Range, b: Range): Range => ({ low: a.low + b.low, high: a.high + b.high });

// ------------------------------------------------------------
// 1 · CAPEX — construction cost matrix ($/m²) by typology × tier
// ------------------------------------------------------------
export const CAPEX_M2: Record<Typology, Record<Tier, Range>> = {
  'residential-sf': { basic: r(370, 500), standard: r(650, 850), premium: r(1300, 2200) },
  'residential-mf': { basic: r(800, 1000), standard: r(1100, 1500), premium: r(1600, 2500) },
  office: { basic: r(600, 800), standard: r(850, 1200), premium: r(1300, 1800) },
  commercial: { basic: r(550, 750), standard: r(800, 1100), premium: r(1200, 1700) },
  institutional: { basic: r(650, 850), standard: r(900, 1250), premium: r(1300, 1900) },
};

// soft costs: ~5–10 % design + 1–1.5 % municipal permit + 1–2 % legal.
// research models the blended multiplier at ~1.15 on hard cost.
const SOFT_COST_MULTIPLIER = 1.15;

// official permitted-construction values, INEC private-construction registry,
// 1st semester 2024 (research part 2), in PAB(=USD)/m². these are DECLARED /
// permitted values used for municipal valuation — typically BELOW true all-in
// market build cost — so the calculator shows them ALONGSIDE the market
// estimate, not as a replacement. residential = residential-only average;
// `total` = all-classes average (used for non-residential typologies).
export type Province =
  | 'nacional'
  | 'panama'
  | 'panama-oeste'
  | 'colon'
  | 'cocle'
  | 'chiriqui'
  | 'veraguas'
  | 'los-santos'
  | 'herrera'
  | 'bocas'
  | 'darien';

export const PROVINCE_CAPEX: Record<Province, { residential: number; total: number }> = {
  nacional: { residential: 342.97, total: 331.59 },
  panama: { residential: 481.74, total: 462.71 },
  'panama-oeste': { residential: 284.85, total: 283.8 },
  colon: { residential: 265.27, total: 198.1 },
  cocle: { residential: 372.53, total: 347.17 },
  chiriqui: { residential: 337.91, total: 331.79 },
  veraguas: { residential: 289.36, total: 290.72 },
  'los-santos': { residential: 386.17, total: 336.13 },
  herrera: { residential: 221.87, total: 218.07 },
  bocas: { residential: 221.53, total: 228.75 },
  darien: { residential: 166.49, total: 163.6 },
};

export const PROVINCE_ORDER: Province[] = [
  'nacional',
  'panama',
  'panama-oeste',
  'colon',
  'cocle',
  'chiriqui',
  'veraguas',
  'los-santos',
  'herrera',
  'bocas',
  'darien',
];

export interface CapexResult {
  perM2: Range; // $/m² market (finish-based)
  hard: Range; // market construction only
  total: Range; // market construction + soft costs
  officialPerM2: number; // INEC permitted value $/m² for the province
  officialTotal: number; // officialPerM2 × area
}

export function estimateCapex(
  area: number,
  typ: Typology,
  tier: Tier,
  province: Province = 'nacional'
): CapexResult {
  const perM2 = CAPEX_M2[typ][tier];
  const hard = scale(perM2, area);
  const total = scale(hard, SOFT_COST_MULTIPLIER);
  const officialPerM2 = isResidential(typ)
    ? PROVINCE_CAPEX[province].residential
    : PROVINCE_CAPEX[province].total;
  return { perM2, hard, total, officialPerM2, officialTotal: officialPerM2 * area };
}

// ------------------------------------------------------------
// 2 · ENERGY — RES V.2 EUI tables (kWh/m²/yr) + tariffs + end-use split
// ------------------------------------------------------------
// fc = fully conditioned (100 % AC) · nv = naturally ventilated.
// a building's regular intensity is interpolated between nv and fc by
// the user's "% air-conditioned" input.
export const EUI: Record<Typology, { fc: Range; nv: Range }> = {
  'residential-sf': { fc: r(135, 155), nv: r(35, 45) },
  'residential-mf': { fc: r(140, 165), nv: r(40, 50) },
  office: { fc: r(172, 215), nv: r(60, 80) },
  commercial: { fc: r(240, 320), nv: r(75, 95) },
  institutional: { fc: r(120, 150), nv: r(40, 55) },
};

export type EndUse = 'ac' | 'lighting' | 'plug' | 'other';

// standard tropical end-use shares of total electricity. anchored to the
// research's "HVAC = 55–65 % of the bill" with the balance split across
// lighting, plug loads and a small 'other' (vertical transport, pumps).
export const END_USE_SHARE: Record<EndUse, number> = {
  ac: 0.6,
  plug: 0.2,
  lighting: 0.15,
  other: 0.05,
};

// RES V.2 per-end-use reductions. cooling falls most (passive envelope:
// roof insulation, low-SHGC glazing, reflective albedo + inverter AC);
// lighting falls via LED + daylighting; plug loads barely move. the
// blended total lands ~28 %, inside the quoted 20–38.8 % band.
export const SUSTAINABLE_REDUCTION: Record<EndUse, number> = {
  ac: 0.4,
  lighting: 0.3,
  plug: 0.05,
  other: 0.1,
};

// blended whole-building reduction = Σ(share · reduction). lands ~0.30,
// inside the research's quoted 20–38.8 % band. surfaced in the UI so the
// "sustainable" column has a single honest headline percentage.
export const SUSTAINABLE_SAVINGS_PCT = (Object.keys(END_USE_SHARE) as EndUse[]).reduce(
  (acc, u) => acc + END_USE_SHARE[u] * SUSTAINABLE_REDUCTION[u],
  0
);

const isResidential = (typ: Typology) =>
  typ === 'residential-sf' || typ === 'residential-mf';

// residential electricity is billed PROGRESSIVELY across BTS blocks and at
// rates that are NET of the FET state subsidy (research part 2). these net
// rates are a blend of the ENSA and EDEMET 2026 pliegos, so the tool is not
// tied to one concessionaire. a monthly fixed customer charge is added.
//   BTS-1 (0–300 kWh):   ~0.085–0.097 → blended 0.091
//   BTS-2 (301–750 kWh): ~0.152–0.164 → blended 0.158
//   BTS-3 (>750 kWh):    ~0.203–0.257 → blended 0.230
const RES_FIXED_CHARGE = 3.03; // $/month
const RES_BLOCKS: { upTo: number; rate: number }[] = [
  { upTo: 300, rate: 0.091 },
  { upTo: 750, rate: 0.158 },
  { upTo: Infinity, rate: 0.23 },
];

function residentialBill(monthlyKWh: number): number {
  let cost = RES_FIXED_CHARGE;
  let remaining = monthlyKWh;
  let prev = 0;
  for (const b of RES_BLOCKS) {
    const amt = Math.min(remaining, b.upTo - prev);
    if (amt > 0) {
      cost += amt * b.rate;
      remaining -= amt;
    }
    prev = b.upTo;
    if (remaining <= 0) break;
  }
  return cost;
}

// effective $/kWh. residential reflects the progressive, post-subsidy bill;
// commercial/office switches BTD→MTD by size; institutional is flat. these
// non-residential classes do not receive the FET subsidy.
function effectiveRate(typ: Typology, monthlyKWh: number, area: number): number {
  if (isResidential(typ)) {
    return monthlyKWh > 0 ? residentialBill(monthlyKWh) / monthlyKWh : 0;
  }
  if (typ === 'institutional') return 0.18;
  // office + commercial/retail
  return area >= 2000 ? 0.18 : 0.21;
}

export interface EnergyScenario {
  perUse: Record<EndUse, Range>; // monthly $ by end use
  total: Range; // monthly $ total
  monthlyKWh: Range; // monthly kWh total
}

export interface EnergyResult {
  regular: EnergyScenario;
  sustainable: EnergyScenario;
  monthlySavings: Range; // regular − sustainable
  annualSavings: Range;
}

export function estimateEnergy(
  area: number,
  typ: Typology,
  pctAC: number // 0–1
): EnergyResult {
  const eui = EUI[typ];
  // regular intensity, interpolated nv→fc by % conditioned
  const regularEUI: Range = {
    low: eui.nv.low + (eui.fc.low - eui.nv.low) * pctAC,
    high: eui.nv.high + (eui.fc.high - eui.nv.high) * pctAC,
  };

  const buildScenario = (reduce: boolean): EnergyScenario => {
    const perUse = {} as Record<EndUse, Range>;
    let totalKWh: Range = r(0, 0);

    // per-use annual kWh, then monthly
    const useKWh = {} as Record<EndUse, Range>;
    (Object.keys(END_USE_SHARE) as EndUse[]).forEach((use) => {
      const share = END_USE_SHARE[use];
      const factor = reduce ? 1 - SUSTAINABLE_REDUCTION[use] : 1;
      const annual: Range = {
        low: regularEUI.low * area * share * factor,
        high: regularEUI.high * area * share * factor,
      };
      const monthly = scale(annual, 1 / 12);
      useKWh[use] = monthly;
      totalKWh = addR(totalKWh, monthly);
    });

    // progressive billing: the effective $/kWh is computed at each bound of
    // the consumption range, so the low/high spread reflects the real tariff
    // curve (and the FET subsidy) rather than a single flat rate.
    const rateLo = effectiveRate(typ, totalKWh.low, area);
    const rateHi = effectiveRate(typ, totalKWh.high, area);

    (Object.keys(useKWh) as EndUse[]).forEach((use) => {
      perUse[use] = { low: useKWh[use].low * rateLo, high: useKWh[use].high * rateHi };
    });
    const total: Range = { low: totalKWh.low * rateLo, high: totalKWh.high * rateHi };
    return { perUse, total, monthlyKWh: totalKWh };
  };

  const regular = buildScenario(false);
  const sustainable = buildScenario(true);
  const monthlySavings: Range = {
    low: regular.total.low - sustainable.total.low,
    high: regular.total.high - sustainable.total.high,
  };
  return {
    regular,
    sustainable,
    monthlySavings,
    annualSavings: scale(monthlySavings, 12),
  };
}

// ------------------------------------------------------------
// 3 · WATER — IDAAN progressive blocks + sewer surcharge + waste fee
// ------------------------------------------------------------
export const DENSITY: Record<Typology, number> = {
  // occupants per 100 m²
  'residential-sf': 2.5,
  'residential-mf': 4.0,
  office: 8.0,
  commercial: 6.0,
  institutional: 12.0,
};

export const PERCAPITA: Record<Typology, Range> = {
  // metered demand, litres / person / day (dry DX AC).
  // NOTE: the research quotes gross design allowances (≈450–550 L for a
  // single-family home, against panamá's ≈507 L/day national average,
  // the highest in latin america). those allowances include distribution
  // losses and over-provisioning and overstate the BILLED volume, so for
  // residential we use lower metered-consumption bands. commercial/
  // institutional sanitation figures are kept as published.
  'residential-sf': r(300, 400),
  'residential-mf': r(280, 360),
  office: r(40, 50),
  commercial: r(60, 90),
  institutional: r(35, 55),
};

export const WATERCOOL_SURCHARGE: Record<Typology, Range> = {
  // additional L/person/day for water-cooled (cooling-tower) AC
  'residential-sf': r(0, 0),
  'residential-mf': r(0, 0),
  office: r(15, 25),
  commercial: r(20, 30),
  institutional: r(10, 20),
};

const L_PER_GALLON = 3.785;

// progressive block tables, $ per thousand-gallons (kGal)
function idaanBill(kGal: number, residential: boolean): number {
  if (kGal <= 0) return 0;
  let remaining = kGal;
  let bill = 0;
  const take = (amount: number, rate: number) => {
    const used = Math.min(remaining, amount);
    bill += used * rate;
    remaining -= used;
  };
  if (residential) {
    // note: above 50 kGal the whole bill flips to commercial; rare for a
    // residence, but we model it for completeness.
    if (kGal > 50) return idaanBill(kGal, false);
    take(10, 0.8);
    take(5, 1.36); // 11–15
    take(5, 1.51); // 16–20
    take(10, 1.62); // 21–30
    take(20, 1.67); // 31–50
  } else {
    if (kGal > 200) return kGal * 1.6225; // flat on total volume
    take(10, 1.15);
    take(90, 1.51); // 11–100
    take(50, 1.7); // 101–150
    take(50, 1.81); // 151–200
  }
  return bill;
}

const SEWER_MULTIPLIER = 1.4; // potable + ~40 % sewer surcharge
const WASTE_FEE = { commercial: 35.0 };
const MIN_MONTHLY = { commercial: 11.5 };

// residential IDAAN tariff (research part 2): billed in cubic metres with
// COMBINED water + sewer marginal rates, and a minimum 30 m³/month billing
// that sets a hard floor of $7.92/month. this is the authoritative
// structure and is materially cheaper than the gallon-converted table.
const M3_MIN_BILL = 7.92; // covers the first 30 m³ (minimum billing)
const M3_MIN_VOLUME = 30;
const IDAAN_M3_BLOCKS: { upTo: number; rate: number }[] = [
  { upTo: 41, rate: 0.26 }, // 0.21 water + 0.05 sewer
  { upTo: 60, rate: 0.46 },
  { upTo: 78, rate: 0.53 },
  { upTo: 116, rate: 0.56 },
  { upTo: 192, rate: 0.57 },
  { upTo: Infinity, rate: 0.6 }, // commercial-ish beyond 192 m³
];

function residentialWaterBill(m3: number): number {
  if (m3 <= M3_MIN_VOLUME) return M3_MIN_BILL;
  let cost = M3_MIN_BILL;
  let remaining = m3 - M3_MIN_VOLUME;
  let prev = M3_MIN_VOLUME;
  for (const b of IDAAN_M3_BLOCKS) {
    if (prev >= b.upTo) continue;
    const amt = Math.min(remaining, b.upTo - prev);
    if (amt > 0) {
      cost += amt * b.rate;
      remaining -= amt;
    }
    prev = b.upTo;
    if (remaining <= 0) break;
  }
  return cost;
}

export interface WaterResult {
  monthly: Range; // total monthly $ (water + sewer, + waste for commercial)
  monthlyM3: Range;
  people: number;
}

export function estimateWater(
  area: number,
  typ: Typology,
  waterCooledAC: boolean
): WaterResult {
  const people = (DENSITY[typ] * area) / 100;
  let pc = PERCAPITA[typ];
  if (waterCooledAC) pc = addR(pc, WATERCOOL_SURCHARGE[typ]);

  const dailyL: Range = scale(pc, people);
  const monthlyM3: Range = scale(dailyL, 30 / 1000); // litres/day → m³/month

  if (isResidential(typ)) {
    // part 2 m³ model, combined water + sewer, $7.92 floor
    const monthly: Range = {
      low: residentialWaterBill(monthlyM3.low),
      high: residentialWaterBill(monthlyM3.high),
    };
    return { monthly, monthlyM3, people };
  }

  // non-residential: keep the gallon-block model + sewer surcharge + waste
  const monthlyKGal: Range = scale(monthlyM3, 264.172 / 1000); // m³ → kGal
  const raw: Range = {
    low: idaanBill(monthlyKGal.low, false),
    high: idaanBill(monthlyKGal.high, false),
  };
  const monthly: Range = {
    low: Math.max(raw.low * SEWER_MULTIPLIER + WASTE_FEE.commercial, MIN_MONTHLY.commercial),
    high: Math.max(raw.high * SEWER_MULTIPLIER + WASTE_FEE.commercial, MIN_MONTHLY.commercial),
  };
  return { monthly, monthlyM3, people };
}

// ------------------------------------------------------------
// 4 · MAINTENANCE — PH (horizontal property) fees, $/m²/month
// ------------------------------------------------------------
export const MAINT_M2: Record<Typology, { standard: Range; premium: Range }> = {
  // single-family modelled on private upkeep ($0.40–0.75/m²); the premium
  // tier nudges to the top of that band (gated / serviced).
  'residential-sf': { standard: r(0.4, 0.6), premium: r(0.6, 0.75) },
  'residential-mf': { standard: r(1.25, 1.5), premium: r(1.75, 2.5) },
  office: { standard: r(1.8, 2.4), premium: r(2.5, 3.5) },
  commercial: { standard: r(2.0, 2.8), premium: r(3.0, 5.0) },
  institutional: { standard: r(0.8, 1.2), premium: r(1.4, 2.0) },
};

export interface MaintenanceResult {
  perM2: Range;
  monthly: Range;
}

export function estimateMaintenance(
  area: number,
  typ: Typology,
  premium = false
): MaintenanceResult {
  const perM2 = premium ? MAINT_M2[typ].premium : MAINT_M2[typ].standard;
  return { perM2, monthly: scale(perM2, area) };
}

// ------------------------------------------------------------
// 5 · top-level convenience — full estimate in one call
// ------------------------------------------------------------
export interface CalculatorInputs {
  area: number;
  typology: Typology;
  tier: Tier;
  pctAC: number; // 0–1
  waterCooledAC: boolean;
  province?: Province;
  premiumMaintenance?: boolean;
}

export interface FullEstimate {
  capex: CapexResult;
  energy: EnergyResult;
  water: WaterResult;
  maintenance: MaintenanceResult;
  monthlyOpex: { regular: Range; sustainable: Range };
}

export function estimateAll(input: CalculatorInputs): FullEstimate {
  const capex = estimateCapex(input.area, input.typology, input.tier, input.province ?? 'nacional');
  const energy = estimateEnergy(input.area, input.typology, input.pctAC);
  const water = estimateWater(input.area, input.typology, input.waterCooledAC);
  const maintenance = estimateMaintenance(
    input.area,
    input.typology,
    input.premiumMaintenance ?? false
  );
  const monthlyOpex = {
    regular: addR(addR(energy.regular.total, water.monthly), maintenance.monthly),
    sustainable: addR(
      addR(energy.sustainable.total, water.monthly),
      maintenance.monthly
    ),
  };
  return { capex, energy, water, maintenance, monthlyOpex };
}
