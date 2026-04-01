import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

// Map common Spanish/English header variations to our field names
const HEADER_ALIASES: Record<string, string[]> = {
  sku: ['sku', 'codigo', 'código', 'cod', 'code', 'art', 'articulo', 'artículo', 'ref', 'referencia'],
  name: ['nombre', 'name', 'producto', 'product', 'descripcion', 'descripción', 'desc', 'item'],
  description: ['detalle', 'detail', 'observaciones', 'obs', 'notas', 'notes'],
  family: ['familia', 'family', 'categoria', 'categoría', 'category', 'rubro', 'grupo', 'group'],
  subfamily: ['subfamilia', 'subfamily', 'subcategoria', 'subcategoría', 'subcategory', 'subrubro', 'subgrupo', 'subgroup', 'tipo', 'type'],
  stock: ['stock', 'cantidad', 'qty', 'quantity', 'existencia', 'inventario', 'unidades', 'units'],
  stockMin: ['stock_min', 'stockmin', 'stock_minimo', 'stock_minimó', 'stock_mínimo', 'minimo', 'mínimo', 'punto_reorden'],
  basePrice: ['precio', 'price', 'precio_base', 'costo', 'cost', 'valor', 'value', 'precio_unitario', 'p_unitario', 'punitario'],
  discountPercent: ['descuento', 'discount', 'dto', 'desc_%', 'descuento_%', 'discount_%'],
  status: ['estado', 'status', 'activo', 'active'],
};

@Injectable()
export class ExcelParser {
  /**
   * Get all sheet names from an Excel file
   */
  async getSheetNames(buffer: Buffer): Promise<string[]> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      return workbook.worksheets.map((ws) => ws.name);
    } catch {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      return workbook.SheetNames;
    }
  }

  async parse(buffer: Buffer, sheetName?: string): Promise<ParsedSheet> {
    // Try ExcelJS first (.xlsx), fall back to SheetJS (.xls)
    try {
      return await this.parseWithExcelJS(buffer, sheetName);
    } catch {
      return this.parseWithSheetJS(buffer, sheetName);
    }
  }

  private async parseWithExcelJS(buffer: Buffer, sheetName?: string): Promise<ParsedSheet> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = sheetName
      ? workbook.getWorksheet(sheetName)
      : workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount === 0) {
      throw new Error('El archivo no contiene datos');
    }

    // Auto-detect header row: first row with 2+ non-empty cells
    const headerRowIndex = this.detectHeaderRow(worksheet);

    const headerRow = worksheet.getRow(headerRowIndex);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value ?? '').trim();
    });

    // Parse data rows (start after header row)
    const rows: Record<string, unknown>[] = [];
    for (let i = headerRowIndex + 1; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const rowData: Record<string, unknown> = {};
      let hasData = false;

      headers.forEach((header, index) => {
        if (!header) return;
        const cell = row.getCell(index + 1);
        let value = cell.value;

        // Handle ExcelJS rich text and formula results
        if (value && typeof value === 'object') {
          if ('result' in value) value = (value as any).result;
          else if ('richText' in value) {
            value = (value as any).richText.map((t: any) => t.text).join('');
          }
        }

        if (value !== null && value !== undefined && String(value).trim() !== '') {
          hasData = true;
        }
        rowData[header] = value;
      });

      if (hasData) {
        rows.push(rowData);
      }
    }

    return { headers, rows, totalRows: rows.length };
  }

  private parseWithSheetJS(buffer: Buffer, targetSheet?: string): ParsedSheet {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = targetSheet || workbook.SheetNames[0];
    if (!sheetName || !workbook.Sheets[sheetName]) {
      throw new Error('El archivo no contiene datos');
    }

    const worksheet = workbook.Sheets[sheetName];
    const raw: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
    });

    if (raw.length === 0) {
      throw new Error('El archivo no contiene datos');
    }

    // Auto-detect header row: first row with 2+ non-empty cells
    let headerIdx = 0;
    for (let i = 0; i < Math.min(raw.length, 10); i++) {
      const nonEmpty = raw[i].filter(
        (c) => c !== null && c !== undefined && String(c).trim() !== '',
      ).length;
      if (nonEmpty >= 2) {
        headerIdx = i;
        break;
      }
    }

    const headers = raw[headerIdx].map((c) => String(c ?? '').trim());

    const rows: Record<string, unknown>[] = [];
    for (let i = headerIdx + 1; i < raw.length; i++) {
      const rowData: Record<string, unknown> = {};
      let hasData = false;

      headers.forEach((header, index) => {
        if (!header) return;
        const value = raw[i]?.[index] ?? null;
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          hasData = true;
        }
        rowData[header] = value;
      });

      if (hasData) {
        rows.push(rowData);
      }
    }

    return { headers, rows, totalRows: rows.length };
  }

  /**
   * Find the header row by looking for the first row with 2+ non-empty text cells.
   * Skips title/subtitle rows that typically have only 1 cell (e.g. company name, date).
   */
  private detectHeaderRow(worksheet: ExcelJS.Worksheet): number {
    const maxScan = Math.min(worksheet.rowCount, 10);
    for (let i = 1; i <= maxScan; i++) {
      const row = worksheet.getRow(i);
      let nonEmptyCells = 0;
      row.eachCell({ includeEmpty: false }, (cell) => {
        const val = String(cell.value ?? '').trim();
        if (val) nonEmptyCells++;
      });
      if (nonEmptyCells >= 2) return i;
    }
    return 1;
  }

  autoDetectMapping(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    const usedHeaders = new Set<string>();

    for (const header of headers) {
      const normalized = header
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      // Collect all matching fields with their best match length
      const matches: Array<{ field: string; score: number }> = [];

      for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
        if (mapping[field]) continue; // field already mapped

        for (const alias of aliases) {
          if (normalized === alias) {
            matches.push({ field, score: alias.length + 1000 }); // exact match = highest priority
            break;
          } else if (normalized.includes(alias)) {
            matches.push({ field, score: alias.length });
            break;
          }
        }
      }

      // Pick the match with the longest alias (most specific)
      if (matches.length > 0) {
        matches.sort((a, b) => b.score - a.score);
        const best = matches[0];
        mapping[best.field] = header;
        usedHeaders.add(header);
      }
    }

    return mapping;
  }
}
