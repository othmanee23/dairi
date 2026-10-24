import { useApp } from '../../context/AppContext';

export function CatalogStatusBanner() {
  const { catalogLoadStatus, retryCatalogLoad } = useApp();
  if (catalogLoadStatus === 'ready') return null;

  const message = catalogLoadStatus === 'demo'
    ? 'Preview catalog · sample products, prices, and inventory are not live.'
    : catalogLoadStatus === 'loading'
      ? 'Connecting to the DAIRI catalog…'
      : 'The live catalog is temporarily unavailable. Sample and cached products are hidden.';

  return (
    <div role={catalogLoadStatus === 'error' ? 'alert' : 'status'} aria-live="polite" className="flex flex-wrap items-center justify-center gap-3 border-b border-black/10 bg-[#f7f4ee] px-4 py-3 text-center text-xs text-black/75">
      <span>{message}</span>
      {catalogLoadStatus === 'error' && <button type="button" onClick={retryCatalogLoad} className="font-semibold underline underline-offset-2">Try again</button>}
    </div>
  );
}
