<script setup lang="ts">
import { computed } from 'vue';
import type { RatioStatus } from '@/types/ntb';

/** A bar from 0% to 100% with the allowed range shaded and a marker at the value. */
const props = defineProps<{ value: number | null; range: [number, number] | null; status: RatioStatus; label: string }>();

const at = (v: number) => `${Math.max(0, Math.min(1, v)) * 100}%`;
const zone = computed(() => (props.range && props.range[1] > 0 ? { left: at(props.range[0]), width: `${(Math.min(1, props.range[1]) - Math.max(0, props.range[0])) * 100}%` } : null));
const beyond = computed(() => (props.value === null ? '' : props.value < 0 ? '◂' : props.value > 1 ? '▸' : ''));
</script>

<template>
  <div role="img" :aria-label="label" class="pt-6">
    <div class="relative h-3 rounded-full bg-secondary">
      <div v-if="zone" class="absolute inset-y-0 rounded-full bg-success/30 ring-1 ring-success/50" :style="zone" />
      <div v-if="value !== null" class="absolute -top-1.5 flex -translate-x-1/2 flex-col items-center transition-[left] duration-500 ease-out" :style="{ left: at(value) }">
        <span class="mb-0.5 -translate-y-full rounded px-1 text-[10px] leading-4 font-semibold text-white" :class="status === 'in' ? 'bg-success' : status === 'out' ? 'bg-warning' : 'bg-muted-foreground'" style="position:absolute;top:0">{{ beyond }}{{ (value * 100).toFixed(0) }}%</span>
        <span class="block h-6 w-1.5 rounded-full shadow ring-2 ring-background" :class="status === 'in' ? 'bg-success' : status === 'out' ? 'bg-warning' : 'bg-muted-foreground'" />
      </div>
    </div>
    <div class="mt-1.5 flex justify-between text-[10px] text-muted-foreground tabular-nums"><span>0%</span><span>50%</span><span>100%</span></div>
  </div>
</template>
