import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useParams, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '../../types';
import dairiLogo from '../../../imports/dairi-logo.svg';

const layoutSpecs = {
  minimal: { perPage: 4, columns: 2 },
  editorial: { perPage: 9, columns: 3 },
  magazine: { perPage: 6, columns: 2 },
};
const formatSpecs = {
  a4: { width: 210, height: 297, label: 'A4' },
  square: { width: 210, height: 210, label: 'Square' },
  portrait: { width: 148, height: 210, label: 'Portrait' },
};

function chunkProducts(products: Product[], perPage: number) {
  const pages: Product[][] = [];
  for (let i = 0; i < products.length; i += perPage) {
    pages.push(products.slice(i, i + perPage));
  }
  return pages.length > 0 ? pages : [[]];
}

function getCatalogNumber(product: Product, index: number) {
  const numericId = Number(product.id);
  if (Number.isFinite(numericId)) {
    return String(2000 + numericId * 67);
  }
  return String(2000 + (index + 1) * 67);
}

function CatalogCoverPage({
  title,
  image,
  format,
}: {
  title: string;
  image: string;
  format: keyof typeof formatSpecs;
}) {
  return (
    <div className="lookbook-catalog-page lookbook-cover-page bg-[#f8f7f4] text-black" style={{ aspectRatio: `${formatSpecs[format].width} / ${formatSpecs[format].height}` }}>
      <div className="lookbook-cover-masthead">
        <img src={dairiLogo} alt="DAIRI" className="lookbook-cover-logo" />
        <h2>{title || 'COLLECTION TITLE'}</h2>
      </div>
      <div className="lookbook-cover-image">
        {image ? (
          <ImageWithFallback
            src={image}
            alt={title || 'Lookbook cover'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="lookbook-cover-placeholder">
            <span>Upload a cover image</span>
          </div>
        )}
        <span className="lookbook-cover-side lookbook-cover-side-left">DAIRI FASHION</span>
        <span className="lookbook-cover-side lookbook-cover-side-right">WWW.DAIRIFASHION.COM</span>
      </div>
    </div>
  );
}

function CatalogPage({
  title,
  pageNumber,
  products,
  startIndex,
  layout,
  format,
}: {
  title: string;
  pageNumber: number;
  products: Product[];
  startIndex: number;
  layout: keyof typeof layoutSpecs;
  format: keyof typeof formatSpecs;
}) {
  const slots = Array.from({ length: layoutSpecs[layout].perPage }, (_, index) => products[index] || null);

  return (
    <div className="lookbook-catalog-page bg-[#f8f7f4] text-black" style={{ aspectRatio: `${formatSpecs[format].width} / ${formatSpecs[format].height}` }}>
      <header className="lookbook-catalog-header">
        <div className="lookbook-catalog-brand">
          <img src={dairiLogo} alt="DAIRI" />
          <p>{title || 'DAIRI CATALOG'}</p>
        </div>
        <p>PAGE-{pageNumber}</p>
      </header>

      <main className="lookbook-catalog-grid" style={{ gridTemplateColumns: `repeat(${layoutSpecs[layout].columns}, minmax(0, 1fr))` }}>
        {slots.map((product, index) => (
          <div key={product?.id || `empty-${index}`} className="lookbook-catalog-item">
            {product ? (
              <>
                <div className="lookbook-catalog-image">
                  <ImageWithFallback
                    src={product.images[0]}
                    alt={product.name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="lookbook-catalog-caption">
                  <p className="lookbook-catalog-number">
                    {getCatalogNumber(product, startIndex + index)}
                  </p>
                  <p className="lookbook-catalog-price">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 0,
                    }).format(product.price)}
                  </p>
                </div>
              </>
            ) : (
              <div className="lookbook-catalog-empty" />
            )}
          </div>
        ))}
      </main>

      <footer className="lookbook-catalog-footer">
        <div>
          <p>WWW.DAIRIFASHION.COM</p>
          <p>850 S BROADWAY | #402 | LOS ANGELES, CA 90014</p>
        </div>
        <div className="text-right">
          <p>PHONE: 1(213) 624-1258</p>
          <p>FAX: 1(213) 624-0087</p>
        </div>
      </footer>
    </div>
  );
}

export function LookbookPreview() {
  const { id } = useParams();
  const { lookbooks, products, settings, updateLookbook } = useApp();
  const [currentPage, setCurrentPage] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const lookbook = lookbooks.find((l) => l.id === id);

  if (!lookbook) {
    return (
      <div className="admin-page p-8 lg:p-10">
        <div className="max-w-7xl mx-auto text-center py-16">
          <p className="text-neutral-600">Lookbook not found</p>
          <Link to="/lookbooks" className="text-sm underline mt-4 inline-block">
            Back to lookbooks
          </Link>
        </div>
      </div>
    );
  }

  const lookbookProducts = lookbook.productIds
    .map((pid) => products.find((p) => p.id === pid))
    .filter(Boolean) as Product[];

  const layoutSpec = layoutSpecs[lookbook.layout];
  const formatSpec = formatSpecs[lookbook.format];
  const productPages = chunkProducts(lookbookProducts, layoutSpec.perPage);
  const totalPages = productPages.length;
  const totalPreviewPages = totalPages + 1;
  const isCoverPage = currentPage === 0;
  const productPageIndex = currentPage - 1;
  const currentProducts = productPages[Math.max(0, productPageIndex)] || [];

  const handleDownload = () => {
    setIsGenerating(true);
    toast.info('Opening print dialog. Choose “Save as PDF” to export.');
    setTimeout(() => {
      window.print();
      setIsGenerating(false);
    }, 150);
  };

  const handleRegenerate = () => {
    updateLookbook(lookbook.id, { layout: settings.defaultLayout, format: settings.defaultFormat, productIds: lookbook.productIds.filter(id => products.some(product => product.id === id)) });
    setCurrentPage(0);
    toast.success('Lookbook refreshed with current defaults');
  };

  return (
    <div className="admin-page p-8 lg:p-10">
      <div className="max-w-5xl mx-auto">
        <Link
          to="/lookbooks"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to lookbooks
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[3px] text-black/40">
              Catalog PDF
            </p>
            <h1 className="text-4xl mb-2 font-medium tracking-tight">{lookbook.name}</h1>
            <p className="text-neutral-600">
              {lookbookProducts.length} products · {layoutSpec.perPage} products per page · {formatSpec.label} {lookbook.layout} layout
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRegenerate}
              variant="outline"
              className="admin-button border-neutral-300 rounded-none h-12 px-6"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              className="admin-button bg-black text-white hover:bg-neutral-800 rounded-none h-12 px-6"
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? 'Preparing...' : 'Download PDF'}
            </Button>
          </div>
        </div>

        <div className="bg-neutral-100 p-6 lg:p-12 flex flex-col items-center">
          <div className="w-full max-w-[620px] shadow-2xl">
            {isCoverPage ? (
              <CatalogCoverPage
                title={lookbook.coverTitle || lookbook.name}
                image={lookbook.coverImage || ''}
                format={lookbook.format}
              />
            ) : (
              <CatalogPage
                title={lookbook.coverTitle || lookbook.name}
                pageNumber={Math.max(0, productPageIndex) + 2}
                products={currentProducts}
                startIndex={Math.max(0, productPageIndex) * layoutSpec.perPage}
                layout={lookbook.layout}
                format={lookbook.format}
              />
            )}
          </div>

          <div className="flex items-center gap-6 mt-8">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="p-2 hover:bg-neutral-200 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-neutral-600">
              Page {currentPage + 1} of {totalPreviewPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPreviewPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPreviewPages - 1}
              className="p-2 hover:bg-neutral-200 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="admin-panel mt-8 p-6">
          <h2 className="text-lg mb-4 tracking-tight">Export Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-neutral-600 uppercase tracking-wider text-xs mb-1">Format</p>
              <p>{formatSpec.label} · {formatSpec.width} × {formatSpec.height} mm</p>
            </div>
            <div>
              <p className="text-neutral-600 uppercase tracking-wider text-xs mb-1">Layout</p>
              <p>{layoutSpec.columns} columns × {Math.ceil(layoutSpec.perPage / layoutSpec.columns)} rows</p>
            </div>
            <div>
              <p className="text-neutral-600 uppercase tracking-wider text-xs mb-1">Products</p>
              <p>{lookbookProducts.length} items across {totalPages} page{totalPages === 1 ? '' : 's'}</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`@media print { @page { margin: 0; size: ${formatSpec.width}mm ${formatSpec.height}mm; } .lookbook-print-root { width: ${formatSpec.width}mm !important; } .lookbook-print-root .lookbook-catalog-page { height: ${formatSpec.height}mm !important; width: ${formatSpec.width}mm !important; } }`}</style>
      <div className="lookbook-print-root" aria-hidden="true">
        <CatalogCoverPage
          title={lookbook.coverTitle || lookbook.name}
          image={lookbook.coverImage || ''}
          format={lookbook.format}
        />
        {productPages.map((pageProducts, pageIndex) => (
          <CatalogPage
            key={pageIndex}
            title={lookbook.coverTitle || lookbook.name}
            pageNumber={pageIndex + 2}
            products={pageProducts}
            startIndex={pageIndex * layoutSpec.perPage}
            layout={lookbook.layout}
            format={lookbook.format}
          />
        ))}
      </div>
    </div>
  );
}
