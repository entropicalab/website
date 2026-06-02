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

export type Mode = 'new' | 'renovation';

// RENOVATION reference values (research: "Panama Renovation Cost Research").
// MUPA publishes minimum taxable $/m² per renovation class — single-family
// 250/350/500, condo unit 250/300/375, commercial/office ~750 (open plazas
// ~500). these are FLOORS (DOYC adjusts upward to audited market value), so
// we model the cost as a band from the reference floor to ~1.6× market.
// commercial tiers are extrapolated around the 750 office-reform reference.
const RENO_M2: Record<Typology, Record<Tier, Range>> = {
  'residential-sf': { basic: r(250, 400), standard: r(350, 560), premium: r(500, 800) },
  'residential-mf': { basic: r(250, 400), standard: r(300, 480), premium: r(375, 600) },
  office: { basic: r(500, 750), standard: r(750, 1050), premium: r(900, 1300) },
  commercial: { basic: r(500, 750), standard: r(750, 1050), premium: r(900, 1300) },
  institutional: { basic: r(450, 700), standard: r(700, 1000), premium: r(850, 1250) },
};
// renovation soft costs: COICI sets a 2 % structural-design fee on reforms
// (a premium over new build), plus municipal Visto Bueno (~1 %) and legal.
const RENO_SOFT_MULTIPLIER = 1.12;

export interface CapexResult {
  perM2: Range; // $/m² market (finish-based)
  hard: Range; // market construction/renovation only
  total: Range; // + soft costs
}

export function estimateCapex(
  area: number,
  typ: Typology,
  tier: Tier,
  mode: Mode = 'new'
): CapexResult {
  const perM2 = mode === 'renovation' ? RENO_M2[typ][tier] : CAPEX_M2[typ][tier];
  const hard = scale(perM2, area);
  const total = scale(hard, mode === 'renovation' ? RENO_SOFT_MULTIPLIER : SOFT_COST_MULTIPLIER);
  return { perM2, hard, total };
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

// the building's NON-COOLING load (lighting + plug + other) is fixed per m²
// and INDEPENDENT of air-conditioning — switching the AC off does not dim the
// lights. we anchor it to the naturally-ventilated EUI (`nv`), which is, by
// definition, a building's energy use with no mechanical cooling. cooling is
// then the extra energy AC adds on top, = (fc − nv), scaled by the % of the
// building that is air-conditioned. so only AC tracks the slider.
//
// the non-cooling base is split into its three end uses by these sub-shares
// (derived from the standard tropical 20 % plug / 15 % lighting / 5 % other
// split, renormalised to the non-cooling portion).
const NONCOOLING_SUBSHARE: Record<'lighting' | 'plug' | 'other', number> = {
  plug: 0.5, // 20 / 40
  lighting: 0.375, // 15 / 40
  other: 0.125, // 5 / 40
};

// RES V.2 per-end-use reductions. cooling falls most (passive envelope:
// roof insulation, low-SHGC glazing, reflective albedo + inverter AC);
// lighting falls via LED + daylighting; plug loads barely move.
export const SUSTAINABLE_REDUCTION: Record<EndUse, number> = {
  ac: 0.4,
  lighting: 0.3,
  plug: 0.05,
  other: 0.1,
};

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

// monthly electricity bill ($) for a given monthly kWh. residential is the
// progressive, post-FET-subsidy bill; commercial/office switches BTD→MTD by
// size; institutional is flat. non-residential classes get no FET subsidy.
function monthlyBill(typ: Typology, monthlyKWh: number, area: number): number {
  if (monthlyKWh <= 0) return 0;
  if (isResidential(typ)) return residentialBill(monthlyKWh);
  const rate = typ === 'institutional' ? 0.18 : area >= 2000 ? 0.18 : 0.21;
  return monthlyKWh * rate;
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

// water-cooled (cooling-tower / chiller) plants are materially more efficient
// than air-cooled DX, so they cut COOLING electricity even as they add water
// use. ~15 % less cooling energy is a conservative, defensible figure. only
// applies to non-residential (towers are commercial/institutional).
const WATERCOOL_HVAC_FACTOR = 0.85;

export function estimateEnergy(
  area: number,
  typ: Typology,
  pctAC: number, // 0–1
  waterCooledAC = false
): EnergyResult {
  const eui = EUI[typ];
  // non-cooling base load (lighting + plug + other), fixed, = nv. cooling is
  // the extra (fc − nv) that mechanical AC adds, scaled by % air-conditioned.
  const coolFactor =
    waterCooledAC && !isResidential(typ) ? WATERCOOL_HVAC_FACTOR : 1;
  const coolingEUI: Range = {
    low: (eui.fc.low - eui.nv.low) * pctAC * coolFactor,
    high: (eui.fc.high - eui.nv.high) * pctAC * coolFactor,
  };
  const baseEUI: Range = eui.nv; // lighting + plug + other, AC-independent

  const buildScenario = (reduce: boolean): EnergyScenario => {
    const perUse = {} as Record<EndUse, Range>;
    let totalKWh: Range = r(0, 0);
    const useKWh = {} as Record<EndUse, Range>;

    const addUse = (use: EndUse, annual: Range) => {
      const factor = reduce ? 1 - SUSTAINABLE_REDUCTION[use] : 1;
      const monthly = scale({ low: annual.low * factor, high: annual.high * factor }, 1 / 12);
      useKWh[use] = monthly;
      totalKWh = addR(totalKWh, monthly);
    };

    // cooling — the only end use that responds to the % AC slider
    addUse('ac', { low: coolingEUI.low * area, high: coolingEUI.high * area });
    // non-cooling end uses — fixed per-m² estimates, independent of AC
    (['lighting', 'plug', 'other'] as const).forEach((use) => {
      addUse(use, {
        low: baseEUI.low * NONCOOLING_SUBSHARE[use] * area,
        high: baseEUI.high * NONCOOLING_SUBSHARE[use] * area,
      });
    });

    // marginal cost attribution: the fixed base loads sit on the cheap, lower
    // (subsidised) blocks; cooling is the load stacked on top, so it carries
    // the marginal "tier-creep" cost it actually causes. this keeps the
    // lighting / plug / other dollar figures stable as the AC slider moves —
    // only AC responds — while the total still equals the true bill.
    (['ac', 'lighting', 'plug', 'other'] as EndUse[]).forEach((u) => {
      perUse[u] = { low: 0, high: 0 };
    });
    (['low', 'high'] as const).forEach((b) => {
      const baseK = useKWh.lighting[b] + useKWh.plug[b] + useKWh.other[b];
      const totalK = baseK + useKWh.ac[b];
      const baseBill = monthlyBill(typ, baseK, area);
      const totalBill = monthlyBill(typ, totalK, area);
      perUse.ac[b] = Math.max(totalBill - baseBill, 0);
      (['lighting', 'plug', 'other'] as const).forEach((u) => {
        perUse[u][b] = baseK > 0 ? baseBill * (useKWh[u][b] / baseK) : 0;
      });
    });
    const total: Range = {
      low: monthlyBill(typ, totalKWh.low, area),
      high: monthlyBill(typ, totalKWh.high, area),
    };
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

// a single-family household has roughly the same number of people regardless
// of how large the house is — a 600 m² home is not 15 people. so SF occupancy
// is clamped to a realistic 2–6, instead of scaling linearly with area.
const SF_OCCUPANCY_MIN = 2;
const SF_OCCUPANCY_MAX = 6;

export function estimateWater(
  area: number,
  typ: Typology,
  waterCooledAC: boolean
): WaterResult {
  let people = (DENSITY[typ] * area) / 100;
  if (typ === 'residential-sf') {
    people = Math.min(Math.max(people, SF_OCCUPANCY_MIN), SF_OCCUPANCY_MAX);
  }
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
  mode?: Mode; // 'new' (default) or 'renovation'
  premiumMaintenance?: boolean;
}

// ------------------------------------------------------------
// 6 · LIFECYCLE — 30-year total cost of ownership (research part 2)
// ------------------------------------------------------------
// total cost = construction CAPEX + the net present value of operating cost
// over the building's life. discount rate 6.25 % matches the SBP late-2025
// benchmark mortgage rate; horizon 30 years (residential design life). only
// energy differs between scenarios, so the lifecycle gap IS the discounted
// value of designing to the sustainable code.
export const DISCOUNT_RATE = 0.0625;
export const LIFECYCLE_YEARS = 30;
// present-value annuity factor for a level annual cost over the horizon
const ANNUITY_FACTOR =
  (1 - Math.pow(1 + DISCOUNT_RATE, -LIFECYCLE_YEARS)) / DISCOUNT_RATE; // ≈ 13.4

export interface LifecycleResult {
  regular: Range; // capex + NPV(opex) over the horizon
  sustainable: Range;
  savings: Range; // regular − sustainable (discounted lifetime saving)
}

export interface FullEstimate {
  capex: CapexResult;
  energy: EnergyResult;
  water: WaterResult;
  maintenance: MaintenanceResult;
  monthlyOpex: { regular: Range; sustainable: Range };
  lifecycle: LifecycleResult;
}

export function estimateAll(input: CalculatorInputs): FullEstimate {
  const capex = estimateCapex(input.area, input.typology, input.tier, input.mode ?? 'new');
  const energy = estimateEnergy(input.area, input.typology, input.pctAC, input.waterCooledAC);
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

  // lifecycle: capex + discounted 30-year operation
  const npvOpex = (monthly: Range): Range => ({
    low: monthly.low * 12 * ANNUITY_FACTOR,
    high: monthly.high * 12 * ANNUITY_FACTOR,
  });
  const lcRegular = addR(capex.total, npvOpex(monthlyOpex.regular));
  const lcSustainable = addR(capex.total, npvOpex(monthlyOpex.sustainable));
  const lifecycle: LifecycleResult = {
    regular: lcRegular,
    sustainable: lcSustainable,
    savings: {
      low: lcRegular.low - lcSustainable.low,
      high: lcRegular.high - lcSustainable.high,
    },
  };

  return { capex, energy, water, maintenance, monthlyOpex, lifecycle };
}
