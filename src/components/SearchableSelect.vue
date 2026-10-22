<script setup lang="ts">
import { Check, ChevronsUpDown, X } from '@lucide/vue';
import { computed, ref } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Combobox, ComboboxAnchor, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxItemIndicator, ComboboxList, ComboboxTrigger, ComboboxViewport,
} from '@/components/ui/combobox';

export interface SelectItem {
  value: string;
  label: string;
}

const props = withDefaults(defineProps<{
  items: SelectItem[];
  placeholder: string;
  searchPlaceholder: string;
  /** Rows rendered at once; the rest appears as the visitor narrows the search. */
  limit?: number;
}>(), { limit: 60 });

const model = defineModel<string | null>({ required: true });
const search = ref('');

const selected = computed(() => props.items.find((i) => i.value === model.value) ?? null);
const matches = computed(() => {
  const query = search.value.trim().toLowerCase();
  return query ? props.items.filter((i) => `${i.value} ${i.label}`.toLowerCase().includes(query)) : props.items;
});
const shown = computed(() => matches.value.slice(0, props.limit));
const hidden = computed(() => matches.value.length - shown.value.length);
</script>

<template>
  <div class="flex gap-1.5">
    <Combobox v-model="model" class="min-w-0 flex-1" :ignore-filter="true" @update:open="(open: boolean) => { if (!open) search = ''; }">
      <ComboboxAnchor class="w-full min-w-0 flex-1">
        <ComboboxTrigger as-child>
          <Button variant="outline" role="combobox" class="h-auto min-h-9 w-full justify-between gap-2 py-2 font-normal">
            <span v-if="selected" class="min-w-0 text-left whitespace-normal"><span class="font-semibold tabular-nums">{{ selected.value }}</span> {{ selected.label }}</span>
            <span v-else class="text-muted-foreground">{{ placeholder }}</span>
            <ChevronsUpDown class="size-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </ComboboxTrigger>
      </ComboboxAnchor>

      <ComboboxList class="w-(--reka-popper-anchor-width) min-w-72">
        <ComboboxInput v-model="search" :placeholder="searchPlaceholder" />
        <ComboboxViewport class="max-h-72 overflow-y-auto p-1">
          <ComboboxEmpty class="py-6 text-center text-sm text-muted-foreground">Tidak ditemukan</ComboboxEmpty>
          <ComboboxGroup>
            <ComboboxItem v-for="item in shown" :key="item.value" :value="item.value" class="items-start gap-2">
              <span class="min-w-0 flex-1"><span class="font-semibold tabular-nums">{{ item.value }}</span> {{ item.label }}</span>
              <ComboboxItemIndicator><Check class="size-4" aria-hidden="true" /></ComboboxItemIndicator>
            </ComboboxItem>
          </ComboboxGroup>
          <p v-if="hidden > 0" class="px-2 py-2 text-xs text-muted-foreground">{{ hidden }} lainnya. Ketik untuk mempersempit.</p>
        </ComboboxViewport>
      </ComboboxList>
    </Combobox>

    <Button v-if="selected" type="button" variant="ghost" size="icon" class="shrink-0" aria-label="Hapus pilihan" @click="model = null">
      <X class="size-4" aria-hidden="true" />
    </Button>
  </div>
</template>
