import { describe, expect, it } from 'vitest';
import data from '@/data/ntb-data.json';
import { adjustToRange, inRange, MIN_RUPIAH, ntbRatioOf, roundRupiah, wageRatioOf } from './adjust';
import { adjustAllItems, evaluate, inputToRow, newItem, processRows, rowToInput, summarize, type BatchRow } from './batch';
import { calculate } from './ntb';
import { CATEGORY_RANGES, effectiveData, parseCategory, subCategoryOf } from './subcategory';
import type { NtbData, NtbInput } from '@/types/ntb';

const d = data as unknown as NtbData;
const E: NtbInput = { category: 'A', kbli: '01111', workers: 3, commodity: null, wages: 9e6, production: 10e6, purchases: null, operating: 5e5, nonOperating: null, revenue: 36e6, startedThisYear: false, monthlyRevenue: null, otherRevenue: null };
const R: [number, number] = [0.61, 0.91];
const row = (p: Partial<BatchRow>): BatchRow => ({ id: '1', category: '', name: 'x', kbli: '01111', wages: 9e6, production: 10e6, purchases: null, operating: 5e5, nonOperating: 2e5, revenue: 36e6, otherRevenue: null, ...p });
const G = '47111';
const money = ['wages', 'production', 'purchases', 'operating', 'nonOperating', 'revenue', 'otherRevenue'] as const;

describe('rounding and minimum', () => {
  it('rounds to Rp1.000, halves up, so the last three digits are 000', () => {
    expect(roundRupiah(200_500)).toBe(201_000);
    expect(roundRupiah(200_499)).toBe(200_000);
    expect(roundRupiah(1_300_512)).toBe(1_301_000);
  });
  it('manual save rounds every amount to Rp1.000', () => {
    const r = inputToRow({ ...E, category: 'A', kbli: '01111', wages: 1_300_512, production: 12_345_678, revenue: 36_000_049 }, row({}));
    expect(r.wages).toBe(1_301_000);
    expect(r.production).toBe(12_346_000);
    expect(r.revenue).toBe(36_000_000);
  });
});

describe('ratios', () => {
  it('match calculate()', () => {
    expect(ntbRatioOf(E)).toBeCloseTo(calculate(E, d).ntbRatio!, 10);
    expect(wageRatioOf(E)).toBeCloseTo(calculate(E, d).wageRatio!, 10);
  });
  it('the calculator uses the picture ranges, and sub-category ranges for category A', () => {
    expect(effectiveData(d, null).ntbRange.G).toEqual([0.64, 0.78]);
    expect(effectiveData(d, '01411').ntbRange.A).toEqual([0.42, 0.78]);
    expect(effectiveData(d, '01111').ntbRange.A).toEqual([0.61, 0.91]);
  });
});

describe('adjustToRange', () => {
  it('leaves an in-range business alone', () => {
    const a = adjustToRange(E, R, 'auto');
    expect(a.changed).toEqual([]);
    expect(a.input).toBe(E);
  });
  it('outside category G only 26b and 26d move, never 26c', () => {
    const e = { ...E, wages: 0, production: 4e6, operating: 0, purchases: 10e6, revenue: 20e6 };
    for (const mode of ['auto', 'cost', 'purchases', 'scale'] as const) {
      const a = adjustToRange(e, [0.3, 0.4], mode, { allowPurchases: false });
      expect(a.input.purchases).toBe(10e6);
      expect(a.changed).not.toContain('purchases');
      if (a.ok) expect(inRange(ntbRatioOf(a.input), [0.3, 0.4])).toBe(true);
    }
  });
  it('in category G, 26c can move', () => {
    const e = { ...E, wages: 0, production: 4e6, operating: 0, purchases: 10e6, revenue: 20e6 };
    const a = adjustToRange(e, [0.3, 0.4], 'purchases', { allowPurchases: true });
    expect(a.changed).toEqual(['purchases']);
    expect(inRange(ntbRatioOf(a.input), [0.3, 0.4])).toBe(true);
  });
  it('G: scale moves 26b, 26c, 26d together when one line is not enough', () => {
    const e = { ...E, wages: 3e6, production: 3e6, purchases: 3e6, operating: 3e6, revenue: 3e6, otherRevenue: 3e6 };
    const a = adjustToRange(e, [0.64, 0.78], 'auto', { allowPurchases: true });
    expect(a.ok).toBe(true);
    expect(a.input.revenue).toBe(3e6);
    expect(a.changed.length).toBeGreaterThan(1);
  });
  it('non-G with 26c as large as 27a asks for manual review', () => {
    const a = adjustToRange({ ...E, wages: 3e6, production: 3e6, purchases: 3e6, operating: 3e6, revenue: 3e6 }, R, 'auto', { allowPurchases: false });
    expect(a.ok).toBe(false);
  });
});

describe('workflow: upload, then change', () => {
  it('after upload nothing is changed; rows are only classified', () => {
    const items = [row({}), row({ production: 30e6 }), row({ kbli: '99999' })].map(newItem);
    const r = items.map((i) => evaluate(i, d));
    expect(r.map((x) => x.state)).toEqual(['in', 'out', 'skipped']);
    expect(r[1].adjusted).toEqual(r[1].original);
  });
  it('"Ubah semua data" leaves in-range rows and manually edited rows alone', () => {
    const items = [newItem(row({}), 0), newItem(row({ production: 30e6 }), 1), newItem(row({ production: 31e6 }), 2)];
    items[2] = { ...items[2], current: row({ production: 12e6 }), source: 'manual' };
    const after = adjustAllItems(items, d, 'auto');
    expect(after[0].current).toEqual(items[0].original);
    expect(after[0].source).toBe('upload');
    expect(after[2].current.production).toBe(12e6);
    expect(after[2].source).toBe('manual');
    expect(after[1].source).toBe('auto');
    expect(after[1].current.production).not.toBe(30e6);
    const res = after.map((i) => evaluate(i, d));
    expect(res.map((x) => x.state)).toEqual(['in', 'adjusted', 'edited']);
    expect(summarize(res)).toMatchObject({ total: 3, in: 1, adjusted: 1, edited: 1 });
  });
  it('a manual save shows up in the evaluated table', () => {
    const it0 = newItem(row({ production: 30e6 }), 0);
    const saved = { ...it0, current: inputToRow({ ...rowToInput(it0.current, 'A'), production: 12_345_678 }, it0.current), source: 'manual' as const };
    const r = evaluate(saved, d);
    expect(r.state).toBe('edited');
    expect(r.adjusted.production).toBe(12_346_000);
    expect(r.inRangeNow).toBe(true);
  });
  it('maps KBLI to sub-categories and reads category cells', () => {
    expect(subCategoryOf('01111')).toBe('Tanaman Pangan');
    expect(subCategoryOf('01411')).toBe('Peternakan');
    expect(subCategoryOf('47111')).toBeNull();
    expect(parseCategory('Kategori c')).toEqual({ cat: 'C', group: null });
    expect(parseCategory('tanaman pangan')).toEqual({ cat: 'A', group: 'Tanaman Pangan' });
  });
  it('uses the Kategori column when KBLI is unknown, and KBLI when they disagree', () => {
    const a = processRows([row({ kbli: '', category: 'G', revenue: 10e6, production: 0, operating: 5e6 })], d, { mode: 'auto' })[0];
    expect(a.category).toBe('G');
    expect(a.note).toMatch(/memakai kategori G/);
    expect(processRows([row({ category: 'G' })], d, { mode: 'auto' })[0].note).toMatch(/berbeda dengan KBLI/);
  });
});

describe('guarantees for every category and mode', () => {
  const seeds = (k: string): BatchRow[] => [row({ kbli: k }), row({ kbli: k, production: 0, operating: 0, wages: 0 }), row({ kbli: k, wages: 50e6, production: 20e6, revenue: 60e6 }), row({ kbli: k, production: 2e6, operating: 0, purchases: 40e6, revenue: 60e6 })];
  it('ratio inside the picture range; 26a, 26e, 27a, 27b unchanged; amounts are end in 000 and are at least Rp10.000; 26c only changes in G', () => {
    for (const [cat, range] of Object.entries(CATEGORY_RANGES)) {
      if (!range) continue;
      const k = cat === 'G' ? G : d.kbli.find((x) => x.k === cat)!.c;
      for (const mode of ['auto', 'cost', 'purchases', 'scale'] as const) {
        for (const base of seeds(k)) {
          const r = processRows([base], d, { mode })[0];
          if (r.state === 'check') continue; // allowed to give up, but see below
          expect(['in', 'adjusted']).toContain(r.state);
          expect(r.ratioAfter!).toBeGreaterThanOrEqual(r.range![0]);
          expect(r.ratioAfter!).toBeLessThanOrEqual(r.range![1]);
          for (const f of ['wages', 'nonOperating', 'revenue', 'otherRevenue'] as const) expect(r.adjusted[f]).toBe(base[f]);
          if (cat !== 'G') expect(r.adjusted.purchases).toBe(base.purchases);
          const a = r.adjusted;
          expect((a.revenue ?? 0) + (a.otherRevenue ?? 0) - ((a.wages ?? 0) + (a.production ?? 0) + (a.purchases ?? 0) + (a.operating ?? 0) + (a.nonOperating ?? 0))).toBeGreaterThanOrEqual(0);
          expect(r.profit!).toBeGreaterThanOrEqual(0);
          for (const f of money) if (r.adjusted[f] !== base[f]) {
            expect(r.adjusted[f]! % 1000).toBe(0);
            expect(r.adjusted[f]!).toBeGreaterThanOrEqual(MIN_RUPIAH);
          }
        }
      }
    }
  });
  it('the common seeds are always solvable (nothing is silently left out of range)', () => {
    for (const [cat, range] of Object.entries(CATEGORY_RANGES)) {
      if (!range) continue;
      const k = cat === 'G' ? G : d.kbli.find((x) => x.k === cat)!.c;
      for (const base of seeds(k).slice(0, 2)) expect(['in', 'adjusted']).toContain(processRows([base], d, { mode: 'auto' })[0].state);
    }
  });
  it('rows that cannot be solved are left untouched and marked for manual check, never made negative', () => {
    for (const [cat, range] of Object.entries(CATEGORY_RANGES)) {
      if (!range) continue;
      const k = cat === 'G' ? G : d.kbli.find((x) => x.k === cat)!.c;
      for (const mode of ['auto', 'cost', 'purchases', 'scale'] as const) {
        for (const base of [row({ kbli: k, wages: 50e6, production: 20e6, revenue: 60e6 }), row({ kbli: k, wages: 80e6, nonOperating: 20e6, revenue: 36e6 })]) {
          const r = processRows([base], d, { mode })[0];
          if (r.state === 'check') {
            expect(r.adjusted).toEqual(base);
            expect(r.note).toMatch(/cek manual|melebihi/);
          } else {
            expect(['in', 'adjusted']).toContain(r.state);
            expect(r.profit!).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });
});

describe('selisih (pendapatan - pengeluaran) never goes negative', () => {
  const income = (r: BatchRow) => (r.revenue ?? 0) + (r.otherRevenue ?? 0);
  const spend = (r: BatchRow) => (r.wages ?? 0) + (r.production ?? 0) + (r.purchases ?? 0) + (r.operating ?? 0) + (r.nonOperating ?? 0);

  it('a row whose NTB ratio is fine but whose selisih is negative is not "in range" and gets fixed', () => {
    const bad = row({ wages: 30e6, production: 10e6, operating: 5e5, nonOperating: 2e5, revenue: 36e6 }); // ratio 70.8% fits, but 40.7M > 36M
    const item = newItem(bad, 0);
    const before = evaluate(item, d);
    expect(before.state).toBe('out');
    expect(before.profit!).toBeLessThan(0);
    const after = evaluate(adjustAllItems([item], d, 'auto')[0], d);
    expect(after.state).toBe('adjusted');
    expect(after.profit!).toBeGreaterThanOrEqual(0);
    expect(inRange(after.ratioAfter, after.range!)).toBe(true);
    expect(after.adjusted.wages).toBe(30e6);
    expect(after.adjusted.revenue).toBe(36e6);
  });

  it('the Rp3.000.000 example ends with income at least equal to spending', () => {
    for (const kbli of [G, '01111']) {
      const r = processRows([row({ kbli, wages: 3e6, production: 3e6, purchases: 3e6, operating: 3e6, nonOperating: 3e6, revenue: 3e6, otherRevenue: 3e6 })], d, { mode: 'auto' })[0];
      if (r.state !== 'check') expect(income(r.adjusted) - spend(r.adjusted)).toBeGreaterThanOrEqual(0);
    }
  });

  it('in-range rows with non-negative selisih are still left alone', () => {
    const items = [newItem(row({}), 0)];
    expect(adjustAllItems(items, d, 'auto')[0].current).toEqual(items[0].original);
  });
});
