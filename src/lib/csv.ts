import { saveAs } from 'file-saver';
import Papa from 'papaparse';

export function exportCsv<T extends Record<string, unknown>>(rows: T[], filename: string): void {
  const csv = Papa.unparse(rows);
  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
}

