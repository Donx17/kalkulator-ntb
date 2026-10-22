import { periodFactor } from '@/lib/ntb';
import type { NtbInput, Range } from '@/types/ntb';

/**
 * Only 26b, 26c and 26d can be changed, and 26c only when the caller allows it (category G).
 * 26a, 26e and the income lines (27a, 27b, 31a) are never touched.
 * cost: 26b and 26d together. purchases: 26c. scale: 26b, 26c, 26d together, in proportion.
 * auto: whichever candidate changes the fewest rupiah.
 * A result is only accepted when the NTB ratio is inside the range, nilai tambah is positive and
 * total pendapatan is not smaller than total pengeluaran (selisih >= 0).
 */
export type AdjustMode = 'auto' | 'cost' | 'purchases' | 'scale';
type Single = Exclude<AdjustMode, 'auto'>;
export type AdjustedField = 'production' | 'operating' | 'purchases';

/** Every value the system writes ends in 000 (nearest Rp1.000, halves go up: 200.500 becomes 201.000) and is at least Rp10.000, or stays 0 when it was 0. */
export const STEP = 1000;
export const MIN_RUPIAH = 10_000;
export const roundRupiah = (v: number) => Math.round(v / STEP) * STEP;

const n = (v: number | null) => v ?? 0;
const okVal = (v: number, orig: number | null) => (v >= MIN_RUPIAH && v % STEP === 0) || (v === 0 && n(orig) === 0);
const omzet = (i: NtbInput) => (i.startedThisYear ? n(i.monthlyRevenue) * 12 : n(i.revenue));
const outputOf = (i: NtbInput) => omzet(i) - n(i.purchases) * periodFactor(i);
export const valueAddedOf = (i: NtbInput) => outputOf(i) - (n(i.production) + n(i.operating)) * periodFactor(i);

/** NTB ratio = nilai tambah / output, output = omzet - 26c, nilai tambah = output - 26b - 26d. Same as calculate(). */
export function ntbRatioOf(i: NtbInput): number | null {
  const out = outputOf(i);
  return out === 0 ? null : valueAddedOf(i) / out;
}
/** Wage ratio = 26a / nilai tambah. Informational only: 26a is never changed. */
export function wageRatioOf(i: NtbInput): number | null {
  const va = valueAddedOf(i);
  return va <= 0 ? null : (n(i.wages) * periodFactor(i)) / va;
}
export const inRange = (r: number | null, [lo, hi]: Range) => r !== null && r >= lo && r <= hi;

/** Total pendapatan (27a + 27b) minus total pengeluaran (26a to 26e). Same as calculate().profit. */
export const selisihOf = (i: NtbInput) =>
  omzet(i) + n(i.otherRevenue) - (n(i.wages) + n(i.production) + n(i.purchases) + n(i.operating) + n(i.nonOperating)) * periodFactor(i);

export interface Adjustment {
  input: NtbInput;
  changed: AdjustedField[];
  /** What was done, or why nothing could be done. */
  note: string;
  ok: boolean;
  mode: AdjustMode;
}
export interface AdjustOptions { allowPurchases: boolean }

const rupiah = (v: number) => `Rp${Math.round(v).toLocaleString('id-ID')}`;
const pct = (v: number | null) => (v === null ? '-' : `${(v * 100).toFixed(2).replace('.', ',')}%`);
const verb = (a: number, b: number) => (b > a ? 'dinaikkan' : 'diturunkan');

/** Finds the multiple of Rp1.000 nearest to x0 that passes the test, looking outward in both directions (dir first). */
function settle(x0: number, ok: (x: number) => boolean, dir: 1 | -1): number | null {
  const base = roundRupiah(x0);
  if (base >= 0 && ok(base)) return base;
  for (let k = 1; k <= 3000; k++) {
    for (const d of [dir, -dir]) {
      const x = base + d * k * STEP;
      if (x >= 0 && ok(x)) return x;
    }
  }
  return null;
}

const FIELDS: AdjustedField[] = ['production', 'operating', 'purchases'];
const delta = (a: NtbInput, b: NtbInput) => FIELDS.reduce((s, k) => s + Math.abs(n(a[k]) - n(b[k])), 0);

/** Moves the NTB ratio the shortest way into the range while keeping selisih >= 0. */
export function adjustToRange(input: NtbInput, range: Range, mode: AdjustMode, opts: AdjustOptions = { allowPurchases: false }): Adjustment {
  const [lo, hi] = range;
  const before = ntbRatioOf(input);
  if (inRange(before, range) && selisihOf(input) >= 0) return { input, changed: [], note: 'Sudah dalam rentang', ok: true, mode };

  const f = periodFactor(input);
  const margin = Math.min(0.01, (hi - lo) / 4);
  const tooHigh = before !== null && before > hi;
  const target = inRange(before, range) ? Math.min(Math.max(before as number, lo + margin), hi - margin) : tooHigh ? hi - margin : lo + margin;
  const R = omzet(input);
  const b = n(input.purchases) * f;
  const p = n(input.production);
  const o = n(input.operating);
  const inner = (p + o) * f;
  /** The most that 26b + 26c + 26d may add up to (per year) so that pendapatan still covers pengeluaran. */
  const capVar = R + n(input.otherRevenue) - (n(input.wages) + n(input.nonOperating)) * f;
  const good = (next: NtbInput | null) => !!next && inRange(ntbRatioOf(next), range) && selisihOf(next) >= 0 && outputOf(next) > 0;
  const result = (next: NtbInput, changed: AdjustedField[], m: Single, text: string): Adjustment =>
    ({ input: next, changed, ok: true, mode: m, note: `${text}; rasio NTB ${pct(before)} menjadi ${pct(ntbRatioOf(next))}, selisih pendapatan dikurangi pengeluaran menjadi ${rupiah(selisihOf(next))}.` });

  const byCost = (): Adjustment | null => {
    const base = R - b;
    const capC = (capVar - b) / f;
    if (base <= 0 || capC < MIN_RUPIAH) return null;
    const have = p + o;
    const split = (x: number): NtbInput | null => {
      if (x < MIN_RUPIAH) return null;
      if (p > 0 && o > 0) {
        if (x < 2 * MIN_RUPIAH) return null;
        const pp = Math.min(Math.max(roundRupiah((p * x) / have), MIN_RUPIAH), x - MIN_RUPIAH);
        return { ...input, production: pp, operating: x - pp };
      }
      return p > 0 ? { ...input, production: x } : { ...input, operating: x };
    };
    const x = settle(Math.min((base * (1 - target)) / f, capC), (v) => good(split(v)), tooHigh ? 1 : -1);
    const next = x === null ? null : split(x);
    if (x === null || !next) return null;
    return result(next, p > 0 && o > 0 ? ['production', 'operating'] : p > 0 ? ['production'] : ['operating'], 'cost',
      `Biaya produksi + operasional (26b+26d) ${verb(have, x)} dari ${rupiah(have)} ke ${rupiah(x)}`);
  };

  const byPurchases = (): Adjustment | null => {
    if (inner <= 0 || target >= 1 || capVar - inner < 0) return null;
    const make = (v: number): NtbInput | null => (okVal(v, input.purchases) ? { ...input, purchases: v } : null);
    const x0 = Math.min((R - inner / (1 - target)) / f, (capVar - inner) / f);
    if (x0 < 0) return null;
    const x = settle(x0, (v) => good(make(v)), tooHigh ? 1 : -1);
    const next = x === null ? null : make(x);
    if (x === null || !next) return null;
    const old = n(input.purchases);
    return result(next, ['purchases'], 'purchases', `Pembelian barang (26c) ${verb(old, x)} dari ${rupiah(old)} ke ${rupiah(x)}`);
  };

  /** One factor for 26b, 26c and 26d together. */
  const byScale = (): Adjustment | null => {
    const sum = b + inner;
    const d = inner + (1 - target) * b;
    if (R <= 0 || d <= 0 || sum <= 0 || capVar < 0) return null;
    const start = Math.min(((1 - target) * R) / d, capVar / sum);
    const tot = (i: NtbInput) => n(i.purchases) + n(i.production) + n(i.operating);
    for (let k = 0; k <= 4000; k++) {
      for (const sign of k === 0 ? [0] : [-1, 1]) {
        const s = start * (1 + sign * k * 0.0005);
        if (s <= 0) continue;
        const next: NtbInput = { ...input, purchases: roundRupiah(n(input.purchases) * s), production: roundRupiah(p * s), operating: roundRupiah(o * s) };
        if (FIELDS.every((fl) => okVal(n(next[fl]), input[fl])) && good(next)) {
          const fields = FIELDS.filter((fl) => n(next[fl]) !== n(input[fl]));
          return result(next, fields, 'scale', `Pembelian, biaya produksi, dan operasional (26b, 26c, 26d) ${verb(tot(input), tot(next))} bersama-sama dengan faktor ${(tot(next) / tot(input)).toFixed(2).replace('.', ',')}, dari total ${rupiah(tot(input))} ke ${rupiah(tot(next))}`);
        }
      }
    }
    return null;
  };

  const all: Record<Single, () => Adjustment | null> = { cost: byCost, purchases: byPurchases, scale: byScale };
  const keys = (opts.allowPurchases ? ['cost', 'purchases', 'scale'] : ['cost']) as Single[];
  const NAME: Record<Single, string> = { cost: 'Mengubah 26b+26d', purchases: 'Mengubah 26c', scale: 'Mengubah 26b, 26c, 26d bersama' };
  let out: Adjustment | null = null;
  if (mode === 'auto') {
    out = keys.map((k) => all[k]()).filter((a): a is Adjustment => !!a).sort((a, c) => delta(input, a.input) - delta(input, c.input))[0] ?? null;
  } else if (!opts.allowPurchases) {
    out = byCost();
    if (out && mode !== 'cost') out.note = `26c hanya boleh berubah pada kategori G, jadi hanya 26b+26d yang diubah. ${out.note}`;
  } else {
    out = all[mode]();
    if (!out) for (const k of keys.filter((k) => k !== mode)) {
      out = all[k]();
      if (out) { out.note = `${NAME[mode]} tidak memungkinkan untuk baris ini; ${out.note}`; break; }
    }
  }
  const only = opts.allowPurchases ? '26b, 26c, dan 26d' : '26b dan 26d';
  return out ?? { input, changed: [], ok: false, mode, note: `Tidak dapat disesuaikan otomatis: rasio NTB harus masuk rentang dan total pengeluaran tidak boleh melebihi total pendapatan, tetapi dengan hanya mengubah ${only} (26a, 26e, 27a, 27b tidak diubah, nilai minimal Rp10.000, tiga angka terakhir 000) tidak ada kombinasi yang memenuhi keduanya. Perlu cek manual.` };
}
