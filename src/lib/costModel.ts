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

export interface CapexResult {
  perM2: Range; // $/m² used
  hard: Range; // construction only
  total: Range; // construction + soft costs
}

export function estimateCapex(area: number, typ: Typology, tier: Tier): CapexResult {
  const perM2 = CAPEX_M2[typ][tier];
  const hard = scale(perM2, area);
  const total = scale(hard, SOFT_COST_MULTIPLIER);
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

// effective $/kWh per the synthesis section: residential uses progressive
// BTS blocks keyed to monthly kWh; commercial/office switches BTD→MTD by
// size; institutional is a flat approximation.
function tariff(typ: Typology, monthlyKWh: number, area: number): number {
  if (isResidential(typ)) {
    if (monthlyKWh <= 300) return 0.16;
    if (monthlyKWh <= 750) return 0.21;
    return 0.33;
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

    // tariff keyed to the scenario's midpoint monthly kWh (stable bracket)
    const midKWh = (totalKWh.low + totalKWh.high) / 2;
    const rate = tariff(typ, midKWh, area);

    (Object.keys(useKWh) as EndUse[]).forEach((use) => {
      perUse[use] = scale(useKWh[use], rate);
    });
    const total = scale(totalKWh, rate);
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
const WASTE_FEE: Record<'residential' | 'commercial', number> = {
  residential: 4.0,
  commercial: 35.0,
};
const MIN_MONTHLY: Record<'residential' | 'commercial', number> = {
  residential: 6.4,
  commercial: 11.5,
};

export interface WaterResult {
  monthly: Range; // total monthly $ (potable + sewer + waste)
  monthlyKGal: Range;
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
  const monthlyGal: Range = scale(dailyL, 30 / L_PER_GALLON);
  const monthlyKGal: Range = scale(monthlyGal, 1 / 1000);

  const residential = isResidential(typ);
  const cls = residential ? 'residential' : 'commercial';
  const raw: Range = {
    low: idaanBill(monthlyKGal.low, residential),
    high: idaanBill(monthlyKGal.high, residential),
  };
  const withSurcharges: Range = {
    low: Math.max(raw.low * SEWER_MULTIPLIER + WASTE_FEE[cls], MIN_MONTHLY[cls]),
    high: Math.max(raw.high * SEWER_MULTIPLIER + WASTE_FEE[cls], MIN_MONTHLY[cls]),
  };
  return { monthly: withSurcharges, monthlyKGal, people };
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
  const capex = estimateCapex(input.area, input.typology, input.tier);
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
