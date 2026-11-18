export type ProductStatus = 'published' | 'draft';

export interface ProductVariant {
  id: string;
  sku: string;
  color: string;
  colorHex?: string;
  size: string;
  retailPrice?: number;
  wholesalePrice?: number;
  inventoryQuantity: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  styleNumber?: string;
  name: string;
  price: number;
  images: string[];
  category: string;
  collection: string;
  collectionId?: string;
  subcollectionId?: string;
  description: string;
  tags: string[];
  status: ProductStatus;
  showOnWebsite: boolean;
  createdAt: string;
  color?: string;
  colorHex?: string;
  details?: string[];
  material?: string;
  productLength?: string;
  productWidth?: string;
  sleeveType?: string;
  inseam?: string;
  fit?: string;
  care?: string;
  sizes?: string[];
  variants?: ProductVariant[];
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  season: string;
  image: string;
  productCount: number;
}

export interface Subcollection {
  id: string;
  collectionId: string;
  name: string;
  sortOrder: number;
}

export interface LookbookSection {
  collectionId: string;
  collectionName: string;
  subcollectionId?: string;
  subcollectionName: string;
  productIds: string[];
}

export interface Lookbook {
  id: string;
  name: string;
  createdAt: string;
  productIds: string[];
  sections?: LookbookSection[];
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
