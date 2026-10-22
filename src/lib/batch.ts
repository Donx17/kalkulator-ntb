import { adjustToRange, inRange, ntbRatioOf, roundRupiah, selisihOf, type AdjustMode } from '@/lib/adjust';
import { calculate, periodFactor, rp } from '@/lib/ntb';
import { CATEGORY_RANGES, parseCategory, subCategoryOf, SUB_RANGES } from '@/lib/subcategory';
import type { NtbData, NtbInput, Range } from '@/types/ntb';

/** One line of the Excel template (a business). All amounts are for one year. */
export interface BatchRow {
  id: string; category: string; kbli: string; name: string;
  wages: number | null; production: number | null; purchases: number | null; operating: number | null; nonOperating: number | null;
  revenue: number | null; otherRevenue: number | null;
}

/** upload: as in the file. auto: changed by "Ubah semua data". manual: saved by hand from the Data usaha form. */
export type Source = 'upload' | 'auto' | 'manual';
export interface BatchItem { index: number; original: BatchRow; current: BatchRow; source: Source; changed: (keyof BatchRow)[]; note: string }

/** in/out: as uploaded, inside/outside the range. adjusted/check: after auto (inside / still outside). edited: saved by hand. */
export type RowState = 'in' | 'out' | 'adjusted' | 'edited' | 'check' | 'skipped';

export interface RowResult {
  index: number;
  original: BatchRow;
  /** The current values (what the table shows and the Excel result contains). */
  adjusted: BatchRow;
  state: RowState;
  source: Source;
  category: string | null;
  group: string | null;
  range: Range | null;
  ratioBefore: number | null;
  ratioAfter: number | null;
  inRangeNow: boolean | null;
  /** Total pendapatan minus total pengeluaran of the current values. */
  profit: number | null;
  wageBefore: number | null;
  wageRatio: number | null;
  changed: (keyof BatchRow)[];
  /** Keterangan: what was found and what was done, in words. */
  note: string;
  otherWarnings: string;
}

export const newItem = (row: BatchRow, index: number): BatchItem => ({ index, original: row, current: { ...row }, source: 'upload', changed: [], note: '' });

export function rowToInput(r: BatchRow, category: string | null): NtbInput {
  return {
    category, kbli: r.kbli || null, workers: null, commodity: null,
    wages: r.wages, production: r.production, purchases: r.purchases, operating: r.operating, nonOperating: r.nonOperating,
    revenue: r.revenue, startedThisYear: false, monthlyRevenue: null, otherRevenue: r.otherRevenue,
  };
}

/** Back from the Data usaha form to a table row. Amounts become yearly and are rounded to Rp1.000 (three last digits 000). */
export function inputToRow(i: NtbInput, base: BatchRow): BatchRow {
  const f = periodFactor(i);
  const r = (v: number | null) => (v === null ? null : roundRupiah(v * f));
  return {
    ...base, category: i.category ?? '', kbli: i.kbli ?? '',
    wages: r(i.wages), production: r(i.production), purchases: r(i.purchases), operating: r(i.operating), nonOperating: r(i.nonOperating),
    revenue: i.startedThisYear ? (i.monthlyRevenue === null ? null : roundRupiah(i.monthlyRevenue * 12)) : r(i.revenue),
    otherRevenue: i.otherRevenue === null ? null : roundRupiah(i.otherRevenue * f),
  };
}

const pc = (v: number | null) => (v === null ? '-' : `${(v * 100).toFixed(2).replace('.', ',')}%`);
const span = (r: Range) => `${pc(r[0])} sampai ${pc(r[1])}`;

/** Category, sub-category and range of a row: from KBLI when valid, else from the Kategori column. */
export function resolve(row: BatchRow, data: NtbData) {
  const item = data.kbli.find((k) => k.c === row.kbli);
  const given = parseCategory(row.category);
  const cat = item?.k ?? given?.cat ?? null;
  let prefix = '';
  if (item && given && given.cat !== item.k) prefix = `Kategori di berkas (${given.cat}) berbeda dengan KBLI (${item.k}); memakai ${item.k}. `;
  else if (cat && !item) prefix = `${row.kbli ? `KBLI ${row.kbli} tidak dikenal` : 'KBLI kosong'}; memakai kategori ${cat}. `;
  const group = cat === 'A' ? (item ? subCategoryOf(row.kbli) : given?.group ?? null) : null;
  const raw = cat ? (group ? SUB_RANGES[group] : CATEGORY_RANGES[cat]) : null;
  return { cat, group, range: raw ?? null, prefix };
}

/** Changes one row automatically (never a manual one, never one already inside its range). */
export function autoAdjust(item: BatchItem, data: NtbData, mode: AdjustMode): BatchItem {
  if (item.source === 'manual') return item;
  const rs = resolve(item.original, data);
  const untouched: BatchItem = { ...item, current: { ...item.original }, source: 'upload', changed: [], note: '' };
  if (!rs.cat || !rs.range) return untouched;
  const input = rowToInput(item.original, rs.cat);
  if (inRange(ntbRatioOf(input), rs.range) && selisihOf(input) >= 0) return untouched;
  const adj = adjustToRange(input, rs.range, mode, { allowPurchases: rs.cat === 'G' });
  if (!adj.ok) return { ...untouched, source: 'auto', note: adj.note };
  const current: BatchRow = { ...item.original, production: adj.input.production, purchases: adj.input.purchases, operating: adj.input.operating };
  return { ...item, current, source: 'auto', changed: adj.changed as (keyof BatchRow)[], note: adj.note };
}

export const adjustAllItems = (items: BatchItem[], data: NtbData, mode: AdjustMode) => items.map((it) => autoAdjust(it, data, mode));

export function evaluate(item: BatchItem, data: NtbData): RowResult {
  const row = item.current;
  const rs = resolve(row, data);
  const base = { index: item.index, original: item.original, adjusted: row, source: item.source, category: rs.cat, group: rs.group, range: rs.range, ratioBefore: null, ratioAfter: null, inRangeNow: null, profit: null, wageBefore: null, wageRatio: null, changed: item.changed, otherWarnings: '' } satisfies Omit<RowResult, 'state' | 'note'>;
  if (!rs.cat) return { ...base, state: 'skipped', note: row.kbli ? `KBLI ${row.kbli} tidak ada di daftar dan kolom Kategori kosong atau tidak dikenali.` : 'Kode KBLI dan Kategori kosong.' };
  const now = rowToInput(row, rs.cat);
  const was = rowToInput(item.original, rs.cat);
  const ratioBefore = ntbRatioOf(was);
  const ratioAfter = ntbRatioOf(now);
  const calc = calculate(now, data);
  const head = { ...base, ratioBefore, ratioAfter, profit: calc.profit, wageBefore: calculate(was, data).wageRatio, wageRatio: calc.wageRatio, otherWarnings: calc.warnings.expense ?? '' };
  if (!rs.range) return { ...head, state: 'skipped', note: `${rs.prefix}Kategori ${rs.cat} tidak punya rentang rasio NTB.` };

  const ok = inRange(ratioAfter, rs.range);
  const negative = calc.profit < 0;
  const where = `Rentang ${rs.group ?? `kategori ${rs.cat}`}: ${span(rs.range)}.`;
  const minus = ` Total pengeluaran melebihi total pendapatan (selisih ${rp(calc.profit)}); 26a, 26e, dan kode 27 tidak diubah oleh sistem, cek ke responden.`;
  const h = { ...head, inRangeNow: ok && !negative };
  if (item.source === 'manual') return { ...h, state: 'edited', note: `${rs.prefix}Diubah manual; rasio NTB ${pc(ratioAfter)} ${ok ? 'dalam' : 'DI LUAR'} rentang.${negative ? minus : ''} ${where}` };
  if (item.source === 'auto') return { ...h, state: ok && !negative ? 'adjusted' : 'check', note: `${rs.prefix}${item.note} ${where}${negative ? minus : ''}` };
  if (ok && !negative) return { ...h, state: 'in', note: `${rs.prefix}Rasio NTB ${pc(ratioAfter)} sudah dalam rentang. Tidak ada perubahan. ${where}` };
  return { ...h, state: 'out', note: `${rs.prefix}${ok ? `Rasio NTB ${pc(ratioAfter)} dalam rentang, tetapi selisih pendapatan dikurangi pengeluaran negatif (${rp(calc.profit)}).` : `Rasio NTB ${pc(ratioAfter)} di luar rentang.`} Belum diubah. ${where}` };
}

/** Upload, then change everything that is outside its range (convenience for tests and scripts). */
export const processRows = (rows: BatchRow[], data: NtbData, opts: { mode: AdjustMode }): RowResult[] =>
  adjustAllItems(rows.map(newItem), data, opts.mode).map((it) => evaluate(it, data));

export function summarize(results: RowResult[]) {
  const c = { total: results.length, in: 0, out: 0, adjusted: 0, edited: 0, check: 0, skipped: 0 };
  for (const r of results) c[r.state]++;
  return c;
}
