import { describe, expect, it } from 'vitest';
import data from '@/data/ntb-data.json';
import { buildResult, buildTemplate, COLS, readTemplate } from './excel';
import { adjustAllItems, evaluate, newItem } from './batch';
import type { NtbData } from '@/types/ntb';

const d = data as unknown as NtbData;
const buf = (u: Uint8Array) => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;

describe('excel round trip', () => {
  it('template has exactly the requested columns and ignores its example rows', async () => {
    const t = await buildTemplate();
    expect(COLS.map((c) => c.header.split(' ')[0] + (c.header.startsWith('26') || c.header.startsWith('27') ? '' : ' ' + c.header.split(' ').slice(1).join(' ')))).toEqual(['ID Assessment', 'Kategori ', 'Kode KBLI', 'Nama Usaha', '26a', '26b', '26c', '26d', '26e', '27a', '27b']);
    expect(await readTemplate(buf(t))).toEqual([]);
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf(t));
    expect(String(wb.getWorksheet('Data')!.getCell(2, 1).value)).toBe('CONTOH-001');
    expect(wb.getWorksheet('Data')!.getCell(2, 10).value).toBe(36_000_000);
  });

  it('result keeps the original, highlights changes and explains them', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf(await buildTemplate()));
    const ws = wb.getWorksheet('Data')!;
    [['ID-1', 'A', '01111', 'Tani A', 9e6, 30e6, null, 5e5, 1e5, 36e6, null], ['ID-2', 'A', '01111', 'Tani B', 9e6, 10e6, null, 5e5, null, 36e6, null]]
      .forEach((r, i) => r.forEach((v, j) => { ws.getCell(i + 2, j + 1).value = v as string | number | null; }));
    const rows = await readTemplate(buf(new Uint8Array(await wb.xlsx.writeBuffer())));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'ID-1', category: 'A', kbli: '01111', production: 30e6, revenue: 36e6 });

    // Upload first: the table shows the file as it is. Then "Ubah semua data".
    const uploaded = rows.map(newItem);
    expect(uploaded.map((it) => evaluate(it, d).state)).toEqual(['out', 'in']);
    const res = adjustAllItems(uploaded, d, 'cost').map((it) => evaluate(it, d));
    const out = new ExcelJS.Workbook();
    await out.xlsx.load(buf(await buildResult(res, { fileName: 'uji.xlsx', mode: 'cost' }, d)));
    expect(out.worksheets.map((s) => s.name)).toEqual(['Hasil', 'Data Asli', 'Keterangan', 'Rentang']);
    const h = out.getWorksheet('Hasil')!;
    expect(Number(h.getCell(2, 6).value)).toBeLessThan(30e6);
    expect(Number(h.getCell(2, 10).value)).toBe(36e6);
    expect(Number(h.getCell(2, 9).value)).toBe(1e5);
    expect(Number(h.getCell(2, 5).value)).toBe(9e6);
    expect(h.getCell(2, 9).note).toBeFalsy();
    expect(h.getCell(2, 6).note).toBeTruthy();
    expect(h.getCell(3, 6).note).toBeFalsy();
    expect(String(h.getCell(2, 20).value)).toMatch(/diturunkan/);
    const f = h.getCell(2, 16).value as { formula: string; result: number };
    expect(f.formula).toContain('J2');
    expect(f.result).toBeGreaterThanOrEqual(0.61);
    expect(Number(out.getWorksheet('Data Asli')!.getCell(2, 10).value)).toBe(36e6);
    expect(String(out.getWorksheet('Keterangan')!.getCell(2, 2).value)).toBe('uji.xlsx');
  });

  it('rejects a file that is not the template', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook(); wb.addWorksheet('x').getCell(1, 1).value = 'halo';
    await expect(readTemplate(buf(new Uint8Array(await wb.xlsx.writeBuffer())))).rejects.toThrow(/template/);
  });
});
