import test from 'node:test';
import assert from 'node:assert/strict';
import { clearCheckoutIdempotencyKey, clearCheckoutIdempotencyStorage, getCheckoutIdempotencyKey } from '../../src/app/context/checkoutIdempotency.ts';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

test('checkout retries reuse a key without storing contact or address fields', async () => {
  const storage = memoryStorage();
  const intent = { customer: { name: 'Test Customer', email: 'customer@example.test', address: '123 Test Street' }, items: [{ variantId: 'variant-1', quantity: 1 }], accountId: null };
  const first = await getCheckoutIdempotencyKey(intent, storage);
  const retry = await getCheckoutIdempotencyKey(intent, storage);
  assert.equal(first, retry);
  const stored = [...storage.values.values()][0];
  assert.match(stored, /fingerprint/);
  assert.doesNotMatch(stored, /customer@example\.test|123 Test Street|Test Customer/);
});

test('a changed checkout intent gets a new key and success clears its saved retry key', async () => {
  const storage = memoryStorage();
  const firstIntent = { email: 'one@example.test', quantity: 1 };
  const secondIntent = { email: 'one@example.test', quantity: 2 };
  const first = await getCheckoutIdempotencyKey(firstIntent, storage);
  const second = await getCheckoutIdempotencyKey(secondIntent, storage);
  assert.notEqual(first, second);
  await clearCheckoutIdempotencyKey(secondIntent, storage);
  assert.equal(storage.values.size, 0);
  assert.equal(await getCheckoutIdempotencyKey(firstIntent, storage), first);
});

test('sign-out cleanup clears the retry key and in-memory cache', async () => {
  const storage = memoryStorage();
  const intent = { email: 'logout@example.test', quantity: 1 };
  const first = await getCheckoutIdempotencyKey(intent, storage);
  clearCheckoutIdempotencyStorage(storage);
  assert.equal(storage.values.size, 0);
  assert.notEqual(await getCheckoutIdempotencyKey(intent, storage), first);
});
