<script setup lang="ts">
defineProps<{ label: string; hint?: string }>();
</script>

<template>
  <div class="grid gap-x-4 gap-y-0.5 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
    <dt class="text-sm">{{ label }} <span v-if="hint" class="text-muted-foreground">{{ hint }}</span></dt>
    <dd class="flex flex-wrap items-center gap-2 text-sm font-medium tabular-nums [overflow-wrap:anywhere]"><slot /></dd>
  </div>
</template>
