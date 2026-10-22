// The Kalkulator NTB workbook as plain functions. Cell names in comments (C8, D20, ...) are the workbook's.
import type { ExpenseKey, NtbData, NtbInput, NtbResult, Range, RatioStatus, SizeClass } from '@/types/ntb';

/** Share of output above which costs are "too low" (constant in formulas E9 to E12). */
export const HIGH_RATIO = 0.85;

const isNum = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const n = (value: number | null | undefined) => (isNum(value) ? value : 0);

/** A business that started in 2026 reports monthly figures (31a and the 26 lines). The workbook works in years. */
export const periodFactor = (input: Pick<NtbInput, 'startedThisYear'>) => (input.startedThisYear ? 12 : 1);

/** "Rp1.234.567", like TEXT(x, "#.##0") in an Indonesian Excel. */
export function rp(value: number): string {
  return `Rp${Math.round(value).toLocaleString('id-ID')}`;
}

/** Ratio as a percentage with up to two decimals: 0.5123 becomes "51,23%". */
export function pct(ratio: number): string {
  return `${(ratio * 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;
}

export function sizeClass(workers: number | null, classes: SizeClass[]): string | null {
  if (!isNum(workers) || workers < 1) return null;
  return classes.find((c) => workers >= c.min && (c.max === null || workers <= c.max))?.label ?? null;
}

const inRange = (value: number, [min, max]: Range): RatioStatus => (value < min || value > max ? 'out' : 'in');

const EXPENSE_LABELS: Record<ExpenseKey, string> = {
  wages: 'PERIKSA BIAYA UPAH GAJI',
  production: 'PERIKSA BIAYA PRODUKSI',
  purchases: 'PERIKSA BIAYA PEMBELIAN',
  operating: 'PERIKSA BIAYA OPERASIONAL',
  nonOperating: 'PERIKSA BIAYA NON OPERASIONAL',
};

const COST_SUGGESTIONS = [
  ['production', 'Biaya Produksi', 'produksi'],
  ['purchases', 'Biaya Pembelian Barang dan Jasa', 'pembelian'],
  ['operating', 'Biaya Operasional', 'operasional'],
  ['nonOperating', 'Biaya Non Operasional', 'nonOperasional'],
] as const;

export function calculate(input: NtbInput, data: NtbData): NtbResult {
  const { workers, category } = input;
  // Rincian 26 is yearly, or monthly (x 12) for a business that started operating in 2026.
  const factor = periodFactor(input);
  const expenses: Record<ExpenseKey, number> = {
    wages: n(input.wages) * factor, production: n(input.production) * factor, purchases: n(input.purchases) * factor,
    operating: n(input.operating) * factor, nonOperating: n(input.nonOperating) * factor,
  };
  // Omzet (FASIH SE2026): 27a, or 31a x 12 for a business that started operating in 2026.
  const revenue = input.startedThisYear ? n(input.monthlyRevenue) * 12 : n(input.revenue);

  // C6 and D6: wage per worker per year
  const wagePerWorker = isNum(workers) && workers > 0 ? expenses.wages / workers : null;
  const warnings: NtbResult['warnings'] = {};
  if (wagePerWorker) {
    const [low, high] = data.wagePerWorkerYear;
    if (wagePerWorker < low || wagePerWorker > high) {
      warnings.wagePerWorker = `PERIKSA KEMBALI UPAH/GAJI PER ORANG ATAU CEK KEMBALI JUMLAH TENAGA KERJA. APAKAH MUNGKIN DALAM SEBULAN HANYA MENERIMA ${rp(wagePerWorker / 12)} PER BULAN?`;
    }
  }

  // C7, C13, C16, D7, D13, D16
  const totalExpense = Object.values(expenses).reduce((a, b) => a + b, 0);
  const totalRevenue = revenue + n(input.otherRevenue);
  const expenseTooHigh = totalExpense > totalRevenue;
  const profit = totalRevenue - totalExpense;
  if (expenseTooHigh) {
    warnings.expense = 'PERIKSA KEMBALI KOMPONEN PENGELUARAN';
    if (isNum(workers) && workers > 0 && wagePerWorker !== null) {
      warnings.revenue = `APAKAH BENAR DALAM SEBULAN HANYA MENERIMA ${rp(totalRevenue / 12)} PADAHAL MEMBIAYAI ${workers} ORANG DENGAN UPAH ${rp(wagePerWorker / 12)} DALAM SEBULAN?`;
    }
  }

  // D8 to D12: point at the biggest expense when the total is too high
  const componentWarnings: NtbResult['componentWarnings'] = {};
  if (expenseTooHigh) {
    const biggest = Math.max(...Object.values(expenses));
    for (const key of Object.keys(expenses) as ExpenseKey[]) {
      if (expenses[key] > 0 && expenses[key] === biggest) componentWarnings[key] = EXPENSE_LABELS[key];
    }
  }

  // C18 to C21: output, nilai tambah and the two ratios
  const output = revenue - expenses.purchases;
  const valueAdded = output - expenses.production - expenses.operating;
  const ntbRatio = output !== 0 ? valueAdded / output : null;
  const hasCategory = category !== null && category !== '';
  const ntbRange = hasCategory ? data.ntbRange[category] ?? null : null;
  const hasThresholds = hasCategory && category in data.ntbRange;
  // Without a category there is no range to judge against, so the ratio is not judged at all.
  // A category without a range ("-" in the workbook) is always flagged: text is greater than any number in Excel.
  const ntbStatus: RatioStatus = ntbRatio === null || !hasCategory ? null : ntbRange ? inRange(ntbRatio, ntbRange) : 'out';
  const wageRatio = valueAdded !== 0 ? expenses.wages / valueAdded : null;
  const wageStatus: RatioStatus = wageRatio === null ? null : inRange(wageRatio, data.wageToNtb);

  const suggestions: NtbResult['suggestions'] = {};

  // E8: wage suggestion (nilai tambah x percent range of the category)
  const percent = data.wagePercent[category ?? ''];
  if (wageStatus === 'out' && wageRatio !== 0 && valueAdded > 0 && percent) {
    suggestions.wages = `Saran Upah: ${rp((valueAdded / 100) * percent[0])} s.d. ${rp((valueAdded / 100) * percent[2])}`;
  }

  // E9 to E12: cost suggestions when the NTB ratio is out of range
  if (ntbStatus === 'out' && ntbRatio !== null && ntbRatio !== 0) {
    for (const [key, name, share] of COST_SUGGESTIONS) {
      const [low, high] = data.costShare[share];
      suggestions[key] = ntbRatio > HIGH_RATIO ? `Naikkan ${name} (Saran: ${rp(output * low)} s.d. ${rp(output * high)})` : `Turunkan ${name}`;
    }
  }

  return {
    turnover: revenue,
    categoryTitle: data.categories.find((c) => c.code === category)?.title ?? null,
    kbliTitle: data.kbli.find((k) => k.c === input.kbli)?.t ?? null,
    sizeClass: sizeClass(workers, data.sizeClasses),
    wagePerWorker, totalExpense, totalRevenue, expenseTooHigh, profit,
    profitLabel: profit === 0 ? null : profit < 0 ? 'USAHA MENGALAMI RUGI' : 'USAHA MENGALAMI UNTUNG',
    output, valueAdded, ntbRatio, ntbRange, hasThresholds, ntbStatus, wageRatio, wageStatus,
    warnings, componentWarnings, suggestions,
  };
}
