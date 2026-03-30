import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UnifiedProduct, UnifiedProductDocument } from './schemas/unified-product.schema';
import { SupplierProduct, SupplierProductDocument } from '../supplier-products/schemas/supplier-product.schema';

export interface MappingSuggestion {
  supplierProduct: SupplierProductDocument;
  suggestions: Array<{
    unifiedProduct: UnifiedProductDocument;
    score: number;
    matchType: 'exact_sku' | 'similar_name' | 'partial_match';
  }>;
}

@Injectable()
export class MappingSuggesterService {
  constructor(
    @InjectModel(UnifiedProduct.name)
    private unifiedProductModel: Model<UnifiedProductDocument>,
    @InjectModel(SupplierProduct.name)
    private supplierProductModel: Model<SupplierProductDocument>,
  ) {}

  /**
   * Get unmapped supplier products with mapping suggestions
   */
  async getSuggestionsForUnmapped(
    supplierId?: string,
    limit = 50,
  ): Promise<MappingSuggestion[]> {
    // Find supplier products without unified product mapping
    const filter: any = { unifiedProductId: null };
    if (supplierId) {
      filter.supplierId = supplierId;
    }

    const unmappedProducts = await this.supplierProductModel
      .find(filter)
      .populate('supplierId', 'name')
      .limit(limit);

    // Get all unified products for matching
    const unifiedProducts = await this.unifiedProductModel.find({
      status: 'active',
    });

    // Generate suggestions for each unmapped product
    const results: MappingSuggestion[] = [];

    for (const supplierProduct of unmappedProducts) {
      const suggestions = this.findMatches(supplierProduct, unifiedProducts);
      results.push({
        supplierProduct,
        suggestions: suggestions.slice(0, 5), // Top 5 suggestions
      });
    }

    return results;
  }

  /**
   * Get suggestions for a specific supplier product
   */
  async getSuggestionsForProduct(
    supplierProductId: string,
  ): Promise<MappingSuggestion['suggestions']> {
    const supplierProduct = await this.supplierProductModel.findById(supplierProductId);
    if (!supplierProduct) {
      return [];
    }

    const unifiedProducts = await this.unifiedProductModel.find({
      status: 'active',
    });

    return this.findMatches(supplierProduct, unifiedProducts).slice(0, 10);
  }

  /**
   * Find matching unified products for a supplier product
   */
  private findMatches(
    supplierProduct: SupplierProductDocument,
    unifiedProducts: UnifiedProductDocument[],
  ): MappingSuggestion['suggestions'] {
    const matches: MappingSuggestion['suggestions'] = [];

    const supplierSku = this.normalize(supplierProduct.supplierSku);
    const supplierName = this.normalize(supplierProduct.supplierName);
    const supplierNameWords = this.extractWords(supplierName);

    for (const unified of unifiedProducts) {
      const unifiedSku = this.normalize(unified.sku);
      const unifiedName = this.normalize(unified.name);
      const unifiedNameWords = this.extractWords(unifiedName);

      let score = 0;
      let matchType: MappingSuggestion['suggestions'][0]['matchType'] = 'partial_match';

      // Exact SKU match (highest priority)
      if (supplierSku === unifiedSku) {
        score = 100;
        matchType = 'exact_sku';
      }
      // SKU contained in the other
      else if (supplierSku.includes(unifiedSku) || unifiedSku.includes(supplierSku)) {
        score = Math.max(score, 70);
        matchType = 'partial_match';
      }

      // Name similarity
      const nameSimilarity = this.calculateNameSimilarity(
        supplierName,
        unifiedName,
        supplierNameWords,
        unifiedNameWords,
      );

      if (nameSimilarity > score) {
        score = nameSimilarity;
        matchType = nameSimilarity >= 80 ? 'similar_name' : 'partial_match';
      }

      // Only include matches with reasonable score
      if (score >= 30) {
        matches.push({
          unifiedProduct: unified,
          score: Math.round(score),
          matchType,
        });
      }
    }

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate name similarity between two strings
   */
  private calculateNameSimilarity(
    name1: string,
    name2: string,
    words1: string[],
    words2: string[],
  ): number {
    // Exact match
    if (name1 === name2) {
      return 95;
    }

    // One contains the other
    if (name1.includes(name2) || name2.includes(name1)) {
      const longerLen = Math.max(name1.length, name2.length);
      const shorterLen = Math.min(name1.length, name2.length);
      return 60 + (shorterLen / longerLen) * 30;
    }

    // Word overlap
    const commonWords = words1.filter((w) => words2.includes(w));
    if (commonWords.length === 0) {
      return 0;
    }

    const totalUniqueWords = new Set([...words1, ...words2]).size;
    const overlapRatio = commonWords.length / totalUniqueWords;

    // Bonus for matching significant words (longer words)
    const significantCommon = commonWords.filter((w) => w.length > 3);
    const significantBonus = significantCommon.length * 5;

    return Math.min(90, overlapRatio * 70 + significantBonus);
  }

  /**
   * Normalize string for comparison
   */
  private normalize(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract meaningful words from a string
   */
  private extractWords(str: string): string[] {
    return str
      .split(' ')
      .filter((w) => w.length > 1) // Ignore single chars
      .filter((w) => !['de', 'la', 'el', 'en', 'y', 'o', 'con', 'para', 'x'].includes(w));
  }

  /**
   * Auto-map supplier products by exact SKU match
   */
  async autoMapByExactSku(
    supplierId?: string,
  ): Promise<{ mapped: number; skipped: number }> {
    const filter: any = { unifiedProductId: null };
    if (supplierId) {
      filter.supplierId = supplierId;
    }

    const unmapped = await this.supplierProductModel.find(filter);
    let mapped = 0;
    let skipped = 0;

    for (const sp of unmapped) {
      const normalizedSku = sp.supplierSku.toUpperCase().trim();
      const unified = await this.unifiedProductModel.findOne({ sku: normalizedSku });

      if (unified) {
        sp.unifiedProductId = unified._id;
        await sp.save();
        mapped++;
      } else {
        skipped++;
      }
    }

    return { mapped, skipped };
  }

  /**
   * Create unified products from unmapped supplier products
   */
  async createUnifiedFromUnmapped(
    supplierProductIds: string[],
    defaultMargin = 30,
    userId?: string,
  ): Promise<UnifiedProductDocument[]> {
    const created: UnifiedProductDocument[] = [];

    for (const spId of supplierProductIds) {
      const sp = await this.supplierProductModel.findById(spId);
      if (!sp || sp.unifiedProductId) continue;

      // Check if SKU already exists
      const existingSku = await this.unifiedProductModel.findOne({
        sku: sp.supplierSku.toUpperCase(),
      });
      if (existingSku) continue;

      const unified = new this.unifiedProductModel({
        sku: sp.supplierSku.toUpperCase(),
        name: sp.supplierName,
        description: sp.supplierDescription,
        selectedSupplierProductId: sp._id,
        selectedCost: sp.netCost,
        profitMarginPercent: defaultMargin,
        createdBy: userId,
      });

      await unified.save();
      sp.unifiedProductId = unified._id;
      await sp.save();

      created.push(unified);
    }

    return created;
  }
}
