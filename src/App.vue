<script setup lang="ts">
import AppFooter from '@/components/AppFooter.vue';
import AppHero from '@/components/AppHero.vue';
import InputPanel from '@/components/InputPanel.vue';
import BatchPanel from '@/components/BatchPanel.vue';
import ResultPanel from '@/components/ResultPanel.vue';
import SuggestionPanel from '@/components/SuggestionPanel.vue';
import { ChevronLeft, ChevronRight, Save, ScanSearch, Undo2 } from '@lucide/vue';
import { computed, nextTick, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { useBatch } from '@/composables/useBatch';
import { useNtbCalculator } from '@/composables/useNtbCalculator';
import { inputToRow, rowToInput } from '@/lib/batch';

const { input, result, issues, suggestion, commodityItems, text, started, categoryItems, kbliItems, ntbData, activeData, setKbli, setCategory, loadSample, loadInput, reset } = useNtbCalculator();

const batch = useBatch(ntbData);
const loadedKey = ref('');
const editing = computed(() => (batch.selected.value === null ? null : batch.results.value[batch.selected.value] ?? null));
const dirty = computed(() => editing.value !== null && JSON.stringify(input.value) !== loadedKey.value);

/** Click a row of the Excel table: its category and amounts appear in Data usaha. */
async function openRow(index: number, anchor = 'data-usaha') {
  const r = batch.results.value[index];
  batch.selected.value = index;
  loadInput(rowToInput(r.adjusted, r.category));
  loadedKey.value = JSON.stringify(input.value);
  await nextTick();
  document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: anchor === 'edit-bar' ? 'nearest' : 'start' });
}

/** Saves the form back into the table; the table, its statuses and the Excel result follow. */
function saveRow() {
  const i = batch.selected.value;
  if (i === null) return;
  const row = inputToRow(input.value, batch.items.value[i].current);
  batch.saveManual(i, row);
  const r = batch.results.value[i];
  loadInput(rowToInput(r.adjusted, r.category));
  loadedKey.value = JSON.stringify(input.value);
}

const total = computed(() => batch.items.value.length);
const needsReview = (i: number) => {
  const r = batch.results.value[i];
  return r.state === 'out' || r.state === 'check' || (r.state === 'edited' && r.inRangeNow === false);
};
const reviewCount = computed(() => batch.results.value.filter((_, i) => needsReview(i)).length);

/** Move to another row; unsaved changes need a confirmation. */
async function goTo(index: number) {
  if (index < 0 || index >= total.value || index === batch.selected.value) return;
  if (dirty.value && !window.confirm('Ada perubahan yang belum disimpan. Pindah baris tanpa menyimpan?')) return;
  await openRow(index, 'edit-bar');
}
const prevRow = () => goTo((batch.selected.value ?? 0) - 1);
const nextRow = () => goTo((batch.selected.value ?? -1) + 1);
function nextReview() {
  const from = batch.selected.value ?? -1;
  for (let k = 1; k <= total.value; k++) {
    const i = (from + k) % total.value;
    if (needsReview(i)) return goTo(i);
  }
}
async function saveAndNext() {
  saveRow();
  const i = batch.selected.value;
  if (i !== null && i + 1 < total.value) await openRow(i + 1, 'edit-bar');
}

function closeRow() {
  batch.selected.value = null;
  document.getElementById('batch-tabel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function revertRow() {
  const i = batch.selected.value;
  if (i === null) return;
  batch.revert(i);
  const r = batch.results.value[i];
  loadInput(rowToInput(r.adjusted, r.category));
  loadedKey.value = JSON.stringify(input.value);
}
</script>

<template>
  <div class="min-h-screen">
    <AppHero />

    <main class="mx-auto grid max-w-6xl items-start gap-5 px-4 py-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] animate-in fade-in slide-in-from-bottom-2 duration-700">
      <section v-if="editing" id="edit-bar" class="no-print scroll-mt-20 overflow-hidden rounded-2xl border border-primary/40 bg-card shadow-lg shadow-primary/10 lg:col-span-2" aria-live="polite">
        <div class="h-1 bg-secondary"><div class="h-full bg-primary transition-[width] duration-500" :style="{ width: `${((editing.index + 1) / total) * 100}%` }" /></div>
        <div class="grid gap-3 p-4">
          <div class="flex flex-wrap items-center gap-4">
            <div class="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/30" aria-label="Nomor baris">
              <span class="text-xs leading-none opacity-80">Baris</span><span class="text-2xl leading-none font-bold tabular-nums">{{ editing.index + 1 }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-semibold">Mengedit baris {{ editing.index + 1 }} dari {{ total }}<span v-if="editing.original.id" class="font-normal text-muted-foreground"> · ID {{ editing.original.id }}</span></p>
              <p class="truncate text-sm text-muted-foreground">{{ editing.original.name || 'Tanpa nama usaha' }}</p>
              <p class="text-xs text-muted-foreground">{{ reviewCount }} baris masih perlu dicek. Angka disimpan dibulatkan ke Rp1.000. Baris yang diubah manual tidak ikut diubah oleh "Ubah semua data".</p>
            </div>
            <div class="flex items-center gap-1" role="group" aria-label="Pindah baris">
              <Button type="button" variant="outline" size="icon" :disabled="editing.index === 0" aria-label="Baris sebelumnya" title="Baris sebelumnya" @click="prevRow"><ChevronLeft aria-hidden="true" /></Button>
              <Button type="button" variant="outline" size="icon" :disabled="editing.index + 1 >= total" aria-label="Baris berikutnya" title="Baris berikutnya" @click="nextRow"><ChevronRight aria-hidden="true" /></Button>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button type="button" :disabled="!dirty" @click="saveRow"><Save aria-hidden="true" /> Simpan ke tabel</Button>
            <Button type="button" variant="secondary" :disabled="editing.index + 1 >= total" @click="saveAndNext">Simpan &amp; berikutnya <ChevronRight aria-hidden="true" /></Button>
            <Button type="button" variant="outline" :disabled="reviewCount === 0" @click="nextReview"><ScanSearch aria-hidden="true" /> Review berikutnya yang perlu dicek</Button>
            <Button type="button" variant="outline" :disabled="editing.source === 'upload'" @click="revertRow"><Undo2 aria-hidden="true" /> Kembalikan data awal</Button>
            <Button type="button" variant="ghost" @click="closeRow">Tutup</Button>
          </div>
        </div>
      </section>
      <div id="data-usaha" class="scroll-mt-4"><InputPanel v-model="input" :category-items="categoryItems" :kbli-items="kbliItems" :commodity-items="commodityItems" @category="setCategory" @kbli="setKbli" @sample="loadSample" @reset="reset" /></div>
      <div class="grid gap-5">
        <ResultPanel :result="result" :input="input" :issues="issues" :text="text" :started="started" :data="activeData" />
        <SuggestionPanel v-if="started" :suggestion="suggestion" :input="input" />
      </div>
      <BatchPanel :batch="batch" :data="ntbData" @open="openRow" />
    </main>

    <AppFooter />
  </div>
</template>
