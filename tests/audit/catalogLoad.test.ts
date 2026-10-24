import assert from 'node:assert/strict';
import test from 'node:test';
import { getCatalogLoadError, hasDemoProducts } from '../../src/app/context/catalogLoad.ts';

test('catalog query failures produce an actionable generic error without exposing backend details', () => {
  assert.equal(getCatalogLoadError([
    { label: 'products', error: null },
    { label: 'product variants', error: { message: 'internal database detail' } },
  ]), 'Could not load product variants.');
  assert.equal(getCatalogLoadError([{ label: 'products', error: null }]), null);
});

test('seed catalog identifiers remain visibly labeled as preview content', () => {
  assert.equal(hasDemoProducts([{ style_number: null }, { style_number: 'DEMO-1' }]), true);
  assert.equal(hasDemoProducts([{ style_number: 'DAIRI-001' }]), false);
});
