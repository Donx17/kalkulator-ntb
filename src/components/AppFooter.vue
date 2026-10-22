<script setup lang="ts">
import { Code2, Globe, Mail, MapPin, Phone } from '@lucide/vue';
import BrandMark from '@/components/BrandMark.vue';
</script>

<template>
  <footer class="no-print mt-8 border-t border-border/70 bg-card/60">
    <div class="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div>
        <div class="flex items-center gap-3">
          <BrandMark class="size-10 text-primary" />
          <div class="leading-tight">
            <p class="font-semibold">Badan Pusat Statistik</p>
            <p class="text-sm text-muted-foreground">Kabupaten Takalar</p>
          </div>
        </div>
        <ul class="mt-4 grid gap-2 text-sm text-muted-foreground">
          <li class="flex gap-2"><MapPin class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> Jl. Syech Yusuf No. 5 Takalar, Sulawesi Selatan</li>
          <li class="flex gap-2"><Phone class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> (0418) 21435</li>
          <li class="flex gap-2"><Mail class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> <a class="underline-offset-4 hover:underline" href="mailto:bps7305@bps.go.id">bps7305@bps.go.id</a></li>
          <li class="flex gap-2"><Globe class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> <a class="underline-offset-4 hover:underline" href="https://takalarkab.bps.go.id" target="_blank" rel="noopener noreferrer">takalarkab.bps.go.id</a></li>
        </ul>
      </div>
      <div class="grid gap-3 text-sm text-muted-foreground">
        <p><strong class="text-foreground">Catatan.</strong> Alat ini membantu pemeriksaan awal. Angka hasil penyesuaian otomatis hanyalah saran, bukan data pendataan; konfirmasikan ke responden sebelum mengubah data resmi.</p>
        <p><strong class="text-foreground">Privasi.</strong> Angka dan berkas Excel diproses di browser Anda dan tidak dikirim ke server.</p>
        <p class="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-foreground"><Code2 class="size-4 shrink-0 text-primary" aria-hidden="true" /> Aplikasi web ini dibuat oleh <strong>Syahrul Halik</strong>.</p>
      </div>
    </div>
    <div class="border-t border-border/70 py-4 text-center text-xs text-muted-foreground">© 2026 BPS Kabupaten Takalar · Kalkulator NTB · Dibuat oleh Syahrul Halik</div>
  </footer>
</template>
