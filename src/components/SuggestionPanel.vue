<script setup lang="ts">
import { Lightbulb } from '@lucide/vue';
import { computed } from 'vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { rp } from '@/lib/ntb';
import { suggestionRows, type Suggestion } from '@/lib/suggest';
import type { NtbInput } from '@/types/ntb';

const props = defineProps<{ suggestion: Suggestion; input: NtbInput }>();

const rows = computed(() => suggestionRows(props.suggestion, props.input));
</script>

<template>
  <Card v-if="rows.length || suggestion.recommendation">
    <CardHeader>
      <CardTitle class="flex items-center gap-2"><Lightbulb class="size-4 text-primary" aria-hidden="true" /> Saran nilai inputan</CardTitle>
      <CardDescription>Nilai yang menjaga rasio NTB tetap dalam rentang kategori. Pendapatan dihitung dari biaya yang sudah Anda isi, dan biaya dari pendapatan yang sudah Anda isi.</CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4">
      <Table v-if="rows.length">
        <TableHeader>
          <TableRow>
            <TableHead>Komponen</TableHead>
            <TableHead class="text-right">Batas bawah</TableHead>
            <TableHead class="text-right">Batas atas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="row in rows" :key="row.label" :class="row.bold ? 'bg-secondary/60 font-semibold' : ''">
            <TableCell class="whitespace-normal">
              {{ row.label }}
              <p v-if="row.note" class="text-xs font-normal text-muted-foreground">{{ row.note }}</p>
            </TableCell>
            <TableCell class="text-right tabular-nums">{{ rp(row.low) }}</TableCell>
            <TableCell class="text-right tabular-nums">{{ rp(row.high) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <p v-else class="text-sm text-muted-foreground">Isi biaya produksi atau biaya operasional untuk melihat saran pendapatan, atau isi pendapatan untuk melihat saran biaya.</p>

      <p v-if="suggestion.recommendation" class="text-sm"><span class="font-semibold">Rekomendasi:</span> {{ suggestion.recommendation }}</p>
    </CardContent>
  </Card>
</template>
