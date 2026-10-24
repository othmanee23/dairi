type OrderForSession = {
  id: string;
  createdAt: string;
  items: Array<{ productId: string; variantId: string; quantity: number; size: string; color: string; sku?: string }>;
  total: number;
  subtotal?: number;
  discount?: number;
  discountCode?: string;
  shipping?: number;
  tax?: number;
  shippingConfigured?: boolean;
  taxConfigured?: boolean;
  status: string;
  trackingCarrier?: string;
  trackingNumber?: string;
  shippedAt?: string;
};

export const GUEST_ORDER_SESSION_KEY = 'dairi-guest-order-v1';
export const GUEST_ORDER_SESSION_TTL_MS = 60 * 60 * 1000;

export function serializePersistedState<T extends {
  products: Array<{ variants?: Array<object> }>;
  collections: unknown;
  lookbooks: unknown;
  cart: unknown;
  wishlist: unknown;
  settings: unknown;
}>(state: T): string {
  const products = state.products.map(product => ({
    ...product,
    variants: product.variants?.map(variant => {
      const { wholesalePrice: _wholesalePrice, ...publicVariant } = variant as Record<string, unknown>;
      return publicVariant;
    }),
  }));
  return JSON.stringify({ products, collections: state.collections, lookbooks: state.lookbooks, cart: state.cart, wishlist: state.wishlist, settings: state.settings });
}

export function serializeGuestOrder(order: OrderForSession, now = Date.now()): string {
  return JSON.stringify({
    id: order.id,
    createdAt: order.createdAt,
    items: order.items.map(({ productId, variantId, quantity, size, color, sku }) => ({ productId, variantId, quantity, size, color, ...(sku ? { sku } : {}) })),
    total: order.total,
    subtotal: order.subtotal,
    discount: order.discount,
    discountCode: order.discountCode,
    shipping: order.shipping,
    tax: order.tax,
    shippingConfigured: order.shippingConfigured,
    taxConfigured: order.taxConfigured,
    status: order.status,
    trackingCarrier: order.trackingCarrier,
    trackingNumber: order.trackingNumber,
    shippedAt: order.shippedAt,
    expiresAt: now + GUEST_ORDER_SESSION_TTL_MS,
  });
}

export function readGuestOrder(raw: string | null, now = Date.now()): (OrderForSession & { customer: { name: string; email: string; address: string; city: string; region: string; postalCode: string; country: string } }) | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OrderForSession> & { expiresAt?: number };
    if (typeof parsed.expiresAt !== 'number' || parsed.expiresAt <= now || typeof parsed.id !== 'string' || parsed.id.length > 100 ||
        typeof parsed.createdAt !== 'string' || typeof parsed.total !== 'number' || typeof parsed.status !== 'string' ||
        !Number.isFinite(parsed.total) || !Array.isArray(parsed.items) || parsed.items.length > 100 ||
        !parsed.items.every(item => item && typeof item.productId === 'string' && item.productId.length <= 200 &&
          typeof item.variantId === 'string' && item.variantId.length <= 200 && Number.isSafeInteger(item.quantity) && item.quantity > 0 &&
          typeof item.size === 'string' && typeof item.color === 'string')) return null;
    const { expiresAt: _expiresAt, customer: _customer, ...order } = parsed as Partial<OrderForSession> & { expiresAt: number; customer?: unknown };
    return { ...order as OrderForSession, customer: { name: '', email: '', address: '', city: '', region: '', postalCode: '', country: '' } };
  } catch {
    return null;
  }
}
