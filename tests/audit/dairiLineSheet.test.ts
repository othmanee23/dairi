import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDairiLineSheetPages, chunkCatalogProducts, formatDairiPrice, hasDairiImageSource, splitPriceListPages } from '../../src/app/pages/lookbooks/dairiLineSheet.ts';

function product(id: number, color: string, price = 42) {
  return { id: String(id), name: `Style ${id}`, color, collection: 'Fall', price, images: [], variants: [], category: 'Sets', description: '', tags: [], status: 'published' as const, showOnWebsite: true, createdAt: '2026-01-01' };
}

test('line sheet groups colors in first-seen order and places at most nine styles per page', () => {
  const pages = buildDairiLineSheetPages([
    ...Array.from({ length: 10 }, (_, index) => product(index, 'Electric blue')),
    product(10, 'Garnet'),
  ]);
  assert.deepEqual(pages.map(page => [page.title, page.products.length]), [['Electric blue', 9], ['Electric blue', 1], ['Garnet', 1]]);
});

test('price appendix maps each product page and paginates after twelve blocks', () => {
  const products = Array.from({ length: 109 }, (_, index) => product(index, 'Teal'));
  const catalogPages = buildDairiLineSheetPages(products);
  const pricePages = splitPriceListPages(catalogPages);
  assert.equal(catalogPages.length, 13);
  assert.deepEqual(pricePages.map(page => page.length), [12, 1]);
  assert.equal(pricePages[0][0].products[0].price, products[0].price);
  assert.equal(pricePages[1][0].pageNumber, 13);
});

test('line sheet prices are formatted dynamically in US dollars', () => {
  assert.equal(formatDairiPrice(42), '$42');
  assert.equal(formatDairiPrice(42.5), '$42.50');
  assert.equal(formatDairiPrice(42.567), '$42.57');
  assert.equal(formatDairiPrice(undefined), 'Price unavailable');
  assert.equal(formatDairiPrice(Number.NaN), 'Price unavailable');
  assert.equal(formatDairiPrice(-1), 'Price unavailable');
});

test('standard catalogs omit product sheets for zero products and paginate exact boundaries', () => {
  assert.deepEqual(chunkCatalogProducts([], 9), []);
  assert.deepEqual(chunkCatalogProducts(['a'], 9), [['a']]);
  assert.deepEqual(chunkCatalogProducts(Array.from({ length: 9 }, (_, i) => i), 9).map(page => page.length), [9]);
  assert.deepEqual(chunkCatalogProducts(Array.from({ length: 10 }, (_, i) => i), 9).map(page => page.length), [9, 1]);
  assert.throws(() => chunkCatalogProducts([], 0), RangeError);
});

test('DAIRI print image source check rejects empty fixture URLs', () => {
  assert.equal(hasDairiImageSource(undefined), false);
  assert.equal(hasDairiImageSource('   '), false);
  assert.equal(hasDairiImageSource('data:image/svg+xml;base64,PHN2Zz4='), true);
});
