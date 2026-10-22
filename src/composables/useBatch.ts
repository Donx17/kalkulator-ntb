import { computed, ref } from 'vue';
import type { AdjustMode } from '@/lib/adjust';
import { adjustAllItems, evaluate, newItem, summarize, type BatchItem, type BatchRow } from '@/lib/batch';
import type { NtbData } from '@/types/ntb';

/** State of the Excel check: what was uploaded, what changed since, and which row is open in Data usaha. */
export function useBatch(data: NtbData) {
  const items = ref<BatchItem[]>([]);
  const fileName = ref('');
  const mode = ref<AdjustMode>('auto');
  const selected = ref<number | null>(null);
  const lastRun = ref('');

  const results = computed(() => items.value.map((it) => evaluate(it, data)));
  const summary = computed(() => summarize(results.value));

  function load(rows: BatchRow[], name: string) {
    items.value = rows.map(newItem);
    fileName.value = name;
    selected.value = null;
    lastRun.value = '';
  }

  /** "Ubah semua data": rows already inside their range and rows saved by hand stay as they are. */
  function adjustAll() {
    const before = items.value;
    const skippedManual = before.filter((i) => i.source === 'manual').length;
    items.value = adjustAllItems(before, data, mode.value);
    const r = results.value;
    const changed = r.filter((x) => x.source === 'auto' && x.changed.length).length;
    lastRun.value = `${changed} baris diubah otomatis. ${r.filter((x) => x.state === 'in').length} baris sudah dalam rentang tidak diubah, ${skippedManual} baris hasil ubah manual dipertahankan, ${r.filter((x) => x.state === 'check').length} baris perlu cek manual.`;
  }

  function saveManual(index: number, row: BatchRow) {
    const it = items.value[index];
    items.value[index] = { ...it, current: row, source: 'manual', changed: [], note: '' };
  }

  function revert(index: number) {
    items.value[index] = newItem(items.value[index].original, index);
  }

  return { items, fileName, mode, selected, lastRun, results, summary, load, adjustAll, saveManual, revert };
}

export type Batch = ReturnType<typeof useBatch>;
