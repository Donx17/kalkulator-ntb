import type { NtbInput, NtbResult } from '@/types/ntb';
import { pct, rp } from './ntb';
import { suggestionRows, type Suggestion } from './suggest';

export interface Issue {
  kind: 'warning' | 'tip' | 'info';
  text: string;
}

/** Everything the member should look at, in the order the workbook shows it. */
export function collectIssues(result: NtbResult, input: NtbInput): Issue[] {
  const issues: Issue[] = [];
  if (!input.category) {
    issues.push({ kind: 'info', text: 'Pilih kategori KBLI agar rasio NTB, saran upah, dan saran biaya bisa dinilai.' });
  } else if (!result.hasThresholds) {
    issues.push({ kind: 'info', text: `Kategori ${input.category} belum punya batas kewajaran di berkas sumber, jadi rasio NTB tidak dapat dinilai.` });
  }
  if (result.warnings.wagePerWorker) issues.push({ kind: 'warning', text: result.warnings.wagePerWorker });
  if (result.warnings.expense) issues.push({ kind: 'warning', text: result.warnings.expense });
  for (const text of Object.values(result.componentWarnings)) issues.push({ kind: 'warning', text });
  if (result.warnings.revenue) issues.push({ kind: 'warning', text: result.warnings.revenue });
  if (result.valueAdded < 0) {
    issues.push({ kind: 'warning', text: 'Nilai tambah negatif: biaya produksi dan operasional lebih besar dari output. Periksa kembali angka biaya dan pendapatan.' });
  }
  for (const text of Object.values(result.suggestions)) issues.push({ kind: 'tip', text });
  return issues;
}

const statusText = (status: 'in' | 'out' | null) => (status === 'in' ? 'dalam rentang' : 'di luar rentang');

/** Plain text for "Salin hasil". */
export function summaryText(result: NtbResult, input: NtbInput, suggestion?: Suggestion): string {
  const range = result.ntbRange ? `${pct(result.ntbRange[0])} sampai ${pct(result.ntbRange[1])}` : input.category ? 'tidak ada batas' : 'kategori belum dipilih';
  const lines = [
    'KALKULATOR NTB',
    `Kategori: ${input.category ? `${input.category}. ${result.categoryTitle ?? ''}` : '-'}`,
    `KBLI: ${result.kbliTitle ? `${input.kbli} ${result.kbliTitle}` : '-'}`,
    `Tenaga kerja: ${input.workers ?? '-'}${result.sizeClass ? ` (${result.sizeClass})` : ''}`,
    `Total pengeluaran: ${rp(result.totalExpense)}`,
    `Total pendapatan: ${rp(result.totalRevenue)}`,
    `Selisih: ${rp(result.profit)}${result.profitLabel ? ` (${result.profitLabel})` : ''}`,
    `Omzet: ${rp(result.turnover)}${input.startedThisYear ? ' (31a x 12)' : ''}`,
    `Output: ${rp(result.output)}`,
    `Nilai tambah: ${rp(result.valueAdded)}`,
    `Rasio NTB: ${result.ntbRatio !== null ? `${pct(result.ntbRatio)} (${statusText(result.ntbStatus)}, rentang ${range})` : '-'}`,
    `Rasio upah: ${result.wageRatio !== null ? `${pct(result.wageRatio)} (${statusText(result.wageStatus)})` : '-'}`,
  ];
  const issues = collectIssues(result, input);
  if (issues.length) lines.push('', 'Perlu diperiksa:', ...issues.map((i) => `- ${i.text}`));
  const rows = suggestion ? suggestionRows(suggestion, input) : [];
  if (rows.length) lines.push('', 'Saran nilai inputan (batas bawah sampai batas atas):', ...rows.map((r) => `- ${r.label}: ${rp(r.low)} sampai ${rp(r.high)}`));
  if (suggestion?.recommendation) lines.push(`Rekomendasi: ${suggestion.recommendation}`);
  return lines.join('\n');
}
