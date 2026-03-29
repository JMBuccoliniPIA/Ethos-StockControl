import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

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
  async parse(buffer: Buffer): Promise<ParsedSheet> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount === 0) {
      throw new Error('El archivo no contiene datos');
    }

    // Extract headers from first row
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value ?? '').trim();
    });

    // Parse data rows
    const rows: Record<string, unknown>[] = [];
    for (let i = 2; i <= worksheet.rowCount; i++) {
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
