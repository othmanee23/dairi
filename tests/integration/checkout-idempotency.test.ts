import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const enabled = process.env.DAIRI_TEST_DB_DISPOSABLE === 'true';

test('checkout transaction replays safely under retries, parallel requests and inventory contention', { skip: !enabled }, async () => {
  const url = process.env.DAIRI_TEST_SUPABASE_URL ?? '';
  const serviceKey = process.env.DAIRI_TEST_SUPABASE_SERVICE_ROLE_KEY ?? '';
  const host = new URL(url).hostname;
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(host), 'integration tests may only target a local database');
  assert.ok(serviceKey, 'a disposable local service-role key is required');

  const baseClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  let simulateLostResponse = false;
  const lossyClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: {
      fetch: async (input, init) => {
        const response = await fetch(input, init);
        if (simulateLostResponse && String(input).includes('/rpc/submit_unpaid_order')) {
          simulateLostResponse = false;
          throw new Error('Simulated network timeout after the database response was committed.');
        }
        return response;
      },
    },
  });

  const suffix = crypto.randomUUID();
  const productId = `idempotency-test-${suffix}`;
  const variantId = crypto.randomUUID();
  const contentionVariantId = crypto.randomUUID();
  const email = `checkout-${suffix}@example.test`;
  const keyParallel = crypto.randomUUID();
  const keyLostResponse = crypto.randomUUID();
  const keyNewIntent = crypto.randomUUID();
  const keyFailureRetry = crypto.randomUUID();
  const keyContentionA = crypto.randomUUID();
  const keyContentionB = crypto.randomUUID();
  const rateSubject = `rate-${suffix}@example.test`;
  const rateSubjectHash = createHash('sha256').update(rateSubject.toLowerCase()).digest('hex');
  const orderNumbers = new Set<string>();

  const customer = { name: 'Local Checkout Test', email, address: '1 Test Street', city: 'Test City', region: 'CA', postalCode: '90000', country: 'US' };
  const item = (quantity: number, variant = variantId) => ({ productId, variantId: variant, size: variant === variantId ? 'M' : 'L', color: 'Blue', quantity, unitPrice: 0.01 });
  const submit = async (key: string, items: ReturnType<typeof item>[], client = baseClient) => {
    const result = await client.rpc('submit_unpaid_order', { p_customer: customer, p_items: items, p_user_id: null, p_idempotency_key: key });
    if (result.data?.id) orderNumbers.add(String(result.data.id));
    return result;
  };

  try {
    const { data: rateResetRows, error: rateResetError } = await baseClient.from('public_action_rate_limits').delete().eq('action', 'subscribe').eq('subject_hash', rateSubjectHash).select('action');
    assert.ifError(rateResetError);
    assert.equal(rateResetRows?.length ?? 0, 0, 'unique local test identity has no prior limiter state');
    const rateResults: (boolean | null)[] = [];
    for (let index = 0; index < 6; index++) {
      const check = await baseClient.rpc('consume_public_action_limit', { p_action: 'subscribe', p_subject: rateSubject });
      assert.ifError(check.error);
      rateResults.push(check.data);
    }
    assert.deepEqual(rateResults, [true, true, true, true, true, false], 'the sixth request exceeds the configured action window');

    const { error: productError } = await baseClient.from('products').insert({ id: productId, style_number: `TEST-${suffix}`, name: 'Disposable Idempotency Test', price: 50, images: [], category: 'Test', collection: 'Disposable Test', description: '', tags: [], status: 'published', show_on_website: true, sizes: ['M'] });
    if (productError) throw productError;
    const { error: variantError } = await baseClient.from('product_variants').insert([
      { id: variantId, product_id: productId, sku: `TEST-${suffix}-MAIN`, color: 'Blue', size: 'M', inventory_quantity: 10, is_active: true },
      { id: contentionVariantId, product_id: productId, sku: `TEST-${suffix}-LAST`, color: 'Blue', size: 'L', inventory_quantity: 1, is_active: true },
    ]);
    if (variantError) throw variantError;

    const parallel = await Promise.all([submit(keyParallel, [item(2)]), submit(keyParallel, [item(2)])]);
    assert.ok(parallel.every(result => !result.error), 'parallel retries with the same key both return success');
    assert.equal(parallel[0].data?.id, parallel[1].data?.id, 'parallel retries return one order number');
    assert.equal(Number(parallel[0].data?.subtotal), 100, 'server uses database pricing instead of the forged client price');
    orderNumbers.add(String(parallel[0].data?.id));
    const { data: afterReplayStock, error: replayStockError } = await baseClient.from('product_variants').select('inventory_quantity').eq('id', variantId).single();
    assert.ifError(replayStockError);
    assert.equal(afterReplayStock.inventory_quantity, 8, 'parallel replay decrements stock once');

    simulateLostResponse = true;
    const timedOut = await submit(keyLostResponse, [item(1)], lossyClient);
    assert.ok(timedOut.error, 'simulated lost response is reported as a network error');
    const recovered = await submit(keyLostResponse, [item(1)]);
    assert.ifError(recovered.error);
    orderNumbers.add(String(recovered.data?.id));
    const repeated = await submit(keyLostResponse, [item(1)]);
    assert.equal(repeated.data?.id, recovered.data?.id, 'retry after lost response returns the committed order');

    const differentIntent = await submit(keyNewIntent, [item(1)]);
    assert.ifError(differentIntent.error);
    assert.notEqual(differentIntent.data?.id, recovered.data?.id, 'a new key creates a distinct customer order');
    orderNumbers.add(String(differentIntent.data?.id));

    const mismatch = await submit(keyParallel, [item(1)]);
    assert.match(mismatch.error?.message ?? '', /already in use for a different order/i, 'a key cannot be reused with a different payload');

    await baseClient.from('product_variants').update({ inventory_quantity: 1 }).eq('id', variantId);
    const failed = await submit(keyFailureRetry, [item(2)]);
    assert.ok(failed.error, 'insufficient stock aborts the entire transaction');
    await baseClient.from('product_variants').update({ inventory_quantity: 2 }).eq('id', variantId);
    const afterFailureRecovery = await submit(keyFailureRetry, [item(2)]);
    assert.ifError(afterFailureRecovery.error);
    orderNumbers.add(String(afterFailureRecovery.data?.id));

    const contested = await Promise.all([
      submit(keyContentionA, [item(1, contentionVariantId)]),
      submit(keyContentionB, [item(1, contentionVariantId)]),
    ]);
    assert.equal(contested.filter(result => !result.error).length, 1, 'only one distinct checkout can claim the last unit');
    assert.equal(contested.filter(result => result.error).length, 1, 'the losing checkout receives an inventory failure');
    orderNumbers.add(String(contested.find(result => !result.error)?.data?.id));
  } finally {
    const validOrderNumbers = [...orderNumbers].filter(value => /^DR-[A-Z0-9]{10}$/.test(value));
    if (validOrderNumbers.length) {
      const { data: orderRows } = await baseClient.from('orders').select('id').in('order_number', validOrderNumbers);
      const orderIds = (orderRows ?? []).map(row => row.id);
      if (orderIds.length) {
        await baseClient.from('checkout_idempotency').delete().in('order_id', orderIds);
        await baseClient.from('orders').delete().in('id', orderIds);
      }
    }
    await baseClient.from('products').delete().eq('id', productId);
    await baseClient.from('public_action_rate_limits').delete().eq('action', 'subscribe').eq('subject_hash', rateSubjectHash);
  }
});
