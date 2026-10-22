// "Saran nilai inputan" from the Sumatera Utara version of the calculator: which values to enter in FASIH
// so that the NTB ratio falls inside the category range.
import type { Commodity, NtbInput, NtbResult } from '@/types/ntb';
import { periodFactor, rp } from './ntb';

export interface Bounds {
  low: number;
  high: number;
}

export interface Suggestion {
  /** Omzet for a year that keeps the NTB ratio in range, given the production and operating costs entered. */
  revenue: Bounds | null;
  /** Work in progress for category A, as a share of the suggested revenue. */
  wip: (Bounds & { label: string; share: number }) | null;
  /** Revenue plus work in progress: the total to enter in FASIH. */
  fasihTotal: Bounds | null;
  /** Production plus operating cost that keeps the ratio in range, given the revenue entered. */
  costs: Bounds | null;
  recommendation: string | null;
}

/**
 * The ratio is (omzet - 26c - 26b - 26d) / (omzet - 26c), so for a ratio r the omzet is 26c + (26b + 26d) / (1 - r).
 * The Sumatera Utara workbook divides only 26b by (1 - r) and adds 26d afterwards. Both agree when 26d is 0.
 */
export function suggestInputs(input: NtbInput, result: NtbResult, commodities: Commodity[]): Suggestion {
  const range = result.ntbRange;
  const none: Suggestion = { revenue: null, wip: null, fasihTotal: null, costs: null, recommendation: null };
  if (!range) return none;

  const [lowRatio, highRatio] = range;
  const factor = periodFactor(input);
  const production = (input.production ?? 0) * factor;
  const operating = (input.operating ?? 0) * factor;
  const purchases = (input.purchases ?? 0) * factor;
  const inner = production + operating;

  // A ratio of 1 or more cannot be reached by any revenue.
  const revenue: Bounds | null = inner > 0 && highRatio < 1 && lowRatio < 1
    ? { low: purchases + inner / (1 - lowRatio), high: purchases + inner / (1 - highRatio) }
    : null;

  const commodity = input.category === 'A' ? commodities.find((c) => c.id === input.commodity) ?? null : null;
  const wip = revenue && commodity
    ? { low: revenue.low * commodity.wipShare, high: revenue.high * commodity.wipShare, label: commodity.label, share: commodity.wipShare }
    : null;
  const fasihTotal = revenue ? { low: revenue.low + (wip?.low ?? 0), high: revenue.high + (wip?.high ?? 0) } : null;

  // Costs that keep the ratio in range for the output entered: output x (1 - ratio).
  const costs: Bounds | null = result.output > 0 ? { low: result.output * (1 - highRatio), high: result.output * (1 - lowRatio) } : null;

  const recommendation = result.ntbStatus === 'in'
    ? 'Tidak ada, sudah sesuai batas.'
    : result.ntbStatus === 'out'
      ? 'Periksa kembali digitasi nilai pengeluaran dan nilai pendapatan, serta kesesuaiannya dengan data lapangan.'
      : null;

  return { revenue, wip, fasihTotal, costs, recommendation };
}

export interface SuggestionRow {
  label: string;
  bold?: boolean;
  low: number;
  high: number;
  note?: string;
}

/** The rows of the "Saran nilai inputan" table, shared by the page and the copied text. */
export function suggestionRows(s: Suggestion, input: NtbInput): SuggestionRow[] {
  const rows: SuggestionRow[] = [];
  if (s.revenue) {
    rows.push({
      label: input.startedThisYear ? 'Omzet setahun (31a × 12)' : 'Nilai pendapatan barang dan jasa (27a)',
      low: s.revenue.low,
      high: s.revenue.high,
      note: input.startedThisYear ? `31a: ${rp(s.revenue.low / 12)} sampai ${rp(s.revenue.high / 12)} sebulan` : undefined,
    });
  }
  if (s.wip) rows.push({ label: `Work in progress, ${s.wip.label} (${Math.round(s.wip.share * 100)}%)`, low: s.wip.low, high: s.wip.high });
  if (s.fasihTotal) rows.push({ label: 'Total pendapatan (input FASIH)', bold: true, low: s.fasihTotal.low, high: s.fasihTotal.high });
  if (s.costs) rows.push({
    label: input.startedThisYear ? 'Total biaya produksi + biaya operasional setahun (26b + 26d × 12)' : 'Total biaya produksi + biaya operasional (26b + 26d)',
    low: s.costs.low,
    high: s.costs.high,
    note: input.startedThisYear ? `Sebulan: ${rp(s.costs.low / 12)} sampai ${rp(s.costs.high / 12)}` : undefined,
  });
  return rows;
}
