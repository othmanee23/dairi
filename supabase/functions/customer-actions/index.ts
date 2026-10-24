import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_REQUEST_BYTES = 64 * 1024;

async function withinPublicActionLimit(admin: ReturnType<typeof createClient>, action: string, subject: string) {
  const { data, error } = await admin.rpc('consume_public_action_limit', { p_action: action, p_subject: subject });
  if (error) throw error;
  return data === true;
}

async function readBoundedBody(request: Request, maxBytes: number): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return ''; }
}

async function verifiedCustomerId(admin: ReturnType<typeof createClient>, request: Request, email: string) {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token || token === request.headers.get('apikey') || token === Deno.env.get('SUPABASE_ANON_KEY')) return { id: null as string | null, error: '' };
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { id: null, error: 'Your sign-in has expired. Sign in again and retry.' };
  if (!data.user.email_confirmed_at) return { id: null, error: 'Verify your email before using customer account features.' };
  if (data.user.email?.trim().toLowerCase() !== email) return { id: null, error: 'Use the email address on your signed-in customer account.' };
  const { data: profile, error: profileError } = await admin.from('profiles').select('id,role').eq('id', data.user.id).maybeSingle();
  if (profileError) throw profileError;
  if (profile?.role !== 'customer') return { id: null, error: '' };
  return { id: profile.id as string, error: '' };
}

async function isDairiAdmin(admin: ReturnType<typeof createClient>, request: Request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token || token === request.headers.get('apikey') || token === Deno.env.get('SUPABASE_ANON_KEY')) return false;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return false;
  const { data: profile, error: profileError } = await admin.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (profileError) throw profileError;
  return profile?.role === 'admin';
}

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
type TransactionalEmailType = 'order_confirmation' | 'shipment_notification';

async function dispatchOrderEmail(admin: ReturnType<typeof createClient>, orderNumber: string, eventType: TransactionalEmailType) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('DAIRI_EMAIL_FROM');
  if (!apiKey || !from) return 'queued';

  const { data: order, error: orderError } = await admin.from('orders').select('id,order_number,customer_name,customer_email,total,currency,status,tracking_carrier,tracking_number').eq('order_number', orderNumber).maybeSingle();
  if (orderError) throw orderError;
  if (!order) return 'missing';
  const { data: queuedRows, error: queueError } = await admin.from('transactional_email_outbox').select('id,status,available_at,updated_at,attempts').eq('order_id', order.id).eq('event_type', eventType).lt('attempts', 8).order('created_at');
  if (queueError) throw queueError;
  const now = Date.now();
  const queued = (queuedRows ?? []).find(event =>
    ((event.status === 'pending' || event.status === 'failed') && new Date(event.available_at).getTime() <= now)
    || (event.status === 'processing' && new Date(event.updated_at).getTime() < now - 10 * 60 * 1000)
  );
  if (!queued) return 'already_sent_or_waiting';
  const { data: claimedRows, error: claimError } = await admin.rpc('claim_transactional_email', { p_event_id: queued.id });
  if (claimError) throw claimError;
  const claimed = Array.isArray(claimedRows) ? claimedRows[0] : null;
  if (!claimed) return 'already_processing';

  try {
    const { data: items, error: itemsError } = await admin.from('order_items').select('product_name,sku,color,size,quantity,unit_price').eq('order_id', order.id);
    if (itemsError) throw itemsError;
    const greeting = escapeHtml(order.customer_name.split(/\s+/)[0] || 'there');
    const lines = (items ?? []).map(item => `<li>${escapeHtml(item.product_name)} · ${escapeHtml(item.color || 'Standard')} · ${escapeHtml(item.size)} × ${item.quantity} — $${Number(item.unit_price).toFixed(2)}</li>`).join('');
    let subject: string;
    let message: string;
    if (eventType === 'order_confirmation') {
      subject = `We received your DAIRI order ${order.order_number}`;
      message = `<p>Your order has been received and is awaiting studio review. It is unpaid; no payment was collected.</p><ul>${lines}</ul><p>Estimated total: $${Number(order.total).toFixed(2)} ${escapeHtml(order.currency)}</p>`;
    } else {
      subject = `Your DAIRI order ${order.order_number} has shipped`;
      const carrier = escapeHtml(order.tracking_carrier);
      const number = escapeHtml(order.tracking_number);
      const encoded = encodeURIComponent(String(order.tracking_number));
      const trackingUrl = order.tracking_carrier === 'UPS' ? `https://www.ups.com/track?tracknum=${encoded}` : order.tracking_carrier === 'FedEx' ? `https://www.fedex.com/fedextrack/?trknbr=${encoded}` : order.tracking_carrier === 'USPS' ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encoded}` : null;
      message = `<p>Your order is on its way.</p><p>Carrier: ${carrier}<br>Tracking number: ${trackingUrl ? `<a href="${trackingUrl}">${number}</a>` : number}</p>`;
    }
    const html = `<div style="font-family:Arial,sans-serif;color:#171717;line-height:1.6;max-width:600px;margin:auto"><p style="letter-spacing:.2em;text-transform:uppercase">DAIRI</p><p>Hello ${greeting},</p>${message}<p>Thank you,<br>The DAIRI studio</p></div>`;
    const text = eventType === 'order_confirmation'
      ? `Hello ${order.customer_name.split(/\s+/)[0] || 'there'}, your unpaid order ${order.order_number} was received for studio review. Estimated total: $${Number(order.total).toFixed(2)} ${order.currency}.`
      : `Your DAIRI order ${order.order_number} has shipped with ${order.tracking_carrier}. Tracking number: ${order.tracking_number}.`;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': claimed.id },
      body: JSON.stringify({ from, to: [order.customer_email], subject, html, text }),
    });
    const responseBody = await response.text();
    if (!response.ok) throw new Error(`Email provider returned ${response.status}: ${responseBody.slice(0, 350)}`);
    let providerMessageId: string | null = null;
    try { providerMessageId = JSON.parse(responseBody).id ?? null; } catch { /* A successful provider response may omit a message id. */ }
    const { error: finishError } = await admin.rpc('finish_transactional_email', { p_event_id: claimed.id, p_provider_message_id: providerMessageId, p_error: null });
    if (finishError) throw finishError;
    return 'sent';
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Email delivery failed.';
    await admin.rpc('finish_transactional_email', { p_event_id: claimed.id, p_provider_message_id: null, p_error: reason });
    console.error('Transactional email delivery failed:', reason.slice(0, 350));
    return 'queued_for_retry';
  }
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const declaredLength = Number(request.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_REQUEST_BYTES) return json({ error: 'Request is too large.' }, 413);
    const rawBody = await readBoundedBody(request, MAX_REQUEST_BYTES);
    if (rawBody === null) return json({ error: 'Request is too large.' }, 413);
    let body: Record<string, any>;
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return json({ error: 'Request body must be a JSON object.' }, 400);
      body = parsed as Record<string, any>;
    } catch { return json({ error: 'Request body must be valid JSON.' }, 400); }
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    if (body.action === 'subscribe') {
      const email = String(body.email ?? '').trim().toLowerCase();
      if (!emailPattern.test(email) || email.length > 254) return json({ error: 'Enter a valid email address.' }, 400);
      if (!await withinPublicActionLimit(admin, 'subscribe', email)) return json({ error: 'Too many requests for this email. Please try again later.' }, 429);
      const { error } = await admin.from('newsletter_subscribers').upsert({ email, unsubscribed_at: null }, { onConflict: 'email' });
      if (error) throw error;
      return json({ success: true });
    }
    if (body.action === 'support') {
      const email = String(body.email ?? '').trim().toLowerCase();
      const message = String(body.message ?? '').trim();
      if (!emailPattern.test(email) || email.length > 254 || message.length < 8 || message.length > 10000) return json({ error: 'Enter a valid email and a message between 8 and 10,000 characters.' }, 400);
      if (!await withinPublicActionLimit(admin, 'support', email)) return json({ error: 'Too many support requests for this email. Please try again later.' }, 429);
      const { error } = await admin.from('support_requests').insert({ email, message });
      if (error) throw error;
      return json({ success: true });
    }
    if (body.action === 'wholesale-application') {
      const application = body.application ?? {};
      const text = (key: string, max: number) => typeof application[key] === 'string' ? application[key].trim().slice(0, max) : '';
      const companyName = text('companyName', 200);
      const contactName = text('contactName', 200);
      const email = text('email', 254).toLowerCase();
      const phone = text('phone', 40);
      const country = text('country', 100);
      const website = text('website', 500);
      const businessType = text('businessType', 100);
      const annualVolume = text('annualVolume', 100);
      const message = text('message', 3000);
      if (companyName.length < 2 || contactName.length < 2 || !emailPattern.test(email) || !country || !businessType || message.length > 3000) {
        return json({ error: 'Complete the required business, contact, country, and business type fields with valid values.' }, 400);
      }
      if (website && !/^https?:\/\//i.test(website)) return json({ error: 'Enter a full website URL beginning with https:// or http://.' }, 400);
      const customerIdentity = await verifiedCustomerId(admin, request, email);
      if (customerIdentity.error) return json({ error: customerIdentity.error }, 403);
      if (!await withinPublicActionLimit(admin, 'wholesale', customerIdentity.id ?? email)) return json({ error: 'Too many applications for this account. Please try again later.' }, 429);
      const { data: pending, error: lookupError } = await admin.from('wholesale_applications').select('id').eq('email', email).eq('status', 'pending').limit(1).maybeSingle();
      if (lookupError) throw lookupError;
      if (pending) return json({ error: 'There is already a pending application for this email address.' }, 409);
      const { error } = await admin.from('wholesale_applications').insert({
        company_name: companyName, contact_name: contactName, email, phone, country, website,
        business_type: businessType, annual_volume: annualVolume, message, user_id: customerIdentity.id,
      });
      if (error?.code === '23505') return json({ error: 'There is already a pending application for this email address.' }, 409);
      if (error) throw error;
      return json({ success: true });
    }
    if (body.action === 'checkout-estimate') {
      const country = String(body.country ?? '').trim().toUpperCase();
      const region = typeof body.region === 'string' ? body.region.trim().slice(0, 100) : '';
      const subtotal = Number(body.subtotal);
      if (!/^[A-Z]{2}$/.test(country) || !Number.isFinite(subtotal) || subtotal < 0 || subtotal > 10000000) return json({ error: 'Enter a valid destination and order subtotal.' }, 400);
      const code = typeof body.discountCode === 'string' ? body.discountCode.trim().slice(0, 40) : null;
      let wholesale = false;
      const identity = await verifiedCustomerId(admin, request, String(body.email ?? '').trim().toLowerCase());
      if (identity.error) return json({ error: identity.error }, 403);
      if (identity.id) {
        const { data: profile, error: profileError } = await admin.from('profiles').select('wholesale_status').eq('id', identity.id).maybeSingle();
        if (profileError) throw profileError;
        wholesale = profile?.wholesale_status === 'approved';
      }
      const { data: estimate, error } = await admin.rpc('estimate_checkout_charges', { p_country_code: country, p_region_code: region, p_subtotal: subtotal, p_discount_code: code, p_wholesale: wholesale });
      if (error?.code === '22023') return json({ error: error.message }, 400);
      if (error) throw error;
      return json({ estimate });
    }
    if (body.action === 'order') {
      const customer = body.customer ?? {};
      const idempotencyKey = String(body.idempotencyKey ?? '');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) return json({ error: 'Refresh your bag and try placing the order again.' }, 400);
      if (customer.discountCode != null && (typeof customer.discountCode !== 'string' || customer.discountCode.trim().length > 40)) return json({ error: 'Discount code is too long.' }, 400);
      const email = String(customer.email ?? '').trim().toLowerCase();
      const fields = ['name', 'address', 'city', 'postalCode', 'country'] as const;
      if (!emailPattern.test(email) || email.length > 254 || fields.some(field => typeof customer[field] !== 'string' || !customer[field].trim() || customer[field].length > 300) || (customer.region != null && (typeof customer.region !== 'string' || customer.region.length > 100)) || !/^[A-Za-z]{2}$/.test(String(customer.country ?? '').trim())) return json({ error: 'Complete all contact and delivery fields, including a valid two-letter country code.' }, 400);
      const customerIdentity = await verifiedCustomerId(admin, request, email);
      if (customerIdentity.error) return json({ error: customerIdentity.error }, 403);
      if (!await withinPublicActionLimit(admin, 'order', customerIdentity.id ?? email)) return json({ error: 'Too many checkout attempts for this account. Please try again later.' }, 429);
      if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) return json({ error: 'Your bag is empty or contains too many items.' }, 400);
      const quantities = new Map<string, number>();
      const normalizedItems: { productId: string; variantId: string; size: string; color: string; quantity: number }[] = [];
      for (const item of body.items) {
        if (typeof item.productId !== 'string' || typeof item.variantId !== 'string' || !/^[0-9a-f-]{36}$/i.test(item.variantId) || typeof item.size !== 'string' || !item.size.trim() || typeof item.color !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) return json({ error: 'One or more items are invalid. Refresh your bag and try again.' }, 400);
        const key = item.variantId;
        const quantity = (quantities.get(key) ?? 0) + item.quantity;
        if (quantity > 20) return json({ error: 'Maximum quantity per size is 20.' }, 400);
        quantities.set(key, quantity);
        const existing = normalizedItems.find(line => line.variantId === key);
        if (existing) existing.quantity = quantity;
        else normalizedItems.push({ productId: item.productId, variantId: item.variantId, size: item.size, color: item.color, quantity });
      }
      const { data: order, error: orderError } = await admin.rpc('submit_unpaid_order', {
        p_customer: { ...customer, name: customer.name.trim(), email },
        p_items: normalizedItems,
        p_user_id: customerIdentity.id,
        p_idempotency_key: idempotencyKey,
      });
      if (orderError) {
        if (orderError.code === 'P0001' || orderError.code === '22023') return json({ error: orderError.message }, 409);
        throw orderError;
      }
      const orderItems = Array.isArray(order.items) ? order.items.map((line: Record<string, unknown>) => ({ productId: line.product_id, variantId: line.variant_id, sku: line.sku, color: line.color, size: line.size, quantity: line.quantity })) : normalizedItems;
      let emailStatus = 'queued';
      try { emailStatus = await dispatchOrderEmail(admin, String(order.id), 'order_confirmation'); }
      catch (emailError) { console.error('Order was saved but confirmation email could not be dispatched:', emailError instanceof Error ? emailError.message : 'unknown error'); }
      return json({ success: true, order: { ...order, customer: { ...customer, email }, items: orderItems }, emailStatus });
    }
    if (body.action === 'update-tracking') {
      if (!await isDairiAdmin(admin, request)) return json({ error: 'Administrator access is required.' }, 403);
      const orderNumber = String(body.orderNumber ?? '').trim();
      const carrier = String(body.carrier ?? '').trim();
      const trackingNumber = String(body.trackingNumber ?? '').trim();
      if (!/^DR-[A-Z0-9]{10}$/.test(orderNumber) || !['USPS', 'UPS', 'FedEx', 'Other'].includes(carrier) || !/^[A-Za-z0-9 -]{3,100}$/.test(trackingNumber)) return json({ error: 'Enter a valid order, carrier, and tracking number.' }, 400);
      const { data: updated, error: updateError } = await admin.from('orders').update({ status: 'shipped', tracking_carrier: carrier, tracking_number: trackingNumber, shipped_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('order_number', orderNumber).in('status', ['pending', 'paid', 'processing', 'shipped']).select('order_number').maybeSingle();
      if (updateError) throw updateError;
      if (!updated) return json({ error: 'This order cannot be marked shipped. Refresh and check its current status.' }, 409);
      let emailStatus = 'queued';
      try { emailStatus = await dispatchOrderEmail(admin, orderNumber, 'shipment_notification'); }
      catch (emailError) { console.error('Tracking was saved but shipment email could not be dispatched:', emailError instanceof Error ? emailError.message : 'unknown error'); }
      return json({ success: true, emailStatus });
    }
    if (body.action === 'retry-order-email') {
      if (!await isDairiAdmin(admin, request)) return json({ error: 'Administrator access is required.' }, 403);
      const orderNumber = String(body.orderNumber ?? '').trim();
      if (!/^DR-[A-Z0-9]{10}$/.test(orderNumber)) return json({ error: 'Enter a valid order number.' }, 400);
      const confirmation = await dispatchOrderEmail(admin, orderNumber, 'order_confirmation');
      const shipment = await dispatchOrderEmail(admin, orderNumber, 'shipment_notification');
      return json({ success: true, confirmation, shipment });
    }
    return json({ error: 'Unknown action.' }, 400);
  } catch (error) {
    console.error('Customer action failed:', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'We could not save that request. Please try again.' }, 500);
  }
});
