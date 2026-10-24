import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Product, ProductVariant, Collection, Lookbook } from '../types';
import { mockLookbooks } from '../data/mockData';
import { storeProducts, upgradeLocalImageReference } from '../data/storeProducts';
import { supabase, supabaseReady } from '../lib/supabase';
import { functionErrorMessage } from './functionError';
import { GUEST_ORDER_SESSION_KEY, readGuestOrder, serializeGuestOrder, serializePersistedState } from './persistence';
import { CatalogLoadStatus, getCatalogLoadError, hasDemoProducts } from './catalogLoad';
import { clearCheckoutIdempotencyKey, clearCheckoutIdempotencyStorage, getCheckoutIdempotencyKey } from './checkoutIdempotency';

const STORAGE_KEY = 'dairi-local-store-v1';
export interface CartItem { productId: string; variantId: string; quantity: number; size: string; color: string; sku?: string }
export interface LocalOrder { id: string; createdAt: string; customer: { name: string; email: string; address: string; city: string; region?: string; postalCode: string; country: string }; items: CartItem[]; total: number; subtotal?: number; discount?: number; discountCode?: string; shipping?: number; tax?: number; shippingConfigured?: boolean; taxConfigured?: boolean; status: string; trackingCarrier?: string; trackingNumber?: string; shippedAt?: string }
export interface LocalSettings { brandName: string; logo: string; primaryColor: string; secondaryColor: string; fontFamily: string; defaultFormat: 'a4'|'square'|'portrait'; defaultLayout: 'minimal'|'editorial'|'magazine'; email: string; name: string }
export interface CustomerAccount { id: string; email: string; displayName: string; wholesaleStatus: 'none'|'pending'|'approved'|'rejected'; companyName: string; wholesaleMoq: number }
interface PersistedState { products: Product[]; collections: Collection[]; lookbooks: Lookbook[]; cart: CartItem[]; wishlist: string[]; orders: LocalOrder[]; subscribers: string[]; supportRequests: { email: string; message: string; createdAt: string }[]; settings: LocalSettings }
type ProductRow = { id: string; style_number: string | null; name: string; price: number; images: string[]; category: string; collection: string; description: string; tags: string[]; status: Product['status']; show_on_website: boolean; created_at: string; color: string | null; color_hex: string | null; details: string[]; material: string | null; fit: string | null; care: string | null; sizes: string[] };
type ProductVariantRow = { id: string; product_id: string; sku: string; color: string; color_hex: string | null; size: string; retail_price: number | null; inventory_quantity: number; is_active: boolean };
type WholesalePriceRow = { variant_id: string; price: number };
type CollectionRow = { id: string; name: string; description: string; season: string; image: string; product_count: number; created_at: string };
type LookbookRow = { id: string; name: string; created_at: string; product_ids: string[]; layout: Lookbook['layout']; cover_title: string; cover_image: string | null; format: Lookbook['format'] };
type StoreSettingsRow = { brand_name: string; logo: string; primary_color: string; secondary_color: string; font_family: string; default_format: LocalSettings['defaultFormat']; default_layout: LocalSettings['defaultLayout']; email: string; name: string };
async function uploadImageReference(image: string, directory: string) {
  const client = supabase;
  if (!client) throw new Error('Supabase is not configured.');
  const match = image.match(/^data:(image\/(?:jpeg|png|webp|avif));base64,(.+)$/);
  if (!match) return image;
  const [, contentType, encoded] = match;
  const extension = contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1];
  const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
  const path = `${directory}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from('product-media').upload(path, new Blob([bytes], { type: contentType }), { contentType, upsert: false });
  if (error) throw new Error(`Could not upload image: ${error.message}`);
  return client.storage.from('product-media').getPublicUrl(path).data.publicUrl;
}
const variantFromRow = (row: ProductVariantRow, wholesalePrice?: number): ProductVariant => ({ id: row.id, sku: row.sku, color: row.color, colorHex: row.color_hex ?? undefined, size: row.size, retailPrice: row.retail_price == null ? undefined : Number(row.retail_price), wholesalePrice, inventoryQuantity: row.inventory_quantity, isActive: row.is_active });
const productFromRow = (row: ProductRow, variants: ProductVariant[] = []): Product => ({ id: row.id, styleNumber: row.style_number ?? undefined, name: row.name, price: Number(row.price), images: row.images.map(upgradeLocalImageReference), category: row.category, collection: row.collection, description: row.description, tags: row.tags, status: row.status, showOnWebsite: row.show_on_website, createdAt: row.created_at.slice(0, 10), color: row.color ?? undefined, colorHex: row.color_hex ?? undefined, details: row.details, material: row.material ?? undefined, fit: row.fit ?? undefined, care: row.care ?? undefined, sizes: row.sizes, variants });
async function productToRow(product: Product) {
  const images = await Promise.all(product.images.map(image => uploadImageReference(image, `products/${product.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`)));
  return { id: product.id, style_number: product.styleNumber ?? null, name: product.name, price: product.price, images, category: product.category, collection: product.collection, description: product.description, tags: product.tags, status: product.status, show_on_website: product.showOnWebsite, created_at: product.createdAt, color: product.color ?? null, color_hex: product.colorHex ?? null, details: product.details ?? [], material: product.material ?? null, fit: product.fit ?? null, care: product.care ?? null, sizes: product.sizes ?? [] };
}
const variantToRow = (productId: string, variant: ProductVariant) => ({ id: variant.id, product_id: productId, sku: variant.sku, color: variant.color, color_hex: variant.colorHex ?? null, size: variant.size, retail_price: variant.retailPrice ?? null, inventory_quantity: variant.inventoryQuantity, is_active: variant.isActive });
async function saveProductVariants(productId: string, variants: ProductVariant[]) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: current, error: readError } = await supabase.from('product_variants').select('id').eq('product_id', productId);
  if (readError) throw new Error(readError.message);
  if (variants.length) {
    const { error } = await supabase.from('product_variants').upsert(variants.map(variant => variantToRow(productId, variant)), { onConflict: 'id' });
    if (error) throw new Error(error.message);
    const wholesalePrices = variants.filter(variant => variant.wholesalePrice != null).map(variant => ({ variant_id: variant.id, price: variant.wholesalePrice! }));
    if (wholesalePrices.length) {
      const { error: priceError } = await supabase.from('wholesale_variant_prices').upsert(wholesalePrices, { onConflict: 'variant_id' });
      if (priceError) throw new Error(priceError.message);
    }
  }
  const retained = new Set(variants.map(variant => variant.id));
  const removed = (current ?? []).filter(row => !retained.has(row.id)).map(row => row.id);
  if (removed.length) {
    const { error } = await supabase.from('product_variants').delete().in('id', removed);
    if (error) throw new Error(error.message);
  }
  if (variants.length) {
    const withoutPrice = variants.filter(variant => variant.wholesalePrice == null).map(variant => variant.id);
    if (withoutPrice.length) {
      const { error } = await supabase.from('wholesale_variant_prices').delete().in('variant_id', withoutPrice);
      if (error) throw new Error(error.message);
    }
  }
}
const collectionFromRow = (row: CollectionRow): Collection => ({ id: row.id, name: row.name, description: row.description, season: row.season, image: upgradeLocalImageReference(row.image), productCount: row.product_count });
const collectionToRow = (collection: Collection) => ({ id: collection.id, name: collection.name, description: collection.description, season: collection.season, image: collection.image, product_count: collection.productCount, is_published: true });
const lookbookFromRow = (row: LookbookRow): Lookbook => ({ id: row.id, name: row.name, createdAt: row.created_at.slice(0, 10), productIds: row.product_ids, layout: row.layout, coverTitle: row.cover_title, coverImage: row.cover_image ? upgradeLocalImageReference(row.cover_image) : undefined, format: row.format });
async function lookbookToRow(lookbook: Lookbook) { return { id: lookbook.id, name: lookbook.name, created_at: lookbook.createdAt, product_ids: lookbook.productIds, layout: lookbook.layout, cover_title: lookbook.coverTitle, cover_image: lookbook.coverImage ? await uploadImageReference(lookbook.coverImage, `lookbooks/${lookbook.id}`) : null, format: lookbook.format }; }
const settingsFromRow = (row: StoreSettingsRow): LocalSettings => ({ brandName: row.brand_name, logo: upgradeLocalImageReference(row.logo), primaryColor: row.primary_color, secondaryColor: row.secondary_color, fontFamily: row.font_family, defaultFormat: row.default_format, defaultLayout: row.default_layout, email: row.email, name: row.name });
async function settingsToRow(settings: LocalSettings) { return { id: 'default', brand_name: settings.brandName, logo: settings.logo ? await uploadImageReference(settings.logo, 'store') : '', primary_color: settings.primaryColor, secondary_color: settings.secondaryColor, font_family: settings.fontFamily, default_format: settings.defaultFormat, default_layout: settings.defaultLayout, email: settings.email, name: settings.name, currency: 'USD' as const }; }
const initialProducts: Product[] = storeProducts.map((p) => ({
  id: p.id, name: p.name, price: p.price, images: [p.image], category: p.category, collection: 'DAIRI Edit', description: p.description,
  tags: [p.isNew ? 'new' : '', p.isBestseller ? 'bestseller' : ''].filter(Boolean), status: 'published', showOnWebsite: true, createdAt: '2026-01-01',
  color: p.color, colorHex: p.colorHex, details: p.details, material: p.material, fit: p.fit, care: p.care, sizes: p.sizes,
  variants: p.sizes.map(size => ({ id: crypto.randomUUID(), sku: `DAIRI-${p.id}-${size}`.toUpperCase(), color: p.color, colorHex: p.colorHex, size, inventoryQuantity: 0, isActive: true })),
}));
export const initialSettings: LocalSettings = { brandName: 'DAIRI', logo: '', primaryColor: '#000000', secondaryColor: '#f5f5f5', fontFamily: 'inter', defaultFormat: 'a4', defaultLayout: 'editorial', email: '', name: 'Creative Director' };
const initialState: PersistedState = { products: initialProducts, collections: [{ id: 'dairi-edit', name: 'DAIRI Edit', description: 'The latest pieces from the DAIRI studio.', season: 'Current Season', image: initialProducts[0]?.images[0] ?? '', productCount: initialProducts.length }], lookbooks: mockLookbooks, cart: [], wishlist: [], orders: [], subscribers: [], supportRequests: [], settings: initialSettings };
function readSavedState(): PersistedState {
  let guestOrder: LocalOrder | null = null;
  try { guestOrder = readGuestOrder(sessionStorage.getItem(GUEST_ORDER_SESSION_KEY)) as LocalOrder | null; } catch { /* Session storage may be unavailable in hardened browser contexts. */ }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...initialState, orders: guestOrder ? [guestOrder] : [] };
    const saved = JSON.parse(raw) as Partial<PersistedState>;
    const products = (saved.products ?? initialProducts).map(product => ({
      ...product,
      images: product.images.map(upgradeLocalImageReference),
      variants: product.variants ?? (product.sizes ?? []).map(size => ({ id: crypto.randomUUID(), sku: `DAIRI-${product.id}-${size}`.toUpperCase(), color: product.color ?? '', colorHex: product.colorHex, size, inventoryQuantity: 0, isActive: true })),
    }));
    const restoredState: PersistedState = {
      ...initialState,
      ...saved,
      orders: [],
      subscribers: [],
      supportRequests: [],
      products,
      cart: (saved.cart ?? []).map(line => {
        const product = products.find(item => item.id === line.productId);
        const variant = product?.variants?.find(item => item.size === line.size && item.color === (line.color ?? product.color ?? '') && item.isActive);
        return { ...line, variantId: line.variantId ?? variant?.id ?? '', color: line.color ?? variant?.color ?? product?.color ?? '' };
      }),
      collections: (saved.collections ?? initialState.collections).map(collection => ({
        ...collection,
        image: upgradeLocalImageReference(collection.image),
      })),
      lookbooks: (saved.lookbooks ?? mockLookbooks).map(lookbook => ({
        ...lookbook,
        coverImage: lookbook.coverImage ? upgradeLocalImageReference(lookbook.coverImage) : undefined,
      })),
      settings: {
        ...initialSettings,
        ...saved.settings,
        logo: upgradeLocalImageReference(saved.settings?.logo ?? initialSettings.logo),
      },
    };
    // Rewrite legacy caches immediately so old order/contact data is removed even
    // before React's persistence effect runs.
    try { localStorage.setItem(STORAGE_KEY, serializePersistedState(restoredState)); } catch { /* Continue with in-memory state when storage is unavailable. */ }
    return { ...restoredState, orders: guestOrder ? [guestOrder] : [] };
  } catch {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Ignore unavailable storage. */ }
    return { ...initialState, orders: guestOrder ? [guestOrder] : [] };
  }
}

interface AppContextType {
  products: Product[]; collections: Collection[]; lookbooks: Lookbook[]; cart: CartItem[]; wishlist: string[]; orders: LocalOrder[]; subscribers: string[]; supportRequests: PersistedState['supportRequests']; settings: LocalSettings;
  addProduct: (product: Product) => Promise<void>; updateProduct: (id: string, product: Partial<Product>) => Promise<void>; deleteProduct: (id: string) => Promise<void>; deleteProducts: (ids: string[]) => Promise<void>;
  addCollection: (collection: Collection) => Promise<void>; updateCollection: (id: string, collection: Partial<Collection>) => Promise<void>; deleteCollection: (id: string) => Promise<void>; addLookbook: (lookbook: Lookbook) => Promise<void>; updateLookbook: (id: string, lookbook: Partial<Lookbook>) => Promise<void>;
  addToCart: (productId: string, variantId: string, size: string, color: string, quantity?: number) => void; setCartQuantity: (productId: string, variantId: string, quantity: number) => void; removeFromCart: (productId: string, variantId: string) => void; clearCart: () => void; toggleWishlist: (id: string) => void;
  placeOrder: (customer: LocalOrder['customer'] & { discountCode?: string }) => Promise<LocalOrder>; subscribe: (email: string) => Promise<void>; submitSupportRequest: (email: string, message: string) => Promise<void>; updateSettings: (settings: Partial<LocalSettings>) => Promise<void>;
  cancelOrder: (orderNumber: string) => Promise<void>;
  updateOrderTracking: (orderNumber: string, carrier: string, trackingNumber: string) => Promise<void>;
  retryOrderEmails: (orderNumber: string) => Promise<{ confirmation: string; shipment: string }>;
  isAuthenticated: boolean; authReady: boolean; customerAccount: CustomerAccount | null; wholesaleMoq: number;
  catalogLoadStatus: CatalogLoadStatus; retryCatalogLoad: () => void;
  login: (email: string, password: string) => Promise<void>; customerLogin: (email: string, password: string) => Promise<void>; registerCustomer: (name: string, email: string, password: string) => Promise<boolean>; refreshCustomerAccount: () => Promise<void>;
  requestPasswordReset: (email: string, audience?: 'admin'|'customer') => Promise<void>; updatePassword: (password: string) => Promise<void>; changePassword: (password: string) => Promise<void>; logout: () => Promise<void>;
}
const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<PersistedState>(() => {
    const restored = readSavedState();
    return supabaseReady ? { ...restored, products: [], collections: [] } : restored;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [customerAccount, setCustomerAccount] = useState<CustomerAccount | null>(null);
  const [authReady, setAuthReady] = useState(!supabaseReady);
  const [catalogLoadStatus, setCatalogLoadStatus] = useState<CatalogLoadStatus>(supabaseReady ? 'loading' : 'demo');
  const [catalogRetry, setCatalogRetry] = useState(0);
  const retryCatalogLoad = useCallback(() => setCatalogRetry(attempt => attempt + 1), []);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, serializePersistedState(state)); } catch (error) { console.error('Could not save DAIRI local data', error); } }, [state]);
  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    let active = true;
    const resolveAccount = async (session: import('@supabase/supabase-js').Session | null) => {
      if (!session) { if (active) { setIsAuthenticated(false); setCustomerAccount(null); setAuthReady(true); } return; }
      const { data, error } = await supabase.from('profiles').select('id,email,display_name,role,wholesale_status,company_name,wholesale_moq').eq('id', session.user.id).maybeSingle();
      if (active) {
        setIsAuthenticated(!error && data?.role === 'admin');
        setCustomerAccount(!error && data?.role === 'customer' ? { id: data.id, email: data.email, displayName: data.display_name, wholesaleStatus: data.wholesale_status ?? 'none', companyName: data.company_name ?? '', wholesaleMoq: data.wholesale_moq ?? 12 } : null);
        setAuthReady(true);
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        try { sessionStorage.removeItem(GUEST_ORDER_SESSION_KEY); clearCheckoutIdempotencyStorage(sessionStorage); } catch { clearCheckoutIdempotencyStorage(); }
      }
      // Leave Supabase's auth lock before querying the profile.
      window.setTimeout(() => { void resolveAccount(session); }, 0);
    });
    void supabase.auth.getSession().then(({ data, error }) => { if (active && !error) void resolveAccount(data.session); else if (active) setAuthReady(true); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!supabase) { setCatalogLoadStatus('demo'); return; }
    let active = true;
    const loadCatalog = async () => {
      setCatalogLoadStatus('loading');
      setState(current => ({ ...current, products: [], collections: [] }));
      try {
        const [productResult, collectionResult, variantResult, wholesaleResult] = await Promise.all([
          supabase.from('products').select('*').order('created_at', { ascending: false }),
          supabase.from('collections').select('*').order('created_at', { ascending: false }),
          supabase.from('product_variants').select('*').order('sku'),
          isAuthenticated || customerAccount?.wholesaleStatus === 'approved' ? supabase.from('wholesale_variant_prices').select('variant_id,price') : Promise.resolve({ data: [], error: null }),
        ]);
        if (!active) return;
        const catalogError = getCatalogLoadError([
          { label: 'products', error: productResult.error },
          { label: 'collections', error: collectionResult.error },
          { label: 'product variants', error: variantResult.error },
          { label: 'wholesale prices', error: wholesaleResult.error },
        ]);
        if (catalogError || !productResult.data || !collectionResult.data || !variantResult.data || !wholesaleResult.data) {
          console.error('DAIRI catalog could not be loaded', catalogError ?? 'An expected catalog response was empty.');
          setState(current => ({ ...current, products: [], collections: [] }));
          setCatalogLoadStatus('error');
          return;
        }
        const grouped = new Map<string, ProductVariant[]>();
        const wholesalePrices = new Map(((wholesaleResult.data ?? []) as WholesalePriceRow[]).map(row => [row.variant_id, Number(row.price)]));
        for (const row of (variantResult.data ?? []) as ProductVariantRow[]) grouped.set(row.product_id, [...(grouped.get(row.product_id) ?? []), variantFromRow(row, wholesalePrices.get(row.id))]);
        setState(current => ({ ...current, products: (productResult.data as ProductRow[]).map(row => productFromRow(row, grouped.get(row.id) ?? [])) }));
        setState(current => ({ ...current, collections: (collectionResult.data as CollectionRow[]).map(collectionFromRow) }));
        setCatalogLoadStatus(hasDemoProducts(productResult.data as ProductRow[]) ? 'demo' : 'ready');
        if (isAuthenticated) {
          const [lookbookResult, settingsResult] = await Promise.all([
            supabase.from('lookbooks').select('*').order('created_at', { ascending: false }),
            supabase.from('store_settings').select('*').eq('id', 'default').maybeSingle(),
          ]);
          if (!active) return;
          if (lookbookResult.error) console.error('Could not load DAIRI lookbooks', lookbookResult.error.message);
          else if (lookbookResult.data) setState(current => ({ ...current, lookbooks: (lookbookResult.data as LookbookRow[]).map(lookbookFromRow) }));
          if (settingsResult.error) console.error('Could not load DAIRI store settings', settingsResult.error.message);
          else if (settingsResult.data) setState(current => ({ ...current, settings: settingsFromRow(settingsResult.data as StoreSettingsRow) }));
        }
      } catch (error) {
        if (!active) return;
        console.error('DAIRI catalog request failed', error instanceof Error ? error.message : 'Unknown catalog error');
        setState(current => ({ ...current, products: [], collections: [] }));
        setCatalogLoadStatus('error');
      }
    };
    void loadCatalog();
    return () => { active = false; };
  }, [isAuthenticated, customerAccount?.wholesaleStatus, catalogRetry]);
  useEffect(() => {
    if (!supabase || !isAuthenticated) return;
    let active = true;
    void Promise.all([
      supabase.from('orders').select('id,order_number,customer_name,customer_email,shipping_address,subtotal,discount,discount_code,shipping,tax,total,status,created_at,tracking_carrier,tracking_number,shipped_at').order('created_at', { ascending: false }),
      supabase.from('order_items').select('order_id,product_id,product_name,size,quantity,unit_price,image,variant_id,sku,color'),
      supabase.from('support_requests').select('email,message,created_at').order('created_at', { ascending: false }),
      supabase.from('newsletter_subscribers').select('email').is('unsubscribed_at', null).order('consented_at', { ascending: false }),
    ]).then(([ordersResult, itemsResult, supportResult, subscribersResult]) => {
      if (!active) return;
      if (!ordersResult.error && !itemsResult.error) {
        const itemsByOrder = new Map<string, CartItem[]>();
        for (const item of itemsResult.data ?? []) itemsByOrder.set(item.order_id, [...(itemsByOrder.get(item.order_id) ?? []), { productId: item.product_id ?? item.product_name, variantId: item.variant_id ?? '', sku: item.sku ?? '', color: item.color ?? '', size: item.size, quantity: item.quantity }]);
        const orders: LocalOrder[] = (ordersResult.data ?? []).map(row => ({ id: row.order_number, createdAt: row.created_at, customer: { name: row.customer_name, email: row.customer_email, address: String(row.shipping_address?.address ?? ''), city: String(row.shipping_address?.city ?? ''), region: String(row.shipping_address?.region ?? ''), postalCode: String(row.shipping_address?.postalCode ?? ''), country: String(row.shipping_address?.country ?? '') }, items: itemsByOrder.get(row.id) ?? [], subtotal: Number(row.subtotal ?? row.total), discount: Number(row.discount ?? 0), discountCode: row.discount_code ?? undefined, shipping: Number(row.shipping ?? 0), tax: Number(row.tax ?? 0), shippingConfigured: row.shipping_address?.shippingConfigured, taxConfigured: row.shipping_address?.taxConfigured, total: Number(row.total), status: row.status, trackingCarrier: row.tracking_carrier ?? undefined, trackingNumber: row.tracking_number ?? undefined, shippedAt: row.shipped_at ?? undefined }));
        setState(s => ({ ...s, orders }));
      }
      if (!supportResult.error) setState(s => ({ ...s, supportRequests: (supportResult.data ?? []).map(row => ({ email: row.email, message: row.message, createdAt: row.created_at })) }));
      if (!subscribersResult.error) setState(s => ({ ...s, subscribers: (subscribersResult.data ?? []).map(row => row.email) }));
    });
    return () => { active = false; };
  }, [isAuthenticated]);
  const value = useMemo<AppContextType>(() => ({
    ...state, isAuthenticated, authReady, customerAccount, wholesaleMoq: customerAccount?.wholesaleMoq ?? 12, catalogLoadStatus, retryCatalogLoad,
    addProduct: async product => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const row = await productToRow(product);
      const { error } = await supabase.from('products').insert(row);
      if (error) throw new Error(error.message);
      try { await saveProductVariants(product.id, product.variants ?? []); }
      catch (variantError) { await supabase.from('products').delete().eq('id', product.id); throw variantError; }
      const saved = productFromRow(row as ProductRow, product.variants ?? []);
      setState(s => ({ ...s, products: [saved, ...s.products] }));
    },
    updateProduct: async (id, patch) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const current = state.products.find(product => product.id === id);
      if (!current) throw new Error('Product not found.');
      const next = { ...current, ...patch };
      const row = await productToRow(next);
      const { error } = await supabase.from('products').update(row).eq('id', id);
      if (error) throw new Error(error.message);
      if (patch.variants) await saveProductVariants(id, patch.variants);
      const saved = productFromRow(row as ProductRow, next.variants ?? []);
      setState(s => ({ ...s, products: s.products.map(product => product.id === id ? saved : product) }));
    },
    deleteProduct: async id => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setState(s => ({ ...s, products: s.products.filter(p => p.id !== id), cart: s.cart.filter(i => i.productId !== id), wishlist: s.wishlist.filter(i => i !== id) }));
    },
    deleteProducts: async ids => {
      if (!supabase) throw new Error('Supabase is not configured.');
      if (!ids.length) return;
      const { error } = await supabase.from('products').delete().in('id', ids);
      if (error) throw new Error(error.message);
      setState(s => ({ ...s, products: s.products.filter(p => !ids.includes(p.id)), cart: s.cart.filter(i => !ids.includes(i.productId)), wishlist: s.wishlist.filter(i => !ids.includes(i)) }));
    },
    addCollection: async collection => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error } = await supabase.from('collections').insert(collectionToRow(collection));
      if (error) throw new Error(error.message);
      setState(s => ({ ...s, collections: [collection, ...s.collections] }));
    },
    updateCollection: async (id, patch) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const current = state.collections.find(collection => collection.id === id);
      if (!current) throw new Error('Collection not found.');
      const next = { ...current, ...patch };
      if (patch.name && patch.name !== current.name) {
        const productsResult = await supabase.from('products').update({ collection: patch.name }).eq('collection', current.name);
        if (productsResult.error) throw new Error(productsResult.error.message);
      }
      const { error } = await supabase.from('collections').update(collectionToRow(next)).eq('id', id);
      if (error) throw new Error(error.message);
      setState(s => ({ ...s, collections: s.collections.map(collection => collection.id === id ? next : collection), products: patch.name && patch.name !== current.name ? s.products.map(p => p.collection === current.name ? { ...p, collection: patch.name! } : p) : s.products }));
    },
    deleteCollection: async id => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const current = state.collections.find(collection => collection.id === id);
      if (!current) throw new Error('Collection not found.');
      const productsResult = await supabase.from('products').update({ collection: '' }).eq('collection', current.name);
      if (productsResult.error) throw new Error(productsResult.error.message);
      const { error } = await supabase.from('collections').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setState(s => ({ ...s, collections: s.collections.filter(collection => collection.id !== id), products: s.products.map(p => p.collection === current.name ? { ...p, collection: '' } : p) }));
    },
    addLookbook: async lookbook => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const row = await lookbookToRow(lookbook);
      const { error } = await supabase.from('lookbooks').insert(row);
      if (error) throw new Error(error.message);
      setState(s => ({ ...s, lookbooks: [lookbookFromRow(row as LookbookRow), ...s.lookbooks] }));
    },
    updateLookbook: async (id, patch) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const current = state.lookbooks.find(book => book.id === id);
      if (!current) throw new Error('Lookbook not found.');
      const next = { ...current, ...patch };
      const row = await lookbookToRow(next);
      const { error } = await supabase.from('lookbooks').update(row).eq('id', id);
      if (error) throw new Error(error.message);
      const saved = lookbookFromRow(row as LookbookRow);
      setState(s => ({ ...s, lookbooks: s.lookbooks.map(book => book.id === id ? saved : book) }));
    },
    addToCart: (productId, variantId, size, color, quantity = 1) => setState(s => { const exists = s.cart.find(i => i.variantId === variantId); return { ...s, cart: exists ? s.cart.map(i => i === exists ? { ...i, quantity: i.quantity + quantity } : i) : [...s.cart, { productId, variantId, size, color, quantity }] }; }),
    setCartQuantity: (productId, variantId, quantity) => setState(s => ({ ...s, cart: quantity <= 0 ? s.cart.filter(i => i.productId !== productId || i.variantId !== variantId) : s.cart.map(i => i.productId === productId && i.variantId === variantId ? { ...i, quantity } : i) })),
    removeFromCart: (productId, variantId) => setState(s => ({ ...s, cart: s.cart.filter(i => i.productId !== productId || i.variantId !== variantId) })),
    clearCart: () => setState(s => ({ ...s, cart: [] })),
    toggleWishlist: id => setState(s => ({ ...s, wishlist: s.wishlist.includes(id) ? s.wishlist.filter(x => x !== id) : [...s.wishlist, id] })),
    placeOrder: async customer => {
      if (!supabase) throw new Error('Local backend is unavailable. Please try again later.');
      const intent = { customer, items: state.cart, accountId: customerAccount?.id ?? null };
      let sessionStore: Storage | undefined;
      try { sessionStore = sessionStorage; } catch { /* The request still receives an in-memory retry key. */ }
      const idempotencyKey = await getCheckoutIdempotencyKey(intent, sessionStore);
      const { data, error } = await supabase.functions.invoke('customer-actions', { body: { action: 'order', idempotencyKey, customer, items: state.cart } });
      if (error) throw new Error(await functionErrorMessage(error, data));
      const order = data?.order as LocalOrder | undefined;
      if (!order) throw new Error('The order could not be confirmed. Please try again.');
      await clearCheckoutIdempotencyKey(intent, sessionStore);
      try { sessionStorage.setItem(GUEST_ORDER_SESSION_KEY, serializeGuestOrder(order)); } catch { /* Keep the in-memory confirmation available for this navigation. */ }
      setState(s => ({ ...s, orders: [order, ...s.orders], cart: [] }));
      return order;
    },
    cancelOrder: async orderNumber => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error } = await supabase.rpc('cancel_unpaid_order', { p_order_number: orderNumber });
      if (error) throw new Error(error.message);
      setState(s => ({ ...s, orders: s.orders.map(order => order.id === orderNumber ? { ...order, status: 'cancelled' } : order) }));
    },
    updateOrderTracking: async (orderNumber, carrier, trackingNumber) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const normalizedCarrier = carrier.trim();
      const normalizedTrackingNumber = trackingNumber.trim();
      if (!normalizedCarrier || !normalizedTrackingNumber) throw new Error('Choose a carrier and enter a tracking number.');
      const { data, error } = await supabase.functions.invoke('customer-actions', { body: { action: 'update-tracking', orderNumber, carrier: normalizedCarrier, trackingNumber: normalizedTrackingNumber } });
      if (error || data?.error) throw new Error(data?.error ?? error.message);
      setState(s => ({ ...s, orders: s.orders.map(order => order.id === orderNumber ? { ...order, status: 'shipped', trackingCarrier: normalizedCarrier, trackingNumber: normalizedTrackingNumber, shippedAt: new Date().toISOString() } : order) }));
    },
    retryOrderEmails: async orderNumber => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { data, error } = await supabase.functions.invoke('customer-actions', { body: { action: 'retry-order-email', orderNumber } });
      if (error || data?.error) throw new Error(data?.error ?? error.message);
      return { confirmation: String(data?.confirmation ?? 'unknown'), shipment: String(data?.shipment ?? 'unknown') };
    },
    subscribe: async email => {
      if (!supabase) throw new Error('Local backend is unavailable. Please try again later.');
      const { data, error } = await supabase.functions.invoke('customer-actions', { body: { action: 'subscribe', email } });
      if (error) throw new Error(data?.error ?? error.message);
      const normalized = email.trim().toLowerCase();
      setState(s => ({ ...s, subscribers: s.subscribers.includes(normalized) ? s.subscribers : [...s.subscribers, normalized] }));
    },
    submitSupportRequest: async (email, message) => {
      if (!supabase) throw new Error('Local backend is unavailable. Please try again later.');
      const { data, error } = await supabase.functions.invoke('customer-actions', { body: { action: 'support', email, message } });
      if (error) throw new Error(data?.error ?? error.message);
      setState(s => ({ ...s, supportRequests: [{ email: email.trim().toLowerCase(), message: message.trim(), createdAt: new Date().toISOString() }, ...s.supportRequests] }));
    },
    updateSettings: async patch => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const next = { ...state.settings, ...patch };
      const row = await settingsToRow(next);
      const { error } = await supabase.from('store_settings').upsert(row, { onConflict: 'id' });
      if (error) throw new Error(error.message);
      setState(s => ({ ...s, settings: settingsFromRow(row as StoreSettingsRow) }));
    },
    login: async (email, password) => {
      if (!supabase) throw new Error('Supabase is not configured. Start the local backend and add the VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY values to .env.local.');
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.message);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign-in could not be verified. Please try again.');
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (profileError || profile?.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('This account does not have DAIRI administrator access.');
      }
      setIsAuthenticated(true);
    },
    customerLogin: async (email, password) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.message);
      const { data: profile, error: profileError } = await supabase.from('profiles').select('id,email,display_name,role,wholesale_status,company_name,wholesale_moq').eq('id', data.user.id).maybeSingle();
      if (profileError || profile?.role !== 'customer') {
        await supabase.auth.signOut();
        throw new Error('This sign-in is not a DAIRI customer account. Use the administrator sign-in for staff access.');
      }
      setCustomerAccount({ id: profile.id, email: profile.email, displayName: profile.display_name, wholesaleStatus: profile.wholesale_status ?? 'none', companyName: profile.company_name ?? '', wholesaleMoq: profile.wholesale_moq ?? 12 });
      setIsAuthenticated(false);
    },
    registerCustomer: async (name, email, password) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: { data: { name: name.trim() }, emailRedirectTo: `${window.location.origin}/store/account` },
      });
      if (error) throw new Error(error.message);
      if (data.session && data.user) {
        const { data: profile } = await supabase.from('profiles').select('id,email,display_name,role,wholesale_status,company_name,wholesale_moq').eq('id', data.user.id).maybeSingle();
        if (profile?.role === 'customer') setCustomerAccount({ id: profile.id, email: profile.email, displayName: profile.display_name, wholesaleStatus: profile.wholesale_status ?? 'none', companyName: profile.company_name ?? '', wholesaleMoq: profile.wholesale_moq ?? 12 });
      }
      return !data.session;
    },
    refreshCustomerAccount: async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCustomerAccount(null); return; }
      const { data, error } = await supabase.from('profiles').select('id,email,display_name,role,wholesale_status,company_name,wholesale_moq').eq('id', user.id).maybeSingle();
      if (!error && data?.role === 'customer') setCustomerAccount({ id: data.id, email: data.email, displayName: data.display_name, wholesaleStatus: data.wholesale_status ?? 'none', companyName: data.company_name ?? '', wholesaleMoq: data.wholesale_moq ?? 12 });
    },
    requestPasswordReset: async (email, audience = 'admin') => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const redirectTo = `${window.location.origin}/auth/update-password${audience === 'customer' ? '?audience=customer' : ''}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw new Error(error.message);
    },
    updatePassword: async password => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('This password reset link is invalid or has expired. Request a new one.');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      await supabase.auth.signOut();
      setIsAuthenticated(false);
    },
    changePassword: async password => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('Your administrator session has expired. Sign in again.');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
    },
    logout: async () => { if (supabase) { const { error } = await supabase.auth.signOut(); if (error) throw new Error(error.message); } try { sessionStorage.removeItem(GUEST_ORDER_SESSION_KEY); } catch { /* Ignore unavailable storage. */ } clearCheckoutIdempotencyStorage(); setIsAuthenticated(false); setCustomerAccount(null); },
  }), [state, isAuthenticated, authReady, customerAccount, catalogLoadStatus, retryCatalogLoad]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
export const useApp = () => { const context = useContext(AppContext); if (!context) throw new Error('useApp must be used within AppProvider'); return context; };
