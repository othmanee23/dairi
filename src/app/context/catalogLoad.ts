export type CatalogLoadStatus = 'demo' | 'loading' | 'ready' | 'error';

export function getCatalogLoadError(results: Array<{ label: string; error: unknown }>): string | null {
  const failed = results.find(result => result.error);
  return failed ? `Could not load ${failed.label}.` : null;
}

export function hasDemoProducts(products: Array<{ style_number: string | null }>): boolean {
  return products.some(product => product.style_number?.startsWith('DEMO-'));
}
