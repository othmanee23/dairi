import type { Product } from '../../types';

export type DairiLineSheetPage = { title: string; products: Product[] };
export type DairiPriceListGroup = { pageNumber: number; products: Product[] };

export function chunkCatalogProducts<T>(products: T[], perPage: number): T[][] {
  if (!Number.isInteger(perPage) || perPage < 1) throw new RangeError('Products per page must be a positive integer');
  const pages: T[][] = [];
  for (let index = 0; index < products.length; index += perPage) pages.push(products.slice(index, index + perPage));
  return pages;
}

export function hasDairiImageSource(source: string | null | undefined): boolean {
  return typeof source === 'string' && source.trim().length > 0;
}

/** Preserve the selected product order while keeping each color together. */
export function buildDairiLineSheetPages(products: Product[]): DairiLineSheetPage[] {
  const groups = new Map<string, Product[]>();
  for (const product of products) {
    const title = product.color?.trim() || product.collection?.trim() || 'DAIRI COLLECTION';
    groups.set(title, [...(groups.get(title) ?? []), product]);
  }

  return [...groups.entries()].flatMap(([title, group]) => {
    const pages: DairiLineSheetPage[] = [];
    for (let index = 0; index < group.length; index += 9) {
      pages.push({ title, products: group.slice(index, index + 9) });
    }
    return pages;
  });
}

/** Two full-width product-page price blocks fit on each appendix sheet. */
export function splitPriceListPages(pages: DairiLineSheetPage[]): DairiPriceListGroup[][] {
  const groups = pages.map((page, index) => ({ pageNumber: index + 1, products: page.products }));
  const result: DairiPriceListGroup[][] = [];
  for (let index = 0; index < groups.length; index += 2) result.push(groups.slice(index, index + 2));
  return result;
}

export function formatDairiPrice(price: number | null | undefined): string {
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) return 'Price unavailable';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(price) ? 0 : 2, maximumFractionDigits: 2 }).format(price);
}
