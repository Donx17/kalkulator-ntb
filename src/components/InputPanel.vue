<script setup lang="ts">
import { Building2, CalendarClock, FlaskConical, Receipt, RotateCcw, Store, Wallet } from '@lucide/vue';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { NtbInput } from '@/types/ntb';
import MoneyField from './MoneyField.vue';
import SearchableSelect, { type SelectItem } from './SearchableSelect.vue';

defineProps<{ categoryItems: SelectItem[]; kbliItems: SelectItem[]; commodityItems: SelectItem[] }>();
const input = defineModel<NtbInput>({ required: true });
defineEmits<{ category: [code: string | null]; kbli: [code: string | null]; sample: []; reset: [] }>();

/** Rincian 26 is filled per month for a business that started in 2026. */
const unit = computed(() => (input.value.startedThisYear ? ' (sebulan)' : ''));

const workersText = (value: number | null) => (value === null ? '' : String(value));
function onWorkers(event: Event) {
  const digits = (event.target as HTMLInputElement).value.replace(/\D/g, '');
  (event.target as HTMLInputElement).value = digits;
  input.value.workers = digits ? Number(digits) : null;
}
</script>

<template>
  <Card class="gap-0 overflow-hidden py-0">
    <div class="hero-bg relative isolate overflow-hidden px-5 py-5 text-white">
      <div class="hero-grid absolute inset-0 -z-10 opacity-60" aria-hidden="true" />
      <div class="flex flex-wrap items-center gap-4">
        <span class="grid size-12 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur"><Building2 class="size-6" aria-hidden="true" /></span>
        <div class="min-w-0 flex-1">
          <h2 class="text-xl font-semibold tracking-tight">Data usaha</h2>
          <p class="text-sm text-white/80">Isi sesuai kuesioner. Semua angka dalam rupiah setahun.</p>
        </div>
        <div class="flex gap-2">
          <Button type="button" size="sm" class="border border-white/30 bg-white/15 text-white backdrop-blur hover:bg-white/25" @click="$emit('sample')"><FlaskConical aria-hidden="true" /> Isi contoh</Button>
          <Button type="button" size="sm" variant="ghost" class="text-white hover:bg-white/15 hover:text-white" @click="$emit('reset')"><RotateCcw aria-hidden="true" /> Kosongkan</Button>
        </div>
      </div>
    </div>

    <CardContent class="grid gap-4 p-4 sm:p-5">
      <section class="grid gap-4 rounded-2xl border bg-secondary/30 p-4" aria-labelledby="identitas">
        <div class="flex items-center gap-3">
          <span class="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30">1</span>
          <h3 id="identitas" class="flex items-center gap-2 font-semibold"><Store class="size-4 text-primary" aria-hidden="true" /> Identitas usaha</h3>
        </div>
        <div class="grid gap-1.5">
          <Label class="font-normal">Kategori KBLI</Label>
          <SearchableSelect :model-value="input.category" :items="categoryItems" placeholder="Pilih kategori" search-placeholder="Cari kategori, mis. G atau perdagangan" @update:model-value="$emit('category', $event)" />
        </div>
        <div class="grid gap-1.5">
          <Label class="font-normal">KBLI 5 digit</Label>
          <SearchableSelect :model-value="input.kbli" :items="kbliItems" placeholder="Pilih KBLI" search-placeholder="Cari kode atau nama usaha, mis. 47111" @update:model-value="$emit('kbli', $event)" />
        </div>
        <div v-if="input.category === 'A'" class="grid gap-1.5">
          <Label class="font-normal">Komoditas kategori A <span class="text-muted-foreground">untuk work in progress</span></Label>
          <SearchableSelect v-model="input.commodity" :items="commodityItems" placeholder="Pilih komoditas" search-placeholder="Cari komoditas" />
        </div>
        <div class="grid gap-1.5">
          <Label for="workers" class="font-normal">Banyaknya tenaga kerja</Label>
          <Input id="workers" inputmode="numeric" placeholder="mis. 3" class="h-11 text-base" :model-value="workersText(input.workers)" @input="onWorkers" />
        </div>
      </section>

      <section class="grid gap-4 rounded-2xl border bg-secondary/30 p-4" aria-labelledby="pengeluaran">
        <div class="flex items-center gap-3">
          <span class="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30">2</span>
          <h3 id="pengeluaran" class="flex items-center gap-2 font-semibold"><Receipt class="size-4 text-primary" aria-hidden="true" /> Pengeluaran usaha <span class="rounded-full bg-secondary px-2 py-0.5 text-xs font-normal text-muted-foreground">Rincian 26</span></h3>
        </div>
        <MoneyField v-model="input.wages" :label="`26a. Total upah dan gaji, serta jaminan sosial petugas${unit}`" />
        <MoneyField v-model="input.production" :label="`26b. Biaya produksi${unit}`" />
        <MoneyField v-model="input.purchases" :label="`26c. Biaya pembelian barang yang terjual${unit}`" />
        <MoneyField v-model="input.operating" :label="`26d. Biaya operasional${unit}`" />
        <MoneyField v-model="input.nonOperating" :label="`26e. Biaya non operasional${unit}`" />
      </section>

      <section class="grid gap-4 rounded-2xl border bg-secondary/30 p-4" aria-labelledby="pendapatan">
        <div class="flex items-center gap-3">
          <span class="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30">3</span>
          <h3 id="pendapatan" class="flex items-center gap-2 font-semibold"><Wallet class="size-4 text-primary" aria-hidden="true" /> Pendapatan usaha <span class="rounded-full bg-secondary px-2 py-0.5 text-xs font-normal text-muted-foreground">Rincian 27</span></h3>
        </div>
        <div class="flex items-start gap-3 rounded-xl border border-primary/20 bg-card p-3 transition-colors" :class="input.startedThisYear ? 'border-primary/50 bg-primary/5' : ''">
          <Switch id="started-this-year" v-model="input.startedThisYear" class="mt-0.5" />
          <div class="grid gap-0.5">
            <Label for="started-this-year" class="flex items-center gap-1.5 leading-snug"><CalendarClock class="size-4 text-primary" aria-hidden="true" /> Usaha mulai beroperasi tahun 2026</Label>
            <p class="text-xs text-muted-foreground">Omzet memakai rincian 31a dan semua pengeluaran rincian 26 diisi per bulan. Aplikasi mengalikannya dengan 12.</p>
          </div>
        </div>
        <MoneyField v-if="input.startedThisYear" v-model="input.monthlyRevenue" label="31a. Nilai produksi, penjualan, atau pendapatan barang dan jasa sebulan" />
        <MoneyField v-else v-model="input.revenue" label="27a. Nilai produksi, penjualan, atau pendapatan barang dan jasa setahun" />
        <MoneyField v-model="input.otherRevenue" label="27b. Pendapatan lainnya" />
      </section>
    </CardContent>
  </Card>
</template>
