<script setup lang="ts">
import BrandMark from '@/components/BrandMark.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
</script>

<template>
  <div class="no-print">
    <nav class="glass sticky top-0 z-30 border-b border-border/60" aria-label="Navigasi utama">
      <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <BrandMark class="size-9 shrink-0 text-primary" />
        <div class="min-w-0 flex-1 leading-tight">
          <p class="truncate text-sm font-semibold">Kalkulator NTB</p>
          <p class="truncate text-xs text-muted-foreground">BPS Kabupaten Takalar</p>
        </div>
        <a href="#data-usaha" class="hidden rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:block">Satu usaha</a>
        <a href="#batch-tabel" class="hidden rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:block">Banyak usaha (Excel)</a>
        <ThemeToggle />
      </div>
    </nav>

  </div>
</template>
