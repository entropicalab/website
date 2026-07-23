// ============================================================
// panamá · municipio de panamá permitting fees
// ------------------------------------------------------------
// pure functions, no dom. used by the permitting-map component to turn a
// project size + cost/m² into the taxes and administrative fees each step
// of the mupa process carries.
//
// what is computable and what is not:
//   · construction tax (impuesto de construcción, acuerdo no. 73-17) is a
//     progressive rate on the appraised value of the works. computable.
//   · the fixed administrative fees (rla base, per-sheet, minsa/mop review)
//     are published flat charges. computable, except the per-sheet count,
//     which depends on the drawing set and is shown as a per-unit note.
//   · the demolition tax and the occupation tax are assessed by doyc on
//     site inspection with no published formula. NOT computable: the map
//     labels these "se calcula en inspección" rather than inventing a number.
// ============================================================

export interface Bracket {
  upTo: number;
  rate: number;
}

// impuesto de construcción · acuerdo no. 73-17, mupa.
// progressive brackets on the total appraised value of the works (B/.).
export const CONSTRUCTION_TAX_BRACKETS: Bracket[] = [
  { upTo: 500, rate: 0 }, // exento
  { upTo: 500_000, rate: 0.01 }, // 1.00%
  { upTo: 1_000_000, rate: 0.0126 }, // 1.26% sobre el excedente
  { upTo: Infinity, rate: 0.005 }, // 0.50% sobre el excedente
];

// progressive tax across the brackets above.
export function constructionTax(value: number): number {
  if (value <= 0) return 0;
  let tax = 0;
  let prev = 0;
  let remaining = value;
  for (const b of CONSTRUCTION_TAX_BRACKETS) {
    const span = Math.min(remaining, b.upTo - prev);
    if (span > 0) {
      tax += span * b.rate;
      remaining -= span;
    }
    prev = b.upTo;
    if (remaining <= 0) break;
  }
  return tax;
}

// fixed administrative fees (B/.), from the mupa fee schedule in the research.
export const FIXED_FEES = {
  anteproyectoBase: 50, // base de solicitud del anteproyecto (rla)
  perSheet: 5, // por lámina de plano (rla + rdp)
  minsaReview: 10, // recibo de revisión minsa (rdp)
  mopReview: 10, // recibo de revisión mop (rdp)
};

// above this appraised value, a demolition or construction project must file
// the mitradel worker-safety slip (ley 67 de 2015).
export const MITRADEL_THRESHOLD = 1_000_000;
