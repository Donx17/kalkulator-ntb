export interface Category {
  code: string;
  title: string;
}

/** One five-digit KBLI code: c = code, t = title, k = category code. */
export interface KbliCode {
  c: string;
  t: string;
  k: string;
}

export interface SizeClass {
  label: string;
  min: number;
  max: number | null;
}

export type Range = [number, number];
export type CostShareKey = 'produksi' | 'pembelian' | 'operasional' | 'nonOperasional';

/** Content of src/data/ntb-data.json, built by tools/extract-data.py. */
export interface NtbData {
  categories: Category[];
  kbli: KbliCode[];
  /** NTB ratio range per category; null when the workbook has none ("-"). */
  ntbRange: Record<string, Range | null>;
  /** Wage as percent of nilai tambah per category: [min, mid, max]. */
  wagePercent: Record<string, [number, number, number]>;
  sizeClasses: SizeClass[];
  wageToNtb: Range;
  wagePerWorkerYear: Range;
  costShare: Record<CostShareKey, Range>;
}

/** Sub-category of category A (komoditas), used for work in progress. */
export interface Commodity {
  id: string;
  label: string;
  /** Work in progress as a share of the suggested revenue. */
  wipShare: number;
}

/** The expense lines 26a to 26e of the questionnaire. */
export type ExpenseKey = 'wages' | 'production' | 'purchases' | 'operating' | 'nonOperating';

export interface NtbInput {
  category: string | null;
  kbli: string | null;
  workers: number | null;
  /** Commodity of a category A business; null for other categories. */
  commodity: string | null;
  /** 26a: wages, salaries and social security */
  wages: number | null;
  /** 26b */
  production: number | null;
  /** 26c: cost of goods sold */
  purchases: number | null;
  /** 26d */
  operating: number | null;
  /** 26e */
  nonOperating: number | null;
  /** 27a: value of production, sales or income of goods and services for a year */
  revenue: number | null;
  /** True for a business that started operating in 2026: omzet is then 31a x 12 instead of 27a. */
  startedThisYear: boolean;
  /** 31a: the same value for one month, used when startedThisYear is true */
  monthlyRevenue: number | null;
  /** 27b */
  otherRevenue: number | null;
}

export type RatioStatus = 'in' | 'out' | null;

export interface NtbResult {
  /** Omzet: 27a, or 31a x 12 for a business that started in 2026. */
  turnover: number;
  categoryTitle: string | null;
  kbliTitle: string | null;
  sizeClass: string | null;
  wagePerWorker: number | null;
  totalExpense: number;
  totalRevenue: number;
  expenseTooHigh: boolean;
  profit: number;
  profitLabel: string | null;
  output: number;
  valueAdded: number;
  ntbRatio: number | null;
  ntbRange: Range | null;
  hasThresholds: boolean;
  ntbStatus: RatioStatus;
  wageRatio: number | null;
  wageStatus: RatioStatus;
  warnings: { wagePerWorker?: string; expense?: string; revenue?: string };
  componentWarnings: Partial<Record<ExpenseKey, string>>;
  suggestions: Partial<Record<ExpenseKey, string>>;
}
