import { Injectable } from '@nestjs/common';

export interface ValidatedRow {
  rowNumber: number;
  data: {
    sku?: string;
    name?: string;
    description?: string;
    family?: string;
    subfamily?: string;
    stock?: number;
    stockMin?: number;
    basePrice?: number;
    discountPercent?: number;
    status?: string;
  };
  status: 'valid' | 'error' | 'duplicate';
  errors: string[];
}

@Injectable()
export class RowValidator {
  validateRow(
    rowNumber: number,
    rawData: Record<string, unknown>,
    mapping: Record<string, string>,
    existingSkus: Set<string>,
    seenSkus: Set<string>,
  ): ValidatedRow {
    const errors: string[] = [];

    const get = (field: string): string => {
      const header = mapping[field];
      if (!header) return '';
      return String(rawData[header] ?? '').trim();
    };

    const getNum = (field: string): number | undefined => {
      const val = get(field);
      if (!val) return undefined;
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    };

    // Extract mapped values
    const sku = get('sku').toUpperCase();
    const name = get('name');
    const description = get('description');
    const family = get('family');
    const subfamily = get('subfamily');
    const stock = getNum('stock');
    const stockMin = getNum('stockMin');
    const basePrice = getNum('basePrice');
    const discountPercent = getNum('discountPercent');
    const status = get('status');

    // Validate required fields
    if (!name) errors.push('Nombre es requerido');

    // Validate numbers
    if (basePrice !== undefined && basePrice < 0) errors.push('Precio no puede ser negativo');
    if (stock !== undefined && stock < 0) errors.push('Stock no puede ser negativo');
    if (discountPercent !== undefined && (discountPercent < 0 || discountPercent > 100)) {
      errors.push('Descuento debe estar entre 0 y 100');
    }

    // Check duplicates
    let rowStatus: 'valid' | 'error' | 'duplicate' = errors.length > 0 ? 'error' : 'valid';

    if (sku) {
      if (existingSkus.has(sku)) {
        rowStatus = 'duplicate';
        errors.push(`SKU "${sku}" ya existe en el sistema`);
      } else if (seenSkus.has(sku)) {
        rowStatus = 'duplicate';
        errors.push(`SKU "${sku}" duplicado en el archivo`);
      } else {
        seenSkus.add(sku);
      }
    }

    return {
      rowNumber,
      data: {
        sku: sku || undefined,
        name: name || undefined,
        description: description || undefined,
        family: family || 'General',
        subfamily: subfamily || undefined,
        stock: stock ?? 0,
        stockMin: stockMin ?? 0,
        basePrice: basePrice ?? 0,
        discountPercent: discountPercent ?? 0,
        status: status || 'active',
      },
      status: rowStatus,
      errors,
    };
  }
}
