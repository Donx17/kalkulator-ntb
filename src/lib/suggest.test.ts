import { describe, expect, it } from 'vitest';
import data from '@/data/ntb-data.json';
import extra from '@/data/sumut-extra.json';
import type { Commodity, NtbData, NtbInput } from '@/types/ntb';
import { calculate } from './ntb';
import { suggestInputs } from './suggest';

const ntb = data as unknown as NtbData;
const commodities = extra.commodities as Commodity[];
const empty: NtbInput = { category: null, kbli: null, workers: null, commodity: null, wages: null, production: null, purchases: null, operating: null, nonOperating: null, revenue: null, startedThisYear: false, monthlyRevenue: null, otherRevenue: null };
const suggest = (input: NtbInput) => suggestInputs(input, calculate(input, ntb), commodities);

// The Sumatera Utara workbook example: category A, Tanaman Semusim, production cost Rp1.000.000 and nothing else.
const example: NtbInput = { ...empty, category: 'A', commodity: 'semusim', production: 1_000_000 };

describe('suggestInputs', () => {
  it('reproduces the workbook example for revenue, work in progress and the FASIH total', () => {
    const s = suggest(example);
    // The three figures in the Sumatera Utara screenshot, rounded to whole rupiah.
    expect(Math.round(s.revenue!.low)).toBe(2_055_242);
    expect(Math.round(s.revenue!.high)).toBe(16_460_126);
    expect(s.wip).toMatchObject({ label: 'Tanaman Semusim', share: 0.05 });
    expect([Math.round(s.wip!.low), Math.round(s.wip!.high)]).toEqual([102_762, 823_006]);
    expect([Math.round(s.fasihTotal!.low), Math.round(s.fasihTotal!.high)]).toEqual([2_158_004, 17_283_132]);
  });

  it('gives a revenue that puts the ratio on the range edge, also when operating cost is above 0', () => {
    const input: NtbInput = { ...example, operating: 1_000_000 };
    const s = suggest(input);
    for (const [revenue, edge] of [[s.revenue!.low, ntb.ntbRange.A![0]], [s.revenue!.high, ntb.ntbRange.A![1]]] as const) {
      expect(calculate({ ...input, revenue }, ntb).ntbRatio).toBeCloseTo(edge, 8);
    }
  });

  it('adds purchases for a trade business, so the ratio still lands on the edge', () => {
    const input: NtbInput = { ...empty, category: 'G', production: 500_000, operating: 500_000, purchases: 8_000_000 };
    const s = suggest(input);
    expect(calculate({ ...input, revenue: s.revenue!.low }, ntb).ntbRatio).toBeCloseTo(ntb.ntbRange.G![0], 8);
  });

  it('suggests production plus operating costs for the revenue entered', () => {
    const s = suggest({ ...empty, category: 'A', revenue: 10_000_000 });
    const [low, high] = ntb.ntbRange.A!;
    expect(s.costs!.low).toBeCloseTo(10_000_000 * (1 - high), 2);
    expect(s.costs!.high).toBeCloseTo(10_000_000 * (1 - low), 2);
  });

  it('only adds work in progress for category A with a commodity', () => {
    expect(suggest({ ...example, category: 'C', commodity: null }).wip).toBeNull();
    expect(suggest({ ...example, commodity: null }).wip).toBeNull();
    const ternak = suggest({ ...example, commodity: 'ternak' });
    expect(ternak.wip!.share).toBe(0.25);
  });

  it('says nothing without a category range or without costs', () => {
    expect(suggest({ ...empty, production: 1_000_000 })).toEqual({ revenue: null, wip: null, fasihTotal: null, costs: null, recommendation: null });
    expect(suggest({ ...empty, category: 'A' }).revenue).toBeNull();
    expect(suggest({ ...empty, category: 'P', production: 1_000_000 }).revenue).toBeNull(); // category P has no range
  });

  it('recommends by the NTB status', () => {
    expect(suggest({ ...empty, category: 'A', production: 1_000_000, revenue: 3_000_000 }).recommendation).toBe('Tidak ada, sudah sesuai batas.');
    expect(suggest({ ...empty, category: 'A', production: 1_000_000, revenue: 1_100_000 }).recommendation).toMatch(/^Periksa kembali digitasi/);
  });

  it('annualizes the monthly costs of a business that started in 2026', () => {
    const base = { ...empty, category: 'A', commodity: 'semusim', production: 1_000_000 } as NtbInput;
    const yearly = suggestInputs(base, calculate(base, ntb), commodities);
    const monthly = { ...base, startedThisYear: true } as NtbInput;
    const s = suggestInputs(monthly, calculate(monthly, ntb), commodities);
    expect(Math.round(s.revenue!.low)).toBe(Math.round(yearly.revenue!.low * 12));
    expect(Math.round(s.revenue!.high)).toBe(Math.round(yearly.revenue!.high * 12));
  });
});
