import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Product, Collection, Lookbook } from '../types';
import { mockLookbooks } from '../data/mockData';
import { storeProducts, upgradeLocalImageReference } from '../data/storeProducts';

const STORAGE_KEY = 'dairi-local-store-v1';
export interface CartItem { productId: string; quantity: number; size: string }
export interface LocalOrder { id: string; createdAt: string; customer: { name: string; email: string; address: string; city: string; postalCode: string; country: string }; items: CartItem[]; total: number; status: 'received' }
export interface LocalSettings { brandName: string; logo: string; primaryColor: string; secondaryColor: string; fontFamily: string; defaultFormat: 'a4'|'square'|'portrait'; defaultLayout: 'minimal'|'editorial'|'magazine'; email: string; name: string }
interface PersistedState { products: Product[]; collections: Collection[]; lookbooks: Lookbook[]; cart: CartItem[]; wishlist: string[]; orders: LocalOrder[]; subscribers: string[]; supportRequests: { email: string; message: string; createdAt: string }[]; settings: LocalSettings; isAuthenticated: boolean }
const initialProducts: Product[] = storeProducts.map((p) => ({
  id: p.id, name: p.name, price: p.price, images: [p.image], category: p.category, collection: 'DAIRI Edit', description: p.description,
  tags: [p.isNew ? 'new' : '', p.isBestseller ? 'bestseller' : ''].filter(Boolean), status: 'published', showOnWebsite: true, createdAt: '2026-01-01',
  color: p.color, colorHex: p.colorHex, details: p.details, material: p.material, fit: p.fit, care: p.care, sizes: p.sizes,
}));
export const initialSettings: LocalSettings = { brandName: 'DAIRI', logo: '', primaryColor: '#000000', secondaryColor: '#f5f5f5', fontFamily: 'inter', defaultFormat: 'a4', defaultLayout: 'editorial', email: 'studio@dairifashion.com', name: 'Creative Director' };
const initialState: PersistedState = { products: initialProducts, collections: [{ id: 'dairi-edit', name: 'DAIRI Edit', description: 'The latest pieces from the DAIRI studio.', season: 'Current Season', image: initialProducts[0]?.images[0] ?? '', productCount: initialProducts.length }], lookbooks: mockLookbooks, cart: [], wishlist: [], orders: [], subscribers: [], supportRequests: [], settings: initialSettings, isAuthenticated: false };
function readSavedState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const saved = JSON.parse(raw) as Partial<PersistedState>;
    return {
      ...initialState,
      ...saved,
      products: (saved.products ?? initialProducts).map(product => ({
        ...product,
        images: product.images.map(upgradeLocalImageReference),
      })),
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
  } catch { return initialState; }
}

interface AppContextType {
  products: Product[]; collections: Collection[]; lookbooks: Lookbook[]; cart: CartItem[]; wishlist: string[]; orders: LocalOrder[]; subscribers: string[]; supportRequests: PersistedState['supportRequests']; settings: LocalSettings;
  addProduct: (product: Product) => void; updateProduct: (id: string, product: Partial<Product>) => void; deleteProduct: (id: string) => void; deleteProducts: (ids: string[]) => void;
  addCollection: (collection: Collection) => void; updateCollection: (id: string, collection: Partial<Collection>) => void; deleteCollection: (id: string) => void; addLookbook: (lookbook: Lookbook) => void; updateLookbook: (id: string, lookbook: Partial<Lookbook>) => void;
  addToCart: (productId: string, size: string, quantity?: number) => void; setCartQuantity: (productId: string, size: string, quantity: number) => void; removeFromCart: (productId: string, size: string) => void; clearCart: () => void; toggleWishlist: (id: string) => void;
  placeOrder: (customer: LocalOrder['customer']) => LocalOrder | null; subscribe: (email: string) => boolean; submitSupportRequest: (email: string, message: string) => void; updateSettings: (settings: Partial<LocalSettings>) => void;
  isAuthenticated: boolean; login: () => void; logout: () => void;
}
const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<PersistedState>(readSavedState);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { console.error('Could not save DAIRI local data', error); } }, [state]);
  const value = useMemo<AppContextType>(() => ({
    ...state,
    addProduct: product => setState(s => ({ ...s, products: [product, ...s.products] })),
    updateProduct: (id, patch) => setState(s => ({ ...s, products: s.products.map(p => p.id === id ? { ...p, ...patch } : p) })),
    deleteProduct: id => setState(s => ({ ...s, products: s.products.filter(p => p.id !== id), cart: s.cart.filter(i => i.productId !== id), wishlist: s.wishlist.filter(i => i !== id) })),
    deleteProducts: ids => setState(s => ({ ...s, products: s.products.filter(p => !ids.includes(p.id)), cart: s.cart.filter(i => !ids.includes(i.productId)), wishlist: s.wishlist.filter(i => !ids.includes(i)) })),
    addCollection: collection => setState(s => ({ ...s, collections: [collection, ...s.collections] })),
    updateCollection: (id, patch) => setState(s => { const current = s.collections.find(c => c.id === id); return { ...s, collections: s.collections.map(c => c.id === id ? { ...c, ...patch } : c), products: current && patch.name ? s.products.map(p => p.collection === current.name ? { ...p, collection: patch.name! } : p) : s.products }; }),
    deleteCollection: id => setState(s => { const c = s.collections.find(x => x.id === id); return { ...s, collections: s.collections.filter(x => x.id !== id), products: c ? s.products.map(p => p.collection === c.name ? { ...p, collection: '' } : p) : s.products }; }),
    addLookbook: lookbook => setState(s => ({ ...s, lookbooks: [lookbook, ...s.lookbooks] })),
    updateLookbook: (id, patch) => setState(s => ({ ...s, lookbooks: s.lookbooks.map(book => book.id === id ? { ...book, ...patch } : book) })),
    addToCart: (productId, size, quantity = 1) => setState(s => { const exists = s.cart.find(i => i.productId === productId && i.size === size); return { ...s, cart: exists ? s.cart.map(i => i === exists ? { ...i, quantity: i.quantity + quantity } : i) : [...s.cart, { productId, size, quantity }] }; }),
    setCartQuantity: (productId, size, quantity) => setState(s => ({ ...s, cart: quantity <= 0 ? s.cart.filter(i => i.productId !== productId || i.size !== size) : s.cart.map(i => i.productId === productId && i.size === size ? { ...i, quantity } : i) })),
    removeFromCart: (productId, size) => setState(s => ({ ...s, cart: s.cart.filter(i => i.productId !== productId || i.size !== size) })),
    clearCart: () => setState(s => ({ ...s, cart: [] })),
    toggleWishlist: id => setState(s => ({ ...s, wishlist: s.wishlist.includes(id) ? s.wishlist.filter(x => x !== id) : [...s.wishlist, id] })),
    placeOrder: customer => { const total = state.cart.reduce((sum, item) => sum + (state.products.find(p => p.id === item.productId)?.price ?? 0) * item.quantity, 0); if (!state.cart.length || !total) return null; const result: LocalOrder = { id: `DR-${Date.now().toString(36).toUpperCase()}`, createdAt: new Date().toISOString(), customer, items: state.cart, total, status: 'received' }; setState(s => ({ ...s, orders: [result, ...s.orders], cart: [] })); return result; },
    subscribe: email => { const normalized = email.trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(normalized)) return false; setState(s => ({ ...s, subscribers: s.subscribers.includes(normalized) ? s.subscribers : [...s.subscribers, normalized] })); return true; },
    submitSupportRequest: (email, message) => setState(s => ({ ...s, supportRequests: [...s.supportRequests, { email, message, createdAt: new Date().toISOString() }] })),
    updateSettings: patch => setState(s => ({ ...s, settings: { ...s.settings, ...patch } })),
    login: () => setState(s => ({ ...s, isAuthenticated: true })), logout: () => setState(s => ({ ...s, isAuthenticated: false })),
  }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
export const useApp = () => { const context = useContext(AppContext); if (!context) throw new Error('useApp must be used within AppProvider'); return context; };
