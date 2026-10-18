export type ProductStatus = 'published' | 'draft';

export interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  category: string;
  collection: string;
  description: string;
  tags: string[];
  status: ProductStatus;
  showOnWebsite: boolean;
  createdAt: string;
  color?: string;
  colorHex?: string;
  details?: string[];
  material?: string;
  fit?: string;
  care?: string;
  sizes?: string[];
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  season: string;
  image: string;
  productCount: number;
}

export interface Lookbook {
  id: string;
  name: string;
  createdAt: string;
  productIds: string[];
  layout: 'minimal' | 'editorial' | 'magazine';
  coverTitle: string;
  coverImage?: string;
  format: 'a4' | 'square' | 'portrait';
}

export interface BrandSettings {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}
