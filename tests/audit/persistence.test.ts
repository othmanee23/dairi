import assert from 'node:assert/strict';
import test from 'node:test';
import { GUEST_ORDER_SESSION_TTL_MS, readGuestOrder, serializeGuestOrder, serializePersistedState } from '../../src/app/context/persistence.ts';

const privateOrder = {
  id: 'DAI-123', createdAt: '2026-10-24T10:00:00Z',
  customer: { name: 'Test Customer', email: 'customer@example.test', address: '1 Test Street', city: 'Test City', region: 'CA', postalCode: '90000', country: 'US' },
  items: [{ productId: 'p1', variantId: 'v1', quantity: 1, size: 'M', color: 'Black', sku: 'SKU-1' }],
  total: 50, subtotal: 50, discount: 0, shipping: 0, tax: 0, status: 'pending',
};

test('general persisted state omits orders and contact queues and strips wholesale prices', () => {
  const raw = serializePersistedState({
    products: [{ id: 'p1', variants: [{ id: 'v1', wholesalePrice: 12, inventoryQuantity: 3 }] }],
    collections: [], lookbooks: [], cart: [], wishlist: [], settings: {},
    orders: [privateOrder], subscribers: ['subscriber@example.test'],
    supportRequests: [{ email: 'support@example.test', message: 'private', createdAt: 'now' }],
  });
  assert.doesNotMatch(raw, /customer@example\.test|Test Customer|Test Street|subscriber@example\.test|support@example\.test|wholesalePrice/);
  assert.deepEqual(JSON.parse(raw).products[0].variants[0], { id: 'v1', inventoryQuantity: 3 });
  assert.deepEqual(Object.keys(JSON.parse(raw)).sort(), ['cart', 'collections', 'lookbooks', 'products', 'settings', 'wishlist']);
});

test('guest confirmation session summary omits PII and expires after one hour', () => {
  const now = 1_800_000_000_000;
  const raw = serializeGuestOrder(privateOrder, now);
  assert.doesNotMatch(raw, /customer|customer@example\.test|Test Customer|Test Street|Test City|90000/);
  const restored = readGuestOrder(raw, now + GUEST_ORDER_SESSION_TTL_MS - 1);
  assert.equal(restored?.id, 'DAI-123');
  assert.equal(restored?.customer.email, '');
  assert.equal(readGuestOrder(raw, now + GUEST_ORDER_SESSION_TTL_MS), null);
});

test('malformed session values are ignored', () => {
  assert.equal(readGuestOrder('{bad'), null);
  assert.equal(readGuestOrder(JSON.stringify({ id: 'DAI-1', expiresAt: Date.now() + 5000 })), null);
});
