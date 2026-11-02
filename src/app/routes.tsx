import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { RootLayout } from './layouts/RootLayout';
import { AuthLayout } from './layouts/AuthLayout';

const StoreFront = lazy(() => import('./pages/store/StoreFront').then(module => ({ default: module.StoreFront })));
const ShopAll = lazy(() => import('./pages/store/ShopAll').then(module => ({ default: module.ShopAll })));
const ProductDetail = lazy(() => import('./pages/store/ProductDetail').then(module => ({ default: module.ProductDetail })));
const StoreCollection = lazy(() => import('./pages/store/StoreCollection').then(module => ({ default: module.StoreCollection })));
const CloseoutSale = lazy(() => import('./pages/store/CloseoutSale').then(module => ({ default: module.CloseoutSale })));
const Journal = lazy(() => import('./pages/store/Journal').then(module => ({ default: module.Journal })));
const JournalArticle = lazy(() => import('./pages/store/JournalArticle').then(module => ({ default: module.JournalArticle })));
const Support = lazy(() => import('./pages/store/Support').then(module => ({ default: module.Support })));
const Wholesale = lazy(() => import('./pages/store/Wholesale').then(module => ({ default: module.Wholesale })));
const WholesaleApplications = lazy(() => import('./pages/dashboard/WholesaleApplications').then(module => ({ default: module.WholesaleApplications })));
const Cart = lazy(() => import('./pages/store/Cart').then(module => ({ default: module.Cart })));
const Wishlist = lazy(() => import('./pages/store/Wishlist').then(module => ({ default: module.Wishlist })));
const Checkout = lazy(() => import('./pages/store/Checkout').then(module => ({ default: module.Checkout })));
const OrderConfirmation = lazy(() => import('./pages/store/Checkout').then(module => ({ default: module.OrderConfirmation })));
const Login = lazy(() => import('./pages/auth/Login').then(module => ({ default: module.Login })));
const CustomerLogin = lazy(() => import('./pages/auth/CustomerLogin').then(module => ({ default: module.CustomerLogin })));
const CustomerRegister = lazy(() => import('./pages/auth/CustomerRegister').then(module => ({ default: module.CustomerRegister })));
const CustomerAccount = lazy(() => import('./pages/store/CustomerAccount').then(module => ({ default: module.CustomerAccount })));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const UpdatePassword = lazy(() => import('./pages/auth/UpdatePassword').then(module => ({ default: module.UpdatePassword })));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const ClientActivity = lazy(() => import('./pages/dashboard/ClientActivity').then(module => ({ default: module.ClientActivity })));
const ProductsList = lazy(() => import('./pages/products/ProductsList').then(module => ({ default: module.ProductsList })));
const ProductForm = lazy(() => import('./pages/products/ProductForm').then(module => ({ default: module.ProductForm })));
const CollectionsList = lazy(() => import('./pages/collections/CollectionsList').then(module => ({ default: module.CollectionsList })));
const CollectionDetail = lazy(() => import('./pages/collections/CollectionDetail').then(module => ({ default: module.CollectionDetail })));
const CollectionForm = lazy(() => import('./pages/collections/CollectionForm').then(module => ({ default: module.CollectionForm })));
const LookbookGenerator = lazy(() => import('./pages/lookbooks/LookbookGenerator').then(module => ({ default: module.LookbookGenerator })));
const LookbookPreview = lazy(() => import('./pages/lookbooks/LookbookPreview').then(module => ({ default: module.LookbookPreview })));
const Settings = lazy(() => import('./pages/settings/Settings').then(module => ({ default: module.Settings })));

function RouteErrorFallback() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf8] px-6 text-center text-[#171717]">
      <p className="mb-4 text-xs uppercase tracking-[0.24em] text-black/45">DAIRI</p>
      <h1 className="text-2xl font-medium">This page couldn’t be loaded</h1>
      <p className="mt-3 max-w-md text-sm text-black/60">Please try again. If the problem continues, return to the storefront.</p>
      <div className="mt-7 flex gap-3">
        <button type="button" onClick={() => window.location.reload()} className="border border-black px-5 py-3 text-xs uppercase tracking-wider">Try again</button>
        <a href="/" className="bg-black px-5 py-3 text-xs uppercase tracking-wider text-white">Go to storefront</a>
      </div>
    </main>
  );
}

const appRoutes = [
  {
    path: '/',
    Component: StoreFront,
  },
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
  { path: '/store/collections/:id', Component: StoreCollection },
  { path: '/store/sale', Component: CloseoutSale },
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
  { path: '/store/wholesale', Component: Wholesale },
  { path: '/store/account', Component: CustomerAccount },
  {
    path: '/store/cart',
    Component: Cart,
  },
  {
    path: '/store/wishlist',
    Component: Wishlist,
  },
  { path: '/store/checkout', Component: Checkout },
  { path: '/store/order/:id', Component: OrderConfirmation },
  {
    path: '/auth',
    Component: AuthLayout,
    children: [
      { index: true, element: <Navigate to="/auth/login" replace /> },
      { path: 'login', Component: Login },
      { path: 'customer-login', Component: CustomerLogin },
      { path: 'register', Component: CustomerRegister },
      { path: 'forgot-password', Component: ForgotPassword },
      { path: 'update-password', Component: UpdatePassword },
    ],
  },
  {
    path: '/admin',
    Component: RootLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'activity', Component: ClientActivity },
      { path: 'wholesale-applications', Component: WholesaleApplications },
      { path: 'products', Component: ProductsList },
      { path: 'products/new', Component: ProductForm },
      { path: 'products/:id/edit', Component: ProductForm },
      { path: 'collections', Component: CollectionsList },
      { path: 'collections/new', Component: CollectionForm },
      { path: 'collections/:id/edit', Component: CollectionForm },
      { path: 'collections/:id', Component: CollectionDetail },
      { path: 'lookbooks', Component: LookbookGenerator },
      { path: 'lookbooks/:id/preview', Component: LookbookPreview },
      { path: 'settings', Component: Settings },
    ],
  },
];

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorFallback />,
    children: appRoutes,
  },
]);
