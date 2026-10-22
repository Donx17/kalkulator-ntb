import { computed, ref } from 'vue';
import data from '@/data/ntb-data.json';
import extra from '@/data/sumut-extra.json';
import { calculate } from '@/lib/ntb';
import { effectiveData } from '@/lib/subcategory';
import { suggestInputs } from '@/lib/suggest';
import { collectIssues, summaryText } from '@/lib/summary';
import type { Commodity, NtbData, NtbInput } from '@/types/ntb';

const ntbData = data as unknown as NtbData;
const commodities = extra.commodities as Commodity[];

const EMPTY: NtbInput = {
  category: null, kbli: null, workers: null, commodity: null, wages: null, production: null, purchases: null, operating: null, nonOperating: null, revenue: null, startedThisYear: false, monthlyRevenue: null, otherRevenue: null,
};

// The sample of the original workbook.
const SAMPLE: NtbInput = { ...EMPTY, category: 'A', kbli: '01111', workers: 3, commodity: 'semusim', wages: 9_000_000, production: 10_000_000, operating: 500_000, revenue: 36_000_000 };

export function useNtbCalculator() {
  const input = ref<NtbInput>({ ...EMPTY });

  // The ranges of the table "Range Rasio NTB Standar Menurut KBLI", per category and per sub-category of A.
  const activeData = computed(() => effectiveData(ntbData, input.value.kbli));
  const result = computed(() => calculate(input.value, activeData.value));
  const issues = computed(() => collectIssues(result.value, input.value));
  const suggestion = computed(() => suggestInputs(input.value, result.value, commodities));
  const text = computed(() => summaryText(result.value, input.value, suggestion.value));
  const started = computed(() => Object.values(input.value).some((v) => v !== null && v !== 0));

  const categoryItems = ntbData.categories.map((c) => ({ value: c.code, label: c.title }));
  const kbliItems = computed(() => ntbData.kbli
    .filter((k) => !input.value.category || k.k === input.value.category)
    .map((k) => ({ value: k.c, label: k.t })));

  /** Picking a code also picks its category; picking another category drops a code that no longer fits. */
  function setKbli(code: string | null) {
    input.value.kbli = code;
    const item = ntbData.kbli.find((k) => k.c === code);
    if (item) {
      input.value.category = item.k;
      if (item.k !== 'A') input.value.commodity = null;
    }
  }

  function setCategory(code: string | null) {
    input.value.category = code;
    if (code !== 'A') input.value.commodity = null;
    if (input.value.kbli && ntbData.kbli.find((k) => k.c === input.value.kbli)?.k !== code) input.value.kbli = null;
  }

  const loadSample = () => { input.value = { ...SAMPLE }; };
  const reset = () => { input.value = { ...EMPTY }; };
  const loadInput = (value: NtbInput) => { input.value = { ...EMPTY, ...value }; };

  const commodityItems = commodities.map((c) => ({ value: c.id, label: c.label }));

  return { input, result, issues, suggestion, commodityItems, text, started, categoryItems, kbliItems, ntbData, activeData, setKbli, setCategory, loadSample, loadInput, reset };
}
