import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product, Collection, Lookbook } from '../types';
import { mockProducts, mockCollections, mockLookbooks } from '../data/mockData';

interface AppContextType {
  products: Product[];
  collections: Collection[];
  lookbooks: Lookbook[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  deleteProducts: (ids: string[]) => void;
  addCollection: (collection: Collection) => void;
  addLookbook: (lookbook: Lookbook) => void;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [collections, setCollections] = useState<Collection[]>(mockCollections);
  const [lookbooks, setLookbooks] = useState<Lookbook[]>(mockLookbooks);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const addProduct = (product: Product) => {
    setProducts(prev => [product, ...prev]);
  };

  const updateProduct = (id: string, updatedProduct: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updatedProduct } : p))
    );
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const deleteProducts = (ids: string[]) => {
    setProducts(prev => prev.filter(p => !ids.includes(p.id)));
  };

  const addCollection = (collection: Collection) => {
    setCollections(prev => [collection, ...prev]);
  };

  const addLookbook = (lookbook: Lookbook) => {
    setLookbooks(prev => [lookbook, ...prev]);
  };

  const login = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AppContext.Provider
      value={{
        products,
        collections,
        lookbooks,
        addProduct,
        updateProduct,
        deleteProduct,
        deleteProducts,
        addCollection,
        addLookbook,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
