<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/composables/useTheme';

const { isDark, toggle } = useTheme();
</script>

<template>
  <Button variant="ghost" size="icon" :aria-label="isDark ? 'Pakai tema terang' : 'Pakai tema gelap'" @click="toggle()">
    <Sun v-if="isDark" class="size-5" aria-hidden="true" />
    <Moon v-else class="size-5" aria-hidden="true" />
  </Button>
</template>
