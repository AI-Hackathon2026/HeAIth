import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { IKnhanesAdapter, IKnhanesAdapterFilters, IKnhanesMetricResult } from "../../application/port/I.knhanes.adapter";

/** The 2024 국민건강통계 Excel tables bundled with the app. */
const DATA_DIR = path.join(process.cwd(), "data", "knhanes");

export class KnhanesAdapter implements IKnhanesAdapter {
  async listAvailableFiles(): Promise<string[]> {
    if (!fs.existsSync(DATA_DIR)) return [];
    const files = await fs.promises.readdir(DATA_DIR);
    return files.filter((f) => f.toLowerCase().endsWith(".xlsx") || f.toLowerCase().endsWith(".xls"));
  }

  /**
   * Heuristic reader:
   * - opens workbook
   * - skips sheets named containing '추이'
   * - searches for a column that contains '24' or 24 in header rows
   * - finds a row matching metric text and optional filters
   */
  async getMetricValue(fileName: string, metric: string, filters?: IKnhanesAdapterFilters): Promise<IKnhanesMetricResult | null> {
    // Only bare Excel filenames inside DATA_DIR; rejects "../" traversal.
    if (path.basename(fileName) !== fileName || !/\.xlsx?$/i.test(fileName)) return null;
    const fullPath = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(fullPath)) return null;

    const wb = XLSX.read(await fs.promises.readFile(fullPath), { cellDates: true });
    for (const sheetName of wb.SheetNames) {
      if (sheetName.includes("추이")) continue;
      const sheet = wb.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

      // find column index for 24
      let colIndex: number | undefined;
      for (let r = 0; r < Math.min(10, rows.length); r++) {
        const row = rows[r] || [];
        for (let c = 0; c < row.length; c++) {
          const cell = row[c];
          if (cell === 24 || cell === "24" || (typeof cell === 'string' && cell.trim().includes("24"))) {
            colIndex = c;
            break;
          }
          // sometimes year is in format '2024' or '’24'
          if (typeof cell === 'number' && cell === 2024) {
            colIndex = c;
            break;
          }
          if (typeof cell === 'string' && /2024|’24|\b24\b/.test(cell)) {
            colIndex = c;
            break;
          }
        }
        if (colIndex !== undefined) break;
      }

      if (colIndex === undefined) {
        // try to locate a column header that contains '24' as substring anywhere in sheet (scan rows)
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r] || [];
          for (let c = 0; c < row.length; c++) {
            const cell = row[c];
            if (cell && String(cell).includes("24")) {
              colIndex = c;
              break;
            }
          }
          if (colIndex !== undefined) break;
        }
      }

      // find best matching row for metric + filters
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r] || [];
        const rowText = row.map((c) => (c === undefined || c === null ? "" : String(c))).join(" ").toLowerCase();
        const metricLower = metric.toLowerCase();
        const metricMatches = rowText.includes(metricLower) || row.some((c) => String(c).toLowerCase() === metricLower);

        let filtersMatch = true;
        if (filters) {
          if (filters.sex) filtersMatch = filtersMatch && rowText.includes(String(filters.sex).toLowerCase());
          if (filters.age) filtersMatch = filtersMatch && rowText.includes(String(filters.age).toLowerCase());
          if (filters.income) filtersMatch = filtersMatch && rowText.includes(String(filters.income).toLowerCase());
        }

        if (metricMatches && filtersMatch) {
          const raw = row[colIndex ?? row.length - 1];
          const value = this._parseNumber(raw);
          return {
            value,
            raw,
            file: fileName,
            sheet: sheetName,
            rowIndex: r,
            colIndex: colIndex,
          };
        }
      }
    }

    return null;
  }

  private _parseNumber(v: any): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number(v);
    const s = String(v).replace(/[,\s%]+/g, "");
    const n = Number(s);
    if (Number.isFinite(n)) return n;
    return null;
  }
}

export default KnhanesAdapter;
