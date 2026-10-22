<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div
    data-slot="card"
    :class="
      cn(
        'bg-card text-card-foreground flex flex-col gap-6 rounded-2xl border border-border/70 py-6 shadow-sm shadow-primary/5 transition-shadow duration-300 hover:shadow-md hover:shadow-primary/10',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
