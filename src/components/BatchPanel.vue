<script setup lang="ts">
import { Download, FileSpreadsheet, Pencil, Upload, Wand2 } from '@lucide/vue';
import { ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Batch } from '@/composables/useBatch';
import type { BatchRow, RowState } from '@/lib/batch';
import { pct } from '@/lib/ntb';
import type { NtbData } from '@/types/ntb';

const props = defineProps<{ batch: Batch; data: NtbData }>();
const emit = defineEmits<{ open: [index: number] }>();

const busy = ref(false);
const error = ref('');
const done = ref('');

const BADGE: Record<RowState, string> = {
  in: 'bg-secondary text-foreground', out: 'bg-destructive/10 text-destructive', adjusted: 'bg-warning-soft text-warning',
  edited: 'bg-primary/10 text-primary', check: 'bg-destructive/10 text-destructive', skipped: 'bg-secondary text-muted-foreground',
};
const LABEL: Record<RowState, string> = { in: 'Dalam rentang', out: 'Di luar rentang', adjusted: 'Disesuaikan', edited: 'Diubah manual', check: 'Cek manual', skipped: 'Tidak dinilai' };
const MONEY: (keyof BatchRow)[] = ['wages', 'production', 'purchases', 'operating', 'nonOperating', 'revenue', 'otherRevenue'];
const HEAD: Record<string, string> = { wages: '26a', production: '26b', purchases: '26c', operating: '26d', nonOperating: '26e', revenue: '27a', otherRevenue: '27b' };
const CARDS = [['total', 'Total baris'], ['in', 'Dalam rentang'], ['out', 'Di luar rentang'], ['adjusted', 'Disesuaikan'], ['edited', 'Diubah manual'], ['check', 'Cek manual'], ['skipped', 'Tidak dinilai']] as const;

const num = (v: unknown) => (typeof v === 'number' ? v.toLocaleString('id-ID') : '-');

function save(bytes: Uint8Array, name: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}

async function run<T>(fn: () => Promise<T>) {
  busy.value = true; error.value = ''; done.value = '';
  try { return await fn(); } catch (e) { error.value = e instanceof Error ? e.message : 'Terjadi kesalahan.'; } finally { busy.value = false; }
}

const downloadTemplate = () => run(async () => save(await (await import('@/lib/excel')).buildTemplate(), 'template-kalkulator-ntb.xlsx'));

const downloadResult = () => run(async () => {
  const b = props.batch;
  const out = b.fileName.value.replace(/\.xlsx?$/i, '') + '-hasil.xlsx';
  save(await (await import('@/lib/excel')).buildResult(b.results.value, { fileName: b.fileName.value, mode: b.mode.value }, props.data), out);
  const s = b.summary.value;
  done.value = `Berkas ${out} sudah diunduh: ${s.total} baris, ${s.in} dalam rentang (tidak diubah), ${s.adjusted} disesuaikan otomatis, ${s.edited} diubah manual, ${s.out} masih di luar rentang, ${s.check} perlu cek manual, ${s.skipped} tidak dinilai. Buka sheet "Keterangan" untuk penjelasan lengkap; sel kuning (otomatis) dan biru (manual) menandai angka yang berubah, angka awal ada di catatan sel dan sheet "Data Asli".`;
});

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (!f) return;
  await run(async () => {
    const rows = await (await import('@/lib/excel')).readTemplate(await f.arrayBuffer());
    props.batch.load(rows, f.name);
    if (!rows.length) error.value = 'Tidak ada baris data. Isi sheet "Data" mulai baris 2 (baris CONTOH tidak diproses).';
  });
  input.value = '';
}

function adjustAll() {
  done.value = '';
  props.batch.adjustAll();
}
</script>

<template>
  <Card id="batch-tabel" class="no-print scroll-mt-4 lg:col-span-2">
    <CardHeader>
      <CardTitle>Periksa banyak usaha dengan Excel</CardTitle>
      <CardDescription>Unduh template, isi, lalu unggah. Data tampil apa adanya dan belum diubah. Klik "Ubah semua data" untuk menyesuaikan otomatis, atau klik satu baris untuk mengubahnya manual di Data usaha. Berkas diproses di browser dan tidak dikirim ke server.</CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" :disabled="busy" @click="downloadTemplate"><FileSpreadsheet aria-hidden="true" /> Unduh template</Button>
        <label class="inline-flex">
          <input type="file" accept=".xlsx" class="sr-only peer" :disabled="busy" @change="onFile" />
          <span class="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring"><Upload class="size-4" aria-hidden="true" /> Unggah Excel (.xlsx)</span>
        </label>
        <span v-if="batch.fileName.value" class="truncate text-sm text-muted-foreground">{{ batch.fileName.value }}</span>
      </div>

      <p v-if="error" class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{{ error }}</p>

      <template v-if="batch.items.value.length">
        <div class="grid gap-3 rounded-lg border bg-secondary/40 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label class="grid gap-1 text-sm font-medium">Cara menyesuaikan (26a, 26e, 27a, 27b tidak pernah diubah)
            <select v-model="batch.mode.value" class="h-9 rounded-md border bg-background px-2 text-sm font-normal">
              <option value="auto">Otomatis: angka yang perubahannya paling kecil</option>
              <option value="cost">Biaya produksi + operasional (26b, 26d)</option>
              <option value="purchases">Pembelian barang dijual (26c), hanya kategori G</option>
              <option value="scale">26b, 26c, 26d bersama, hanya kategori G</option>
            </select>
          </label>
          <Button type="button" :disabled="busy" @click="adjustAll"><Wand2 aria-hidden="true" /> Ubah semua data</Button>
          <p class="text-xs text-muted-foreground sm:col-span-2">26c hanya berubah pada kategori G. Baris yang sudah dalam rentang dan baris yang sudah diubah manual tidak ikut diubah. Hasil otomatis dijaga agar total pendapatan tidak lebih kecil dari total pengeluaran (selisih tidak negatif). Nilai hasil dibulatkan ke Rp1.000 (tiga angka terakhir 000) dan minimal Rp10.000.</p>
        </div>
        <p v-if="batch.lastRun.value" class="rounded-md border bg-secondary/60 p-3 text-sm" role="status">{{ batch.lastRun.value }}</p>

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          <div v-for="[k, l] in CARDS" :key="k" class="rounded-lg border bg-secondary/50 p-2">
            <p class="text-xs text-muted-foreground">{{ l }}</p><p class="text-xl font-semibold tabular-nums">{{ batch.summary.value[k] }}</p>
          </div>
        </div>

        <div class="max-h-[28rem] overflow-auto rounded-lg border">
          <table class="w-full min-w-[1420px] text-sm">
            <thead class="sticky top-0 z-10 bg-secondary text-left text-xs">
              <tr>
                <th class="sticky left-0 z-20 bg-secondary p-2 text-center">No.</th><th class="p-2">ID Assessment</th><th class="p-2">Usaha</th><th class="p-2">Kategori · KBLI</th>
                <th v-for="k in MONEY" :key="k" class="p-2 text-right">{{ HEAD[k] }}</th>
                <th class="p-2 text-right">Rasio NTB</th><th class="p-2 text-right">Selisih</th><th class="p-2 text-right">Rentang</th><th class="p-2">Status</th><th class="p-2">Keterangan</th><th class="sticky right-0 z-20 bg-secondary p-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in batch.results.value" :key="r.index" :id="`baris-${r.index + 1}`"
                class="group cursor-pointer border-t align-top hover:bg-secondary/60"
                :class="batch.selected.value === r.index ? 'bg-primary/5 outline outline-2 -outline-offset-2 outline-primary/50' : ''"
                @click="emit('open', r.index)"
              >
                <td class="sticky left-0 z-10 p-2 text-center" :class="batch.selected.value === r.index ? 'bg-primary/10' : 'bg-card group-hover:bg-secondary'">
                  <span class="inline-grid size-8 place-items-center rounded-full text-sm font-bold tabular-nums transition-colors" :class="batch.selected.value === r.index ? 'bg-primary text-primary-foreground shadow shadow-primary/40' : 'bg-secondary text-foreground'">{{ r.index + 1 }}</span>
                </td>
                <td class="p-2 tabular-nums">{{ r.original.id || '-' }}</td>
                <td class="p-2">{{ r.original.name || '-' }}</td>
                <td class="p-2 tabular-nums">{{ r.category ?? '-' }} · {{ r.adjusted.kbli || '-' }}<span v-if="r.group" class="block text-xs text-muted-foreground">{{ r.group }}</span></td>
                <td v-for="k in MONEY" :key="k" class="p-2 text-right tabular-nums" :class="r.adjusted[k] !== r.original[k] ? (r.source === 'manual' ? 'bg-primary/10 font-medium' : 'bg-warning-soft font-medium') : ''" :title="r.adjusted[k] !== r.original[k] ? `Awal: ${num(r.original[k])}` : undefined">{{ num(r.adjusted[k]) }}</td>
                <td class="p-2 text-right tabular-nums">{{ r.ratioAfter === null ? '-' : pct(r.ratioAfter) }}<span v-if="r.ratioBefore !== r.ratioAfter" class="block text-xs text-muted-foreground">awal {{ r.ratioBefore === null ? '-' : pct(r.ratioBefore) }}</span></td>
                <td class="p-2 text-right tabular-nums" :class="r.profit !== null && r.profit < 0 ? 'font-semibold text-destructive' : ''" title="Total pendapatan (27a+27b) dikurangi total pengeluaran (26a-26e)">{{ r.profit === null ? '-' : r.profit.toLocaleString('id-ID') }}</td>
                <td class="p-2 text-right tabular-nums">{{ r.range ? `${pct(r.range[0])} - ${pct(r.range[1])}` : '-' }}</td>
                <td class="p-2"><span class="rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap" :class="BADGE[r.state]">{{ LABEL[r.state] }}</span></td>
                <td class="max-w-[22rem] p-2 text-xs text-muted-foreground">{{ r.note }}</td>
                <td class="sticky right-0 z-10 p-2 text-center" :class="batch.selected.value === r.index ? 'bg-primary/10' : 'bg-card group-hover:bg-secondary'">
                  <Button type="button" size="sm" :variant="batch.selected.value === r.index ? 'default' : 'outline'" :aria-label="`Review dan edit baris ${r.index + 1}`" @click.stop="emit('open', r.index)"><Pencil aria-hidden="true" /> {{ batch.selected.value === r.index ? 'Dibuka' : 'Review' }}</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <Button type="button" :disabled="busy" @click="downloadResult"><Download aria-hidden="true" /> Unduh hasil (.xlsx)</Button>
          <p class="text-xs text-muted-foreground">Hasil mengikuti isi tabel saat ini. Angka yang berubah hanyalah saran; konfirmasikan ke responden sebelum mengubah data resmi.</p>
        </div>
        <p v-if="done" class="rounded-md border bg-secondary/60 p-3 text-sm" role="status">{{ done }}</p>
      </template>
    </CardContent>
  </Card>
</template>
