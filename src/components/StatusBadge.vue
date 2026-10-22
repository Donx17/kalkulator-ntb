<script setup lang="ts">
import { Check, TriangleAlert } from '@lucide/vue';
import { Badge } from '@/components/ui/badge';
import type { RatioStatus } from '@/types/ntb';

defineProps<{ status: RatioStatus }>();
</script>

<template>
  <Badge v-if="status === 'in'" variant="outline" class="border-success/30 bg-success-soft text-success">
    <Check aria-hidden="true" /> Dalam rentang
  </Badge>
  <Badge v-else-if="status === 'out'" variant="outline" class="border-warning/30 bg-warning-soft text-warning">
    <TriangleAlert aria-hidden="true" /> Di luar rentang
  </Badge>
</template>
