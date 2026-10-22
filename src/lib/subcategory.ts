import type { NtbData, Range } from '@/types/ntb';

/** NTB ratio range per category, exactly as in the table "Range Rasio NTB Standar Menurut KBLI". P and U have none. */
export const CATEGORY_RANGES: Record<string, Range | null> = {
  A: [0.51, 0.94], B: [0.28, 0.81], C: [0.15, 0.61], D: [0.13, 0.68], E: [0.29, 0.47], F: [0.34, 0.44], G: [0.64, 0.78],
  H: [0.29, 0.64], I: [0.36, 0.69], J: [0.36, 0.73], K: [0.50, 0.72], L: [0.46, 0.86], M: [0.50, 0.99], N: [0.44, 0.57],
  O: [0.54, 0.66], P: null, Q: [0.27, 0.82], R: [0.20, 0.60], S: [0.21, 0.57], T: [0.30, 0.69], U: null,
};

/** NTB ratio ranges of category A per sub-category ("Range Rasio NTB Standar Menurut KBLI"). */
export const SUB_RANGES: Record<string, Range> = {
  'Tanaman Pangan': [0.61, 0.91],
  'Hortikultura': [0.62, 0.92],
  'Perkebunan': [0.70, 0.98],
  'Peternakan': [0.42, 0.78],
  'Budidaya Kehutanan': [0.77, 0.98],
  'Penangkaran Tanaman & Satwa Liar': [0.46, 0.86],
  'Pemungutan Hasil Hutan & Penangkapan Satwa Liar': [0.62, 0.99],
  'Budidaya Perikanan': [0.40, 0.75],
  'Penangkapan Ikan': [0.21, 0.39],
  'Pembibitan Tanaman': [0.50, 0.93],
  'Jasa Pertanian': [0.52, 0.97],
};

const IN = (...codes: string[]) => (c: string) => codes.includes(c);
const RE = (re: RegExp) => (c: string) => re.test(c);
const ANY = (...fs: ((c: string) => boolean)[]) => (c: string) => fs.some((f) => f(c));

/**
 * Which KBLI codes belong to which sub-category. The source table names the groups but not their codes,
 * so this mapping is an interpretation: edit it here if BPS assigns a code differently.
 * Codes that match no rule fall back to the range of the whole category A.
 */
const RULES: [string, (c: string) => boolean][] = [
  ['Tanaman Pangan', ANY(RE(/^01(11|12)/), IN('01135', '01139'))],
  ['Hortikultura', ANY(RE(/^0113[1-4]$/), IN('01136', '01138', '01193', '01301', '01285', '01286'), RE(/^012[1-5]/))],
  ['Perkebunan', ANY(IN('01137', '01140', '01150', '01160', '01281', '01282', '01283', '01284', '01289', '01291', '01299'), RE(/^012[67]/))],
  ['Pembibitan Tanaman', IN('01192', '01194', '01309')],
  ['Penangkaran Tanaman & Satwa Liar', IN('01302')],
  ['Peternakan', RE(/^014/)],
  ['Jasa Pertanian', RE(/^016/)],
  ['Pemungutan Hasil Hutan & Penangkapan Satwa Liar', RE(/^(017|023)/)],
  ['Budidaya Kehutanan', RE(/^021/)],
  ['Penangkapan Ikan', RE(/^031/)],
  ['Budidaya Perikanan', RE(/^032/)],
];

export function subCategoryOf(kbli: string): string | null {
  return RULES.find(([, test]) => test(kbli))?.[0] ?? null;
}

/** Reads the Kategori cell: "A", "Kategori A", or the name of a category A sub-category. */
export function parseCategory(text: string): { cat: string; group: string | null } | null {
  const t = text.trim();
  if (!t) return null;
  const group = Object.keys(SUB_RANGES).find((g) => g.toLowerCase() === t.toLowerCase());
  if (group) return { cat: 'A', group };
  const m = /^(?:kategori\s*)?([A-Za-z])(?:\s|$|[.:\-–])/i.exec(t);
  return m && m[1].toUpperCase() in CATEGORY_RANGES ? { cat: m[1].toUpperCase(), group: null } : null;
}

/** The calculator's data with the ranges of the picture: per category, and per sub-category when the KBLI of category A is known. */
export function effectiveData(data: NtbData, kbli: string | null): NtbData {
  const ntbRange = { ...data.ntbRange } as NtbData['ntbRange'];
  for (const [c, r] of Object.entries(CATEGORY_RANGES)) if (r) ntbRange[c] = r;
  const group = kbli ? subCategoryOf(kbli) : null;
  if (group) ntbRange.A = SUB_RANGES[group];
  return { ...data, ntbRange };
}
