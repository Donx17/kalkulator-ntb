<script setup lang="ts">
import { ArrowRight, Check, CircleCheck, ClipboardList, Copy, Info, Scale, TrendingDown, TrendingUp, TriangleAlert, Wallet } from '@lucide/vue';
import { computed, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { pct, rp } from '@/lib/ntb';
import type { Issue } from '@/lib/summary';
import type { NtbData, NtbInput, NtbResult } from '@/types/ntb';
import RatioGauge from './RatioGauge.vue';
import ResultRow from './ResultRow.vue';
import StatusBadge from './StatusBadge.vue';

const props = defineProps<{ result: NtbResult; input: NtbInput; issues: Issue[]; text: string; started: boolean; data: NtbData }>();

const copied = ref<'idle' | 'ok' | 'failed'>('idle');
async function copy() {
  try {
    await navigator.clipboard.writeText(props.text);
    copied.value = 'ok';
  } catch {
    copied.value = 'failed';
  }
  setTimeout(() => (copied.value = 'idle'), 1800);
}

const rangeText = computed(() => (props.result.ntbRange ? `${pct(props.result.ntbRange[0])} sampai ${pct(props.result.ntbRange[1])}` : props.input.category ? 'tidak ada batas untuk kategori ini' : 'pilih kategori KBLI terlebih dahulu'));
const verdict = computed(() => {
  const s = props.result.ntbStatus;
  if (s === 'in') return { tone: 'ok', title: 'Rasio NTB dalam rentang', sub: `Rentang kategori ${rangeText.value}.` };
  if (s === 'out') return { tone: 'bad', title: 'Rasio NTB di luar rentang', sub: `Rentang kategori ${rangeText.value}. Periksa kembali isian di bawah.` };
  return { tone: 'idle', title: 'Rasio NTB belum bisa dinilai', sub: props.input.category ? 'Lengkapi omzet dan biaya untuk menghitung rasio.' : 'Pilih kategori KBLI terlebih dahulu.' };
});
const warnings = computed(() => props.issues.filter((i) => i.kind === 'warning').length);

/** Bars of omzet, output and nilai tambah, each as a share of omzet. */
const flow = computed(() => {
  const base = props.result.turnover > 0 ? props.result.turnover : 0;
  const w = (v: number) => (base > 0 ? `${Math.max(0, Math.min(1, v / base)) * 100}%` : '0%');
  return [
    { label: 'Omzet', value: props.result.turnover, width: w(props.result.turnover), cls: 'bg-primary/40' },
    { label: 'Output', value: props.result.output, width: w(props.result.output), cls: 'bg-primary/70' },
    { label: 'Nilai tambah', value: props.result.valueAdded, width: w(props.result.valueAdded), cls: props.result.valueAdded < 0 ? 'bg-warning' : 'bg-primary' },
  ];
});
</script>

<template>
  <Card class="gap-0 overflow-hidden py-0">
    <div class="flex flex-wrap items-center gap-3 border-b bg-gradient-to-br from-primary/10 via-transparent to-transparent px-5 py-4">
      <span class="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20"><ClipboardList class="size-5" aria-hidden="true" /></span>
      <div class="min-w-0 flex-1">
        <h2 class="text-xl font-semibold tracking-tight">Hasil pemeriksaan</h2>
        <p class="text-sm text-muted-foreground">Diperbarui saat Anda mengetik.</p>
      </div>
      <Button type="button" variant="outline" size="sm" class="no-print" :disabled="!started" @click="copy">
        <Check v-if="copied === 'ok'" aria-hidden="true" /><Copy v-else aria-hidden="true" />
        {{ copied === 'ok' ? 'Tersalin' : copied === 'failed' ? 'Gagal menyalin' : 'Salin hasil' }}
      </Button>
    </div>

    <CardContent class="p-4 sm:p-5">
      <div v-if="!started" class="grid place-items-center gap-3 py-14 text-center">
        <span class="grid size-16 place-items-center rounded-3xl bg-primary/10 text-primary"><ClipboardList class="size-8" aria-hidden="true" /></span>
        <p class="font-medium">Belum ada data</p>
        <p class="max-w-xs text-sm text-muted-foreground">Pilih kategori KBLI dan isi angka usaha di Data usaha. Hasil dan grafik rasio muncul di sini.</p>
      </div>

      <div v-else class="grid gap-5" aria-live="polite">
        <div class="flex items-center gap-4 rounded-2xl border p-4" :class="verdict.tone === 'ok' ? 'border-success/30 bg-success-soft' : verdict.tone === 'bad' ? 'border-warning/30 bg-warning-soft' : 'bg-secondary/50'">
          <span class="grid size-12 shrink-0 place-items-center rounded-full" :class="verdict.tone === 'ok' ? 'bg-success text-white' : verdict.tone === 'bad' ? 'bg-warning text-white' : 'bg-muted-foreground/30'">
            <CircleCheck v-if="verdict.tone === 'ok'" class="size-6" aria-hidden="true" /><TriangleAlert v-else-if="verdict.tone === 'bad'" class="size-6" aria-hidden="true" /><Info v-else class="size-6" aria-hidden="true" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-lg leading-tight font-semibold" :class="verdict.tone === 'ok' ? 'text-success' : verdict.tone === 'bad' ? 'text-warning' : ''">{{ verdict.title }}</p>
            <p class="text-sm text-muted-foreground">{{ verdict.sub }}</p>
          </div>
          <p v-if="result.ntbRatio !== null" class="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl" :class="verdict.tone === 'ok' ? 'text-success' : 'text-warning'">{{ pct(result.ntbRatio) }}</p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl border bg-card p-4">
            <div class="flex items-center justify-between gap-2"><p class="text-sm font-semibold">Rasio NTB</p><StatusBadge :status="result.ntbStatus" /></div>
            <p class="text-xs text-muted-foreground">nilai tambah ÷ output</p>
            <RatioGauge :value="result.ntbRatio" :range="result.ntbRange" :status="result.ntbStatus" :label="`Rasio NTB ${result.ntbRatio === null ? 'belum dihitung' : pct(result.ntbRatio)}, rentang ${rangeText}`" />
            <p class="mt-2 text-xs text-muted-foreground">Rentang: {{ rangeText }}</p>
          </div>
          <div class="rounded-2xl border bg-card p-4">
            <div class="flex items-center justify-between gap-2"><p class="text-sm font-semibold">Rasio upah</p><StatusBadge :status="result.wageStatus" /></div>
            <p class="text-xs text-muted-foreground">26a ÷ nilai tambah <span v-if="result.wageRatio !== null" class="font-semibold text-foreground">· {{ pct(result.wageRatio) }}</span></p>
            <RatioGauge :value="result.wageRatio" :range="data.wageToNtb" :status="result.wageStatus" :label="`Rasio upah ${result.wageRatio === null ? 'belum dihitung' : pct(result.wageRatio)}, rentang ${pct(data.wageToNtb[0])} sampai ${pct(data.wageToNtb[1])}`" />
            <p class="mt-2 text-xs text-muted-foreground">Rentang: {{ pct(data.wageToNtb[0]) }} sampai {{ pct(data.wageToNtb[1]) }}</p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border bg-secondary/40 p-3">
            <p class="flex items-center gap-1.5 text-xs tracking-wide text-muted-foreground uppercase"><TrendingDown class="size-3.5" aria-hidden="true" /> Total pengeluaran</p>
            <p class="mt-1 text-lg font-semibold tabular-nums">{{ rp(result.totalExpense) }}</p>
            <p class="text-xs text-muted-foreground">26a sampai 26e</p>
          </div>
          <div class="rounded-2xl border bg-secondary/40 p-3">
            <p class="flex items-center gap-1.5 text-xs tracking-wide text-muted-foreground uppercase"><TrendingUp class="size-3.5" aria-hidden="true" /> Total pendapatan</p>
            <p class="mt-1 text-lg font-semibold tabular-nums">{{ rp(result.totalRevenue) }}</p>
            <p class="text-xs text-muted-foreground">omzet dan 27b</p>
          </div>
          <div class="rounded-2xl border p-3" :class="result.profit < 0 ? 'border-warning/30 bg-warning-soft text-warning' : 'bg-secondary/40'">
            <p class="flex items-center gap-1.5 text-xs tracking-wide uppercase" :class="result.profit < 0 ? '' : 'text-muted-foreground'"><Scale class="size-3.5" aria-hidden="true" /> Selisih</p>
            <p class="mt-1 text-lg font-semibold tabular-nums">{{ rp(result.profit) }}</p>
            <p class="text-xs" :class="result.profit < 0 ? '' : 'text-muted-foreground'">{{ result.profit < 0 ? 'Usaha rugi' : result.profit > 0 ? 'Usaha untung' : ' ' }}</p>
          </div>
        </div>

        <section aria-labelledby="alur" class="rounded-2xl border bg-card p-4">
          <h3 id="alur" class="flex items-center gap-2 text-sm font-semibold"><Wallet class="size-4 text-primary" aria-hidden="true" /> Dari omzet ke nilai tambah</h3>
          <ul class="mt-3 grid gap-3">
            <li v-for="f in flow" :key="f.label" class="grid gap-1">
              <div class="flex items-baseline justify-between gap-2 text-sm"><span>{{ f.label }}</span><span class="font-semibold tabular-nums" :class="f.value < 0 ? 'text-warning' : ''">{{ rp(f.value) }}</span></div>
              <div class="h-2.5 overflow-hidden rounded-full bg-secondary"><div class="h-full rounded-full transition-[width] duration-500 ease-out" :class="f.cls" :style="{ width: f.width }" /></div>
            </li>
          </ul>
          <p class="mt-3 text-xs text-muted-foreground">Output = omzet − 26c. Nilai tambah = omzet − 26b − 26c − 26d<span v-if="input.startedThisYear">. Omzet = 31a × 12</span>.</p>
        </section>

        <details class="group rounded-2xl border bg-card p-4" open>
          <summary class="cursor-pointer text-sm font-semibold marker:text-primary">Rincian usaha dan tenaga kerja</summary>
          <dl class="mt-2 divide-y">
            <ResultRow label="Kategori"><span class="font-normal">{{ result.categoryTitle ? `${input.category}. ${result.categoryTitle}` : '-' }}</span></ResultRow>
            <ResultRow label="KBLI"><span class="font-normal">{{ result.kbliTitle ? `${input.kbli} ${result.kbliTitle}` : '-' }}</span></ResultRow>
            <ResultRow label="Klasifikasi usaha">{{ result.sizeClass ?? '-' }}</ResultRow>
            <ResultRow label="Upah per tenaga kerja setahun">
              <template v-if="result.wagePerWorker !== null">{{ rp(result.wagePerWorker) }} <span class="font-normal text-muted-foreground">({{ rp(result.wagePerWorker / 12) }} per bulan)</span></template>
              <template v-else>-</template>
            </ResultRow>
          </dl>
        </details>

        <section aria-labelledby="periksa" class="grid gap-2">
          <h3 id="periksa" class="flex items-center gap-2 text-sm font-semibold">Perlu diperiksa <span v-if="warnings" class="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">{{ warnings }} peringatan</span></h3>
          <p v-if="!issues.length" class="flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft p-3 text-sm text-success"><CircleCheck class="size-4" aria-hidden="true" /> Tidak ada peringatan untuk angka yang sudah diisi.</p>
          <div v-for="(issue, index) in issues" :key="index" class="flex gap-3 rounded-xl border-l-4 p-3 text-sm"
            :class="issue.kind === 'warning' ? 'border-warning bg-warning-soft text-warning' : issue.kind === 'tip' ? 'border-info bg-info-soft text-info' : 'border-border bg-secondary/50'">
            <TriangleAlert v-if="issue.kind === 'warning'" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <ArrowRight v-else-if="issue.kind === 'tip'" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <Info v-else class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p class="text-current">{{ issue.text }}</p>
          </div>
        </section>
      </div>
    </CardContent>
  </Card>
</template>
