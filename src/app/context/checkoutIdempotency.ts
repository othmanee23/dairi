const STORAGE_KEY = 'dairi-checkout-retry-v1';
const memoryKeys = new Map<string, string>();

export type CheckoutStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export async function checkoutIntentHash(intent: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(intent));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

export async function getCheckoutIdempotencyKey(intent: unknown, storage?: CheckoutStorage): Promise<string> {
  const fingerprint = await checkoutIntentHash(intent);
  const inMemory = memoryKeys.get(fingerprint);
  if (inMemory) return inMemory;

  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null') as { key?: unknown; fingerprint?: unknown } | null;
    if (typeof saved?.key === 'string' && typeof saved.fingerprint === 'string' && saved.fingerprint === fingerprint) {
      memoryKeys.set(fingerprint, saved.key);
      return saved.key;
    }
  } catch { /* Storage may be disabled; retain the key in memory for an in-page retry. */ }

  const key = crypto.randomUUID();
  memoryKeys.set(fingerprint, key);
  try { storage?.setItem(STORAGE_KEY, JSON.stringify({ key, fingerprint })); } catch { /* The UUID contains no customer data and remains in memory. */ }
  return key;
}

export async function clearCheckoutIdempotencyKey(intent: unknown, storage?: CheckoutStorage): Promise<void> {
  const fingerprint = await checkoutIntentHash(intent);
  memoryKeys.delete(fingerprint);
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null') as { fingerprint?: unknown } | null;
    if (saved?.fingerprint === fingerprint) storage?.removeItem(STORAGE_KEY);
  } catch { /* A cleared in-memory key is enough when storage is unavailable. */ }
}

export function clearCheckoutIdempotencyStorage(storage?: CheckoutStorage): void {
  memoryKeys.clear();
  try { storage?.removeItem(STORAGE_KEY); } catch { /* Storage may be disabled. */ }
}
