import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const enabled = process.env.DAIRI_TEST_DB_DISPOSABLE === 'true';
const base64url = (value: string) => Buffer.from(value).toString('base64url');

function expiredJwt(userId: string, secret: string) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ iss: 'supabase-demo', ref: 'localhost', role: 'authenticated', sub: userId, aud: 'authenticated', exp: Math.floor(Date.now() / 1000) - 60 }));
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`;
}

test('guest, customer, admin, cross-customer and expired-session RLS boundaries', { skip: !enabled }, async () => {
  const url = process.env.DAIRI_TEST_SUPABASE_URL ?? '';
  const serviceKey = process.env.DAIRI_TEST_SUPABASE_SERVICE_ROLE_KEY ?? '';
  const anonKey = process.env.DAIRI_TEST_SUPABASE_ANON_KEY ?? '';
  const jwtSecret = process.env.DAIRI_TEST_SUPABASE_JWT_SECRET ?? '';
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(new URL(url).hostname), 'integration tests may only target loopback');
  assert.ok(serviceKey && anonKey && jwtSecret, 'disposable local keys are required');

  const service = createClient(url, serviceKey, { auth: { persistSession: false } });
  const suffix = crypto.randomUUID();
  const users: string[] = [];
  const orders: string[] = [];
  const fixtures = [
    { role: 'customer', email: `customer-a-${suffix}@example.test`, password: crypto.randomUUID() },
    { role: 'customer', email: `customer-b-${suffix}@example.test`, password: crypto.randomUUID() },
    { role: 'admin', email: `admin-${suffix}@example.test`, password: crypto.randomUUID() },
  ];

  try {
    const userIds: string[] = [];
    for (const fixture of fixtures) {
      const { data, error } = await service.auth.admin.createUser({ email: fixture.email, password: fixture.password, email_confirm: true, user_metadata: { name: 'Disposable RLS Test' } });
      assert.ifError(error);
      assert.ok(data.user);
      userIds.push(data.user.id);
      users.push(data.user.id);
      if (fixture.role === 'admin') {
        const { error: roleError } = await service.from('profiles').update({ role: 'admin' }).eq('id', data.user.id);
        assert.ifError(roleError);
      }
    }

    for (let index = 0; index < 2; index++) {
      const { data, error } = await service.from('orders').insert({
        order_number: `DR-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`,
        user_id: userIds[index], customer_name: fixtures[index].email, customer_email: fixtures[index].email,
        shipping_address: { address: '1 Disposable Test Street', city: 'Test City', country: 'US' },
        subtotal: 10, total: 10, status: 'pending',
      }).select('id').single();
      assert.ifError(error);
      orders.push(data.id);
      const { error: itemError } = await service.from('order_items').insert({ order_id: data.id, product_name: 'Disposable RLS Item', size: 'M', quantity: 1, unit_price: 10 });
      assert.ifError(itemError);
    }

    const signIn = async (index: number) => {
      const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error } = await client.auth.signInWithPassword({ email: fixtures[index].email, password: fixtures[index].password });
      assert.ifError(error);
      return client;
    };
    const customerA = await signIn(0);
    const customerB = await signIn(1);
    const admin = await signIn(2);
    const guest = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: publicProducts, error: publicReadError } = await guest.from('products').select('id').limit(5);
    assert.ifError(publicReadError);
    assert.ok(Array.isArray(publicProducts), 'guest can read the public catalog');
    const { error: guestWriteError } = await guest.from('discount_codes').insert({ code: `GUEST-${suffix.slice(0, 6).toUpperCase()}`, discount_type: 'fixed', amount: 1 });
    assert.ok(guestWriteError, 'guest cannot create administrative discount codes');

    const { data: ownOrderA, error: ownErrorA } = await customerA.from('orders').select('id').eq('id', orders[0]);
    assert.ifError(ownErrorA);
    assert.equal(ownOrderA.length, 1, 'customer A can read their own order');
    const { data: crossOrderA, error: crossErrorA } = await customerA.from('orders').select('id').eq('id', orders[1]);
    assert.ifError(crossErrorA);
    assert.equal(crossOrderA.length, 0, 'customer A cannot read customer B order');
    const { data: crossItemsA, error: crossItemsError } = await customerA.from('order_items').select('id').eq('order_id', orders[1]);
    assert.ifError(crossItemsError);
    assert.equal(crossItemsA.length, 0, 'customer A cannot read customer B order items');
    const { data: guestOrders, error: guestOrderError } = await guest.from('orders').select('id');
    assert.ifError(guestOrderError);
    assert.equal(guestOrders.length, 0, 'guest cannot read customer order records');

    const { data: adminOrders, error: adminReadError } = await admin.from('orders').select('id').in('id', orders);
    assert.ifError(adminReadError);
    assert.equal(adminOrders.length, 2, 'admin can read both test orders');
    const { data: customerMutation, error: customerMutationError } = await customerA.from('orders').update({ status: 'shipped' }).eq('id', orders[0]).select('id');
    assert.ifError(customerMutationError);
    assert.equal(customerMutation.length, 0, 'customer cannot change order status');

    const { error: signOutError } = await customerB.auth.signOut();
    assert.ifError(signOutError);
    const { data: signedOutOrders, error: signedOutError } = await customerB.from('orders').select('id');
    assert.ifError(signedOutError);
    assert.equal(signedOutOrders.length, 0, 'sign-out removes authenticated order access');

    const expiredToken = expiredJwt(userIds[0], jwtSecret);
    const expiredClient = createClient(url, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${expiredToken}` } } });
    const { error: expiredError } = await expiredClient.from('orders').select('id');
    assert.ok(expiredError, 'an expired signed token is rejected by the API');
  } finally {
    if (orders.length) await service.from('orders').delete().in('id', orders);
    for (const userId of users) await service.auth.admin.deleteUser(userId);
  }
});
