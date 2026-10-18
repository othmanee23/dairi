import { createBrowserRouter, Navigate } from 'react-router';
import { RootLayout } from './layouts/RootLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { Login } from './pages/auth/Login';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { Dashboard } from './pages/dashboard/Dashboard';
import { ProductsList } from './pages/products/ProductsList';
import { ProductForm } from './pages/products/ProductForm';
import { CollectionsList } from './pages/collections/CollectionsList';
import { CollectionDetail } from './pages/collections/CollectionDetail';
import { LookbookGenerator } from './pages/lookbooks/LookbookGenerator';
import { LookbookPreview } from './pages/lookbooks/LookbookPreview';
import { Settings } from './pages/settings/Settings';
import { StoreFront } from './pages/store/StoreFront';
import { ShopAll } from './pages/store/ShopAll';
import { ProductDetail } from './pages/store/ProductDetail';
import { Journal } from './pages/store/Journal';
import { JournalArticle } from './pages/store/JournalArticle';
import { Support } from './pages/store/Support';
import { Cart } from './pages/store/Cart';
import { Wishlist } from './pages/store/Wishlist';

export const router = createBrowserRouter([
  {
    path: '/store',
    Component: StoreFront,
  },
  {
    path: '/store/shop',
    Component: ShopAll,
  },
  {
    path: '/store/products/:id',
    Component: ProductDetail,
  },
  {
    path: '/store/journal',
    Component: Journal,
  },
  {
    path: '/store/journal/:id',
    Component: JournalArticle,
  },
  {
    path: '/store/support',
    Component: Support,
  },
  {
    path: '/store/cart',
    Component: Cart,
  },
  {
    path: '/store/wishlist',
    Component: Wishlist,
  },
  {
    path: '/auth',
    Component: AuthLayout,
    children: [
      { index: true, element: <Navigate to="/auth/login" replace /> },
      { path: 'login', Component: Login },
      { path: 'forgot-password', Component: ForgotPassword },
    ],
  },
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'products', Component: ProductsList },
      { path: 'products/new', Component: ProductForm },
      { path: 'products/:id/edit', Component: ProductForm },
      { path: 'collections', Component: CollectionsList },
      { path: 'collections/:id', Component: CollectionDetail },
      { path: 'lookbooks', Component: LookbookGenerator },
      { path: 'lookbooks/:id/preview', Component: LookbookPreview },
      { path: 'settings', Component: Settings },
    ],
  },
]);
