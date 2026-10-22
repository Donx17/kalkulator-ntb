<script setup lang="ts">
import { computed, useId } from 'vue';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const props = defineProps<{ label: string; prefix?: string }>();
const model = defineModel<number | null>({ required: true });
const id = useId();

/** "26a. Total upah" is shown as a code chip plus the text. */
const parts = computed(() => {
  const m = /^(\d{2}[a-z])\.\s*(.*)$/i.exec(props.label);
  return m ? { code: m[1], text: m[2] } : { code: '', text: props.label };
});

const digitsOf = (text: string) => text.replace(/\D/g, '');
const dotted = (digits: string) => (digits ? Number(digits).toLocaleString('id-ID') : '');

/** Whole numbers with thousand dots while typing; the caret stays after the same digit. */
function onInput(event: Event) {
  const el = event.target as HTMLInputElement;
  const before = digitsOf(el.value.slice(0, el.selectionStart ?? el.value.length)).length;
  const digits = digitsOf(el.value);
  el.value = dotted(digits);
  let pos = 0;
  let seen = 0;
  while (pos < el.value.length && seen < before) {
    if (/\d/.test(el.value[pos])) seen++;
    pos++;
  }
  el.setSelectionRange(pos, pos);
  model.value = digits ? Number(digits) : null;
}
</script>

<template>
  <div class="grid gap-1.5">
    <Label :for="id" class="items-start gap-2 leading-snug font-normal">
      <span v-if="parts.code" class="mt-px rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary tabular-nums">{{ parts.code }}</span>
      <span>{{ parts.text }}</span>
    </Label>
    <div class="flex items-stretch overflow-hidden rounded-lg border bg-background shadow-xs transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30">
      <span class="flex items-center border-r bg-secondary/70 px-3 text-sm font-medium text-muted-foreground" aria-hidden="true">{{ prefix ?? 'Rp' }}</span>
      <Input :id="id" inputmode="numeric" placeholder="0" class="h-11 rounded-none border-0 text-right text-base font-medium tabular-nums shadow-none focus-visible:ring-0" :model-value="model === null ? '' : dotted(String(model))" @input="onInput" />
    </div>
  </div>
</template>
