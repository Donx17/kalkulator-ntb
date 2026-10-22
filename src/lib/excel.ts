import type { AdjustMode } from '@/lib/adjust';
import type { BatchRow, RowResult } from '@/lib/batch';
import { summarize } from '@/lib/batch';
import { CATEGORY_RANGES, SUB_RANGES } from '@/lib/subcategory';
import type { NtbData } from '@/types/ntb';

type Col = { key: keyof BatchRow; header: string; width: number; kind: 'text' | 'money' };

/** Template columns, in this order. */
export const COLS: Col[] = [
  { key: 'id', header: 'ID Assessment', width: 20, kind: 'text' },
  { key: 'category', header: 'Kategori', width: 11, kind: 'text' },
  { key: 'kbli', header: 'Kode KBLI', width: 12, kind: 'text' },
  { key: 'name', header: 'Nama Usaha', width: 32, kind: 'text' },
  { key: 'wages', header: '26a Upah/Gaji', width: 16, kind: 'money' },
  { key: 'production', header: '26b Biaya Produksi', width: 16, kind: 'money' },
  { key: 'purchases', header: '26c Pembelian Barang Dijual', width: 17, kind: 'money' },
  { key: 'operating', header: '26d Biaya Operasional', width: 16, kind: 'money' },
  { key: 'nonOperating', header: '26e Biaya Non Operasional', width: 16, kind: 'money' },
  { key: 'revenue', header: '27a Omzet Setahun', width: 18, kind: 'money' },
  { key: 'otherRevenue', header: '27b Pendapatan Lainnya', width: 16, kind: 'money' },
];
const N = COLS.length;
const MONEY = '#,##0';
const fill = (argb: string) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } }) as const;
type WS = import('exceljs').Worksheet;

async function lib() {
  const mod = await import('exceljs');
  return (mod.default ?? mod) as typeof import('exceljs');
}

function styleHeader(ws: WS, upTo?: number) {
  const r = ws.getRow(1);
  r.height = 44;
  r.eachCell({ includeEmpty: true }, (c, i) => {
    if (upTo && i > upTo) return;
    c.fill = fill('FF0F766E'); c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
}

function dataSheet(wb: import('exceljs').Workbook, name: string, rows: number) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1, xSplit: 1 }] });
  ws.columns = COLS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  COLS.forEach((c, i) => { for (let r = 2; r <= rows + 1; r++) ws.getCell(r, i + 1).numFmt = c.kind === 'text' ? '@' : MONEY; });
  return ws;
}

export async function buildTemplate(): Promise<Uint8Array> {
  const ExcelJS = await lib();
  const wb = new ExcelJS.Workbook();
  const ws = dataSheet(wb, 'Data', 2000);
  const put = (n: number, r: Partial<BatchRow>) => COLS.forEach((c, i) => { const v = r[c.key]; if (v !== undefined) ws.getCell(n, i + 1).value = v; });
  put(2, { id: 'CONTOH-001', category: 'A', kbli: '01111', name: 'CONTOH - Tani jagung (hapus baris ini)', wages: 9_000_000, production: 30_000_000, operating: 500_000, nonOperating: 100_000, revenue: 36_000_000 });
  put(3, { id: 'CONTOH-002', category: 'G', kbli: '47111', name: 'CONTOH - Warung kelontong (hapus baris ini)', wages: 12_000_000, purchases: 60_000_000, operating: 4_000_000, revenue: 90_000_000 });
  for (const r of [2, 3]) ws.getRow(r).eachCell({ includeEmpty: true }, (c) => { c.fill = fill('FFF3F4F6'); c.font = { italic: true, color: { argb: 'FF6B7280' } }; });
  for (let r = 2; r <= 2001; r++) ws.getCell(r, 2).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${Object.keys(CATEGORY_RANGES).join(',')}"`] };
  styleHeader(ws);

  const guide = wb.addWorksheet('Petunjuk', { properties: { tabColor: { argb: 'FF0F766E' } } });
  guide.getColumn(1).width = 112;
  [
    'PETUNJUK PENGISIAN',
    '1. Isi sheet "Data" mulai baris 2, satu usaha per baris. Dua baris contoh berawalan "CONTOH" tidak diproses; hapus atau timpa.',
    '2. Kolom: ID Assessment, Kategori (huruf A sampai U), Kode KBLI (5 digit), Nama Usaha, 26a, 26b, 26c, 26d, 26e, 27a, 27b.',
    '3. Jika Kode KBLI valid, kategori mengikuti KBLI. Jika KBLI kosong atau tidak dikenal, kolom Kategori dipakai. Untuk kategori A, kolom Kategori boleh berisi nama sub-kategori (mis. Tanaman Pangan).',
    '4. Angka dalam rupiah untuk SETAHUN, tanpa teks. Kolom kosong dianggap 0. Angka hasil penyesuaian dibulatkan ke Rp1.000 (tiga angka terakhir 000) dan minimal Rp10.000. Rasio NTB = (27a - 26c - 26b - 26d) / (27a - 26c). 26a dan 26e tidak ikut dalam rasio NTB.',
    '5. Unggah berkas di aplikasi, pilih cara penyesuaian, lalu unduh hasilnya. Setelah diunggah, data belum diubah. Klik "Ubah semua data" agar angka 26b, 26d (dan 26c untuk kategori G) otomatis ditambah atau dikurangi sampai rasio NTB masuk rentang. 26a, 26e, 27a, dan 27b TIDAK pernah diubah oleh sistem. Klik satu baris untuk mengubahnya manual; baris itu tidak ikut diubah otomatis. Sheet Keterangan menjelaskan semua perubahan.',
    '',
    'CATATAN: penyesuaian otomatis hanyalah saran agar rasio NTB masuk rentang. Konfirmasikan ke responden sebelum mengubah data pendataan resmi.',
  ].forEach((t, i) => { const c = guide.getCell(i + 1, 1); c.value = t; c.alignment = { wrapText: true, vertical: 'top' }; if (i === 0 || i === 7) c.font = { bold: true }; });
  rangeSheet(wb);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

function rangeSheet(wb: import('exceljs').Workbook, data?: NtbData) {
  const rg = wb.addWorksheet('Rentang');
  rg.columns = [{ header: 'Lapangan usaha', width: 58 }, { header: 'Min', width: 10 }, { header: 'Maks', width: 10 }];
  styleHeader(rg);
  const title = (c: string) => data?.categories.find((x) => x.code === c)?.title;
  for (const [code, r] of Object.entries(CATEGORY_RANGES)) {
    rg.addRow([`Kategori ${code}${title(code) ? ' · ' + title(code) : ''}`, r?.[0] ?? '-', r?.[1] ?? '-']).font = { bold: true };
    if (code === 'A') for (const [n, v] of Object.entries(SUB_RANGES)) rg.addRow([`      ${n}`, v[0], v[1]]);
  }
  rg.eachRow((row, i) => { if (i > 1) { row.getCell(2).numFmt = '0%'; row.getCell(3).numFmt = '0%'; } });
}

const text = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    const o = v as { result?: unknown; richText?: { text: string }[]; text?: unknown };
    if (o.richText) return o.richText.map((t) => t.text).join('').trim();
    if (o.result !== undefined) return text(o.result);
    if (o.text !== undefined) return text(o.text);
    return '';
  }
  return String(v).trim();
};
const num = (v: unknown): number | null => {
  const t = text(v);
  if (!t) return null;
  if (typeof v === 'number') return v;
  const d = t.replace(/[^\d-]/g, '');
  return d && d !== '-' ? Number(d) : null;
};

/** Reads the template back. Throws a readable error when the file is not the template. */
export async function readTemplate(buf: ArrayBuffer): Promise<BatchRow[]> {
  const ExcelJS = await lib();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.getWorksheet('Data') ?? wb.worksheets[0];
  if (!ws || !text(ws.getCell(1, 3).value).toUpperCase().includes('KBLI')) throw new Error('Format berkas tidak sesuai template. Unduh template, isi sheet "Data", lalu unggah lagi.');
  const rows: BatchRow[] = [];
  ws.eachRow((row, i) => {
    if (i === 1) return;
    const v = (c: number) => row.getCell(c).value;
    const id = text(v(1));
    if (/^contoh/i.test(id) || /^contoh/i.test(text(v(4))) || COLS.every((_, k) => !text(v(k + 1)))) return;
    const digits = text(v(3)).replace(/\D/g, '');
    rows.push({
      id, category: text(v(2)), kbli: digits ? digits.padStart(5, '0') : '', name: text(v(4)),
      wages: num(v(5)), production: num(v(6)), purchases: num(v(7)), operating: num(v(8)), nonOperating: num(v(9)), revenue: num(v(10)), otherRevenue: num(v(11)),
    });
  });
  return rows;
}

export const STATE_LABEL = { in: 'Sudah dalam rentang', out: 'Di luar rentang (belum diubah)', adjusted: 'Disesuaikan otomatis', edited: 'Diubah manual', check: 'Perlu cek manual', skipped: 'Tidak dinilai' } as const;
const STATE_FILL = { in: 'FFDCFCE7', out: 'FFFECACA', adjusted: 'FFFEF3C7', edited: 'FFDBEAFE', check: 'FFFEE2E2', skipped: 'FFE5E7EB' } as const;
const cellValue = (v: string | number | null) => v ?? '';
const col = (n: number) => String.fromCharCode(64 + n);

export interface ResultMeta { fileName: string; mode: AdjustMode; date?: Date }

export async function buildResult(results: RowResult[], meta: ResultMeta, data?: NtbData): Promise<Uint8Array> {
  const ExcelJS = await lib();
  const wb = new ExcelJS.Workbook();
  const ws = dataSheet(wb, 'Hasil', results.length);
  const extra = ['Sub-kategori', 'Rentang NTB min', 'Rentang NTB maks', 'Rasio NTB awal', 'Rasio NTB akhir', 'Status', 'Rasio upah awal (26a / nilai tambah)', 'Rasio upah akhir', 'Keterangan', 'Peringatan lain', 'Total pendapatan (27a+27b)', 'Total pengeluaran (26a-26e)', 'Selisih (pendapatan - pengeluaran)'];
  extra.forEach((h, i) => { ws.getCell(1, N + 1 + i).value = h; ws.getColumn(N + 1 + i).width = i === 8 || i === 9 ? 70 : i >= 10 ? 20 : 15; });
  styleHeader(ws, N + extra.length);
  const orig = dataSheet(wb, 'Data Asli', results.length);
  const [cRev, cBuy, cPro, cOp] = [col(10), col(7), col(6), col(8)];

  results.forEach((r, i) => {
    const n = i + 2;
    const shown: BatchRow = { ...r.adjusted, category: r.category ?? r.adjusted.category };
    const vals = [...COLS.map((c) => cellValue(shown[c.key])), r.group ?? '', r.range?.[0] ?? '', r.range?.[1] ?? '', r.ratioBefore ?? '', '', STATE_LABEL[r.state], r.wageBefore ?? '', '', r.note, r.otherWarnings];
    vals.forEach((v, k) => { ws.getCell(n, k + 1).value = v; });
    COLS.forEach((c, k) => { orig.getCell(n, k + 1).value = cellValue(r.original[c.key]); });
    const ratioCell = ws.getCell(n, N + 5);
    ratioCell.value = r.ratioAfter === null ? '' : { formula: `IF(${cRev}${n}-${cBuy}${n}=0,"",(${cRev}${n}-${cBuy}${n}-${cPro}${n}-${cOp}${n})/(${cRev}${n}-${cBuy}${n}))`, result: r.ratioAfter };
    const va = `(${cRev}${n}-${cBuy}${n}-${cPro}${n}-${cOp}${n})`;
    ws.getCell(n, N + 8).value = r.wageRatio === null ? '' : { formula: `IF(${va}<=0,"",${col(5)}${n}/${va})`, result: r.wageRatio };
    for (const c of [N + 2, N + 3, N + 4, N + 5, N + 7, N + 8]) ws.getCell(n, c).numFmt = '0.00%';
    const inc = `J${n}+K${n}`;
    const exp = `E${n}+F${n}+G${n}+H${n}+I${n}`;
    const a = r.adjusted;
    const incV = (a.revenue ?? 0) + (a.otherRevenue ?? 0);
    const expV = (a.wages ?? 0) + (a.production ?? 0) + (a.purchases ?? 0) + (a.operating ?? 0) + (a.nonOperating ?? 0);
    ws.getCell(n, N + 11).value = { formula: inc, result: incV };
    ws.getCell(n, N + 12).value = { formula: exp, result: expV };
    ws.getCell(n, N + 13).value = { formula: `${inc}-(${exp})`, result: incV - expV };
    for (const c of [N + 11, N + 12, N + 13]) ws.getCell(n, c).numFmt = MONEY;
    if (incV - expV < 0) ws.getCell(n, N + 13).font = { bold: true, color: { argb: 'FFB91C1C' } };
    ws.getCell(n, N + 6).fill = fill(STATE_FILL[r.state]);
    ws.getCell(n, N + 9).alignment = { wrapText: true, vertical: 'top' };
    COLS.forEach((c, k) => {
      if (c.key === 'category' || r.adjusted[c.key] === r.original[c.key]) return;
      const cell = ws.getCell(n, k + 1);
      cell.fill = fill(r.source === 'manual' ? 'FFBFDBFE' : 'FFFDE68A');
      cell.note = `Angka awal: ${r.original[c.key] === null || r.original[c.key] === '' ? 'kosong' : typeof r.original[c.key] === 'number' ? Number(r.original[c.key]).toLocaleString('id-ID') : r.original[c.key]}`;
    });
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: N + extra.length } };
  styleHeader(orig);

  const s = summarize(results);
  const info = wb.addWorksheet('Keterangan', { properties: { tabColor: { argb: 'FFB45309' } } });
  info.getColumn(1).width = 34; info.getColumn(2).width = 100;
  const modeText = { auto: 'Otomatis: dipilih yang mengubah angka paling sedikit (26b+26d; untuk kategori G juga 26c atau ketiganya)', cost: 'Biaya produksi + operasional (26b, 26d) diubah', purchases: 'Pembelian barang (26c) diubah, hanya kategori G', scale: '26b, 26c, 26d diubah bersama secara proporsional, hanya kategori G' }[meta.mode];
  const lines: [string, string][] = [
    ['KETERANGAN HASIL PENGOLAHAN', ''],
    ['Berkas sumber', meta.fileName],
    ['Waktu pengolahan', (meta.date ?? new Date()).toLocaleString('id-ID')],
    ['Cara penyesuaian', modeText],
    ['Rasio upah', 'Hanya ditampilkan (26a / nilai tambah); 26a tidak diubah'],
    ['Tidak pernah diubah', '26a, 26e, 27a, dan 27b'],
    ['Rentang yang dipakai', 'Tabel "Range Rasio NTB Standar Menurut KBLI": per kategori, dan per sub-kategori untuk kategori A'],
    ['Aturan selisih', 'Penyesuaian otomatis menjaga total pendapatan (27a+27b) tidak lebih kecil dari total pengeluaran (26a sampai 26e), dan nilai tambah tidak negatif. Jika tidak mungkin dipenuhi tanpa mengubah 26a, 26e, atau kode 27, baris ditandai "Perlu cek manual"'],
    ['Pembulatan', 'Angka yang diubah sistem atau disimpan manual dibulatkan ke Rp1.000 terdekat, setengah ke atas (200.500 menjadi 201.000, 1.300.512 menjadi 1.301.000); hasil penyesuaian minimal Rp10.000'],
    ['', ''],
    ['Total baris', String(s.total)], ['Sudah dalam rentang (tidak diubah)', String(s.in)], ['Disesuaikan otomatis', String(s.adjusted)], ['Diubah manual (di form Data usaha)', String(s.edited)], ['Di luar rentang, belum diubah', String(s.out)], ['Perlu cek manual', String(s.check)], ['Tidak dinilai', String(s.skipped)],
    ['', ''],
    ['Sheet "Hasil"', 'Angka setelah pengolahan; sistem hanya mengubah 26b dan 26d (26c juga untuk kategori G). 26a, 26e, 27a, dan 27b tidak pernah diubah oleh sistem. Rasio akhir berupa rumus Excel sehingga bisa diperiksa ulang.'],
    ['Sheet "Data Asli"', 'Angka persis seperti yang Anda unggah.'],
    ['Warna kuning / biru', 'Sel yang diubah sistem / diubah manual. Arahkan kursor ke sel untuk melihat angka awal.'],
    ['Warna status', 'Hijau: sudah dalam rentang. Kuning: disesuaikan otomatis. Biru: diubah manual. Merah muda/merah: di luar rentang atau perlu cek manual. Abu: tidak dinilai.'],
    ['Rumus rasio NTB', '(27a - 26c - 26b - 26d) / (27a - 26c). Rasio upah = 26a / (27a - 26c - 26b - 26d). Keduanya berupa rumus Excel di sheet Hasil.'],
    ['', ''],
    ['PENTING', 'Angka berwarna kuning adalah SARAN otomatis agar rasio masuk rentang, bukan hasil pendataan. Konfirmasikan ke responden sebelum mengubah data resmi. Perubahan yang besar biasanya menandakan ada isian lain yang keliru.'],
  ];
  lines.forEach(([a, b], i) => { info.getCell(i + 1, 1).value = a; info.getCell(i + 1, 2).value = b; info.getCell(i + 1, 1).font = { bold: true }; info.getCell(i + 1, 2).alignment = { wrapText: true, vertical: 'top' }; });
  info.getCell(1, 1).font = { bold: true, size: 14 };
  info.getCell(lines.length, 2).fill = fill('FFFEF3C7');
  rangeSheet(wb, data);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}
