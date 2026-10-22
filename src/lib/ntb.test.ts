import { describe, expect, it } from 'vitest';
import data from '@/data/ntb-data.json';
import type { NtbData, NtbInput } from '@/types/ntb';
import { calculate, pct, rp, sizeClass } from './ntb';

const ntb = data as unknown as NtbData;
const empty: NtbInput = { category: null, kbli: null, workers: null, commodity: null, wages: null, production: null, purchases: null, operating: null, nonOperating: null, revenue: null, startedThisYear: false, monthlyRevenue: null, otherRevenue: null };
// The sample in the workbook: category A, KBLI 01111, 3 workers, 26a 9.000.000, 26b 10.000.000, 26d 500.000, 27a 36.000.000.
const sample: NtbInput = { ...empty, category: 'A', kbli: '01111', workers: 3, wages: 9_000_000, production: 10_000_000, operating: 500_000, revenue: 36_000_000 };

describe('calculate', () => {
  it('finds titles and the size class', () => {
    const r = calculate(sample, ntb);
    expect(r.categoryTitle).toBe('PERTANIAN, KEHUTANAN, DAN PERIKANAN');
    expect(r.kbliTitle).toBe('PERTANIAN JAGUNG');
    expect(r.sizeClass).toBe('Mikro');
  });

  it('classifies by workers, including 20 or more (the workbook shows "Tidak Valid" there)', () => {
    const classes = ntb.sizeClasses;
    expect([1, 4, 5, 19, 20, 500].map((w) => sizeClass(w, classes))).toEqual(['Mikro', 'Mikro', 'Kecil', 'Kecil', 'Menengah/Besar', 'Menengah/Besar']);
    expect(sizeClass(0, classes)).toBeNull();
    expect(sizeClass(null, classes)).toBeNull();
  });

  it('reproduces the workbook sample: totals, output, nilai tambah and ratios', () => {
    const r = calculate(sample, ntb);
    expect(r.wagePerWorker).toBe(3_000_000); // C6
    expect(r.totalExpense).toBe(19_500_000); // C7
    expect(r.totalRevenue).toBe(36_000_000); // C13
    expect(r.profit).toBe(16_500_000); // C16
    expect(r.profitLabel).toBe('USAHA MENGALAMI UNTUNG');
    expect(r.output).toBe(36_000_000); // C18
    expect(r.valueAdded).toBe(25_500_000); // C19
    expect(r.ntbRatio).toBeCloseTo(0.708333, 5); // C20
    expect(r.ntbStatus).toBe('in'); // category A: 0,51 to 0,94
    expect(r.wageRatio).toBeCloseTo(0.352941, 5); // C21
    expect(r.wageStatus).toBe('out'); // below 0,4
    expect(r.expenseTooHigh).toBe(false);
  });

  it('subtracts 26c from nilai tambah through output (27a - 26b - 26c - 26d)', () => {
    const withPurchases = calculate({ ...sample, purchases: 4_000_000 }, ntb);
    expect(withPurchases.output).toBe(32_000_000); // 36.000.000 - 4.000.000
    expect(withPurchases.valueAdded).toBe(21_500_000); // 36.000.000 - 10.000.000 - 4.000.000 - 500.000
    expect(withPurchases.valueAdded).toBe(calculate(sample, ntb).valueAdded - 4_000_000);
  });

  it('flags a wage per worker outside 12 to 144 million a year, with the monthly figure', () => {
    expect(calculate(sample, ntb).warnings.wagePerWorker).toMatch(/Rp250\.000 PER BULAN/);
    expect(calculate({ ...sample, wages: 60_000_000 }, ntb).warnings.wagePerWorker).toBeUndefined();
  });

  it('suggests a wage range from nilai tambah and the category percentages', () => {
    expect(calculate(sample, ntb).suggestions.wages).toBe('Saran Upah: Rp3.422.100 s.d. Rp10.266.300');
  });

  it('points at the biggest expense when expenses exceed revenue', () => {
    const r = calculate({ ...sample, wages: 40_000_000 }, ntb);
    expect(r.expenseTooHigh).toBe(true);
    expect(r.warnings.expense).toBe('PERIKSA KEMBALI KOMPONEN PENGELUARAN');
    expect(r.componentWarnings).toEqual({ wages: 'PERIKSA BIAYA UPAH GAJI' });
    expect(r.warnings.revenue).toMatch(/MEMBIAYAI 3 ORANG/);
    expect(r.profitLabel).toBe('USAHA MENGALAMI RUGI');
  });

  it('suggests raising costs when the ratio is far above range', () => {
    const r = calculate({ ...sample, production: 0, operating: 0 }, ntb);
    expect(r.ntbStatus).toBe('out');
    expect(r.suggestions.production).toBe('Naikkan Biaya Produksi (Saran: Rp5.400.000 s.d. Rp12.600.000)');
    expect(r.suggestions.operating).toBe('Naikkan Biaya Operasional (Saran: Rp1.800.000 s.d. Rp5.400.000)');
    expect(r.suggestions.nonOperating).toBe('Naikkan Biaya Non Operasional (Saran: Rp0 s.d. Rp1.800.000)');
  });

  it('suggests lowering costs when the ratio is out of range but not above 0,85', () => {
    const r = calculate({ ...sample, production: 30_000_000 }, ntb);
    expect(r.ntbStatus).toBe('out');
    expect(r.suggestions.production).toBe('Turunkan Biaya Produksi');
    expect(r.suggestions.purchases).toBe('Turunkan Biaya Pembelian Barang dan Jasa'); // the workbook says "Operasional" here by mistake
  });

  it('always flags a category without a range, and knows when thresholds are missing', () => {
    const p = calculate({ ...sample, category: 'P' }, ntb);
    expect(p.ntbRange).toBeNull();
    expect(p.ntbStatus).toBe('out');
    expect(calculate({ ...sample, category: 'V' }, ntb).hasThresholds).toBe(false);
  });

  it('does not judge the NTB ratio or suggest costs before a category is chosen', () => {
    const r = calculate({ ...sample, category: null, kbli: null }, ntb);
    expect(r.ntbRatio).toBeCloseTo(0.708333, 5);
    expect(r.ntbStatus).toBeNull();
    expect(r.ntbRange).toBeNull();
    expect(r.hasThresholds).toBe(false);
    expect(r.suggestions).toEqual({});
  });

  it('accepts a ratio at the edge of the range (reported case: 51,6% in category A, 51% to 94%)', () => {
    const reported: NtbInput = { ...empty, category: 'A', workers: 10, wages: 61_380_000, production: 15_506_000, operating: 50_514_000, revenue: 136_400_000 };
    const r = calculate(reported, ntb);
    expect(r.ntbRatio).toBeCloseTo(0.51598, 5);
    expect(r.ntbStatus).toBe('in');
    expect(r.wageStatus).toBe('out'); // 87,21%, above 60%
    expect(r.sizeClass).toBe('Kecil');
    expect(calculate({ ...reported, category: 'Q' }, ntb).ntbRange).toEqual(ntb.ntbRange.Q);
    expect(ntb.ntbRange.Q![0]).toBeCloseTo(0.27, 2);
    expect(ntb.ntbRange.Q![1]).toBeCloseTo(0.82, 2);
  });

  it('uses 31a x 12 as omzet for a business that started in 2026', () => {
    // Monthly figures: 26a 750.000, 26b 1.000.000, 26d 50.000 and 31a 3.000.000. 27a is ignored.
    const started = { ...sample, startedThisYear: true, wages: 750_000, production: 1_000_000, operating: 50_000, monthlyRevenue: 3_000_000, revenue: 99_000_000 };
    const r = calculate(started, ntb);
    expect(r.turnover).toBe(36_000_000);
    expect(r.output).toBe(36_000_000);
    expect(r.valueAdded).toBe(23_400_000); // 36.000.000 - 12.000.000 - 600.000
    expect(r.totalExpense).toBe(21_600_000); // (750.000 + 1.000.000 + 50.000) x 12
    expect(r.wagePerWorker).toBe(3_000_000); // 9.000.000 a year over 3 workers
    expect(r.totalRevenue).toBe(36_000_000);
    expect(calculate({ ...started, otherRevenue: 1_000_000 }, ntb).totalRevenue).toBe(37_000_000);
    expect(calculate({ ...sample, startedThisYear: false, monthlyRevenue: 5 }, ntb).turnover).toBe(36_000_000); // 31a is ignored
  });

  it('does not crash on empty input', () => {
    const r = calculate({ ...empty, category: 'A' }, ntb);
    expect([r.ntbRatio, r.wageRatio, r.wagePerWorker, r.profitLabel]).toEqual([null, null, null, null]);
    expect(r.totalExpense).toBe(0);
  });
});

describe('formats', () => {
  it('uses Indonesian separators', () => {
    expect(rp(1_234_567)).toBe('Rp1.234.567');
    expect(pct(0.5123)).toBe('51,23%');
  });
});
