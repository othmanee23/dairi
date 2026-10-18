import { Suspense } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AppProvider } from './context/AppContext';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <AppProvider>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm tracking-[0.2em] text-black/50">DAIRI</div>}>
        <RouterProvider router={router} />
      </Suspense>
      <Toaster position="bottom-right" />
    </AppProvider>
  );
}
