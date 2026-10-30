import { useEffect, useState } from 'react';
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
import { buildDairiLineSheetPages, chunkCatalogProducts, formatDairiPrice, hasDairiImageSource, splitPriceListPages } from './dairiLineSheet';

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
const publicWebsite = (() => {
  try {
    const value = new URL(import.meta.env.VITE_PUBLIC_SITE_URL ?? '');
    return value.protocol === 'https:' && value.pathname === '/' && !value.search && !value.hash ? value.host.replace(/^www\./i, '') : '';
  } catch { return ''; }
})();

function getCatalogNumber(product: Product, index: number) {
  return product.styleNumber?.trim() || product.variants?.find((variant) => variant.sku.trim())?.sku || `STYLE ${index + 1}`;
}

async function waitForPrintImages(selector: string) {
  const printRoot = document.querySelector(selector);
  if (printRoot) {
    await Promise.all(Array.from(printRoot.querySelectorAll('img')).map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const timeout = window.setTimeout(resolve, 5000);
        const finish = () => { window.clearTimeout(timeout); resolve(); };
        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', finish, { once: true });
      });
    }));
  }
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

function CatalogCoverPage({
  title,
  image,
  format,
  logo,
  brandName,
  website,
}: {
  title: string;
  image: string;
  format: keyof typeof formatSpecs;
  logo: string;
  brandName: string;
  website: string;
}) {
  return (
    <div className="lookbook-catalog-page lookbook-cover-page bg-[#f8f7f4] text-black" style={{ aspectRatio: `${formatSpecs[format].width} / ${formatSpecs[format].height}` }}>
      <div className="lookbook-cover-masthead">
        <img src={logo || dairiLogo} alt={brandName} className="lookbook-cover-logo" />
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
        <span className="lookbook-cover-side lookbook-cover-side-left">{brandName.toUpperCase()}</span>
        {website && <span className="lookbook-cover-side lookbook-cover-side-right">{website.toUpperCase()}</span>}
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
  logo,
  brandName,
  email,
  website,
}: {
  title: string;
  pageNumber: number;
  products: Product[];
  startIndex: number;
  layout: keyof typeof layoutSpecs;
  format: keyof typeof formatSpecs;
  logo: string;
  brandName: string;
  email: string;
  website: string;
}) {
  const slots = Array.from({ length: layoutSpecs[layout].perPage }, (_, index) => products[index] || null);

  return (
    <div className="lookbook-catalog-page bg-[#f8f7f4] text-black" style={{ aspectRatio: `${formatSpecs[format].width} / ${formatSpecs[format].height}` }}>
      <header className="lookbook-catalog-header">
        <div className="lookbook-catalog-brand">
          <img src={logo || dairiLogo} alt={brandName} />
          <p>{title || `${brandName} CATALOG`}</p>
        </div>
        <p>Page-{pageNumber}</p>
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
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
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
        <div>{website && <p>{website}</p>}</div>
        <div className="text-right">{email && <p>{email}</p>}</div>
      </footer>
    </div>
  );
}

const templateContact = {
  website: 'WWW.DAIRIFASHION.COM',
  address: '850 S BROADWAY | #402 | LOS ANGELES, CA 90014',
  phone: 'PHONE: 1(213) 624-1258',
  fax: 'FAX: 1(213) 624-0087',
};

function DairiFooter() {
  return <footer className="dairi-template-footer"><div><p>{templateContact.website}</p><p>{templateContact.address}</p></div><div className="text-right"><p>{templateContact.phone}</p><p>{templateContact.fax}</p></div></footer>;
}

function DairiProductPage({ title, pageNumber, products, productIndexes }: { title: string; pageNumber: number; products: Product[]; productIndexes: ReadonlyMap<string, number> }) {
  return <div className="dairi-template-page">
    <header className="dairi-template-header"><div className="dairi-template-title">{title}</div><div>PAGE-{pageNumber}</div></header>
    <main className="dairi-template-products">{products.map((product, index) => <article className="dairi-template-product" key={product.id}>
      <div className="dairi-template-product-image"><DairiPrintImage src={product.images[0]} alt={product.name} fit="contain" /></div>
      <p>{getCatalogNumber(product, productIndexes.get(product.id) ?? index)}</p>
    </article>)}</main>
    <DairiFooter />
  </div>;
}

function DairiPrintImage({ src, alt, fit }: { src?: string; alt: string; fit: 'cover' | 'contain' }) {
  const [failed, setFailed] = useState(false);
  const imageSource = src?.trim();
  if (!hasDairiImageSource(imageSource) || failed) {
    return <div className="dairi-image-unavailable" role="img" aria-label={`${alt}: image unavailable`}>Image unavailable</div>;
  }
  return <img src={imageSource} alt={alt} className={`h-full w-full object-${fit}`} onError={() => setFailed(true)} />;
}

function DairiCoverPage({ title, image, logo, brandName }: { title: string; image: string; logo: string; brandName: string }) {
  return <div className="dairi-template-page dairi-template-cover">
    <div className="dairi-cover-brand"><img src={logo || dairiLogo} alt={brandName} /><h1>{title}</h1></div>
    <div className="dairi-cover-image">{image ? <DairiPrintImage src={image} alt={`${title} collection`} fit="cover" /> : <div className="dairi-image-unavailable">{brandName}</div>}<div className="dairi-cover-caption"><span>{brandName}</span><span>{templateContact.website}</span></div></div>
  </div>;
}

function DairiContactPage({ logo, brandName }: { logo: string; brandName: string }) {
  return <div className="dairi-template-page dairi-template-contact"><div className="dairi-contact-logo"><img src={logo || dairiLogo} alt={brandName} /></div><div className="dairi-contact-details"><p>{templateContact.website}</p><p>{templateContact.address}</p><p>{templateContact.phone}</p><p>{templateContact.fax}</p></div></div>;
}

function DairiBackCover({ logo, brandName }: { logo: string; brandName: string }) {
  return <div className="dairi-template-page dairi-template-back-cover"><img src={logo || dairiLogo} alt={brandName} /><div><p>{templateContact.website}</p><p>{templateContact.address}</p><p>{templateContact.phone}</p><p>{templateContact.fax}</p></div></div>;
}

function DairiPricePage({ pageNumber, groups, productIndexes }: { pageNumber: number; groups: ReturnType<typeof splitPriceListPages>[number]; productIndexes: ReadonlyMap<string, number> }) {
  return <div className="dairi-template-page dairi-template-price-page">
    <header className="dairi-template-header"><div className="dairi-template-title">PRICE LIST</div><div>PAGE-{pageNumber}</div></header>
    <main className="dairi-price-grid">{groups.map(group => <section className="dairi-price-group" key={group.pageNumber}>
      <h2>PAGE {group.pageNumber}</h2><table><thead><tr><th>ITEM ID</th><th>PRICE</th></tr></thead>
        <tbody>{group.products.map((product, index) => <tr key={product.id}>
          <td>{getCatalogNumber(product, productIndexes.get(product.id) ?? index)}</td>
          <td>{formatDairiPrice(product.price)}</td>
        </tr>)}</tbody></table>
    </section>)}</main>
    <DairiFooter />
  </div>;
}

export function LookbookPreview() {
  const { id } = useParams();
  const { lookbooks, products, settings, updateLookbook } = useApp();
  const [currentPage, setCurrentPage] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDairiPrint, setIsDairiPrint] = useState(false);

  useEffect(() => {
    const resetPrintMode = () => {
      document.body.classList.remove('dairi-line-sheet-mode');
      setIsDairiPrint(false);
      setIsGenerating(false);
    };
    window.addEventListener('afterprint', resetPrintMode);
    return () => window.removeEventListener('afterprint', resetPrintMode);
  }, []);

  const lookbook = lookbooks.find((l) => l.id === id);

  if (!lookbook) {
    return (
      <div className="admin-page p-8 lg:p-10">
        <div className="max-w-7xl mx-auto text-center py-16">
          <p className="text-neutral-600">Lookbook not found</p>
          <Link to="/admin/lookbooks" className="text-sm underline mt-4 inline-block">
            Back to lookbooks
          </Link>
        </div>
      </div>
    );
  }

  const lookbookProducts = lookbook.productIds
    .map((pid) => products.find((p) => p.id === pid))
    .filter(Boolean) as Product[];
  const productIndexes = new Map(lookbookProducts.map((product, index) => [product.id, index]));

  const layoutSpec = layoutSpecs[lookbook.layout];
  const formatSpec = formatSpecs[lookbook.format];
  const productPages = chunkCatalogProducts(lookbookProducts, layoutSpec.perPage);
  const dairiProductPages = buildDairiLineSheetPages(lookbookProducts);
  const dairiPricePages = splitPriceListPages(dairiProductPages);
  const dairiPreviewPages = dairiProductPages.length + dairiPricePages.length + 3;
  const previewPageCount = dairiPreviewPages;

  const handleDairiDownload = () => {
    setIsGenerating(true);
    setIsDairiPrint(true);
    document.body.classList.add('dairi-line-sheet-mode');
    toast.info('Preparing the DAIRI template. Choose “Save as PDF” in the print dialog.');
    window.setTimeout(async () => {
      await waitForPrintImages('.dairi-line-sheet-print-root');
      window.print();
    }, 250);
  };

  const handleRegenerate = async () => {
    try {
      await updateLookbook(lookbook.id, { layout: settings.defaultLayout, format: settings.defaultFormat, productIds: lookbook.productIds.filter(id => products.some(product => product.id === id)) });
      setCurrentPage(0);
      toast.success('Lookbook refreshed with current defaults');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not refresh lookbook');
    }
  };

  return (
    <div className="admin-page p-8 lg:p-10">
      <div className="max-w-5xl mx-auto">
        <Link
          to="/admin/lookbooks"
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
            <p className="text-neutral-600">{lookbookProducts.length} products · DAIRI A4 template · 3 × 3 styles · prices in a separate appendix</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleRegenerate}
              variant="outline"
              className="admin-button border-neutral-300 rounded-none h-12 px-6"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
            <Button
              onClick={handleDairiDownload}
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
            {currentPage === 0 ? <DairiCoverPage title={lookbook.coverTitle || lookbook.name} image={lookbook.coverImage || ''} logo={settings.logo} brandName={settings.brandName} />
              : currentPage === 1 ? <DairiContactPage logo={settings.logo} brandName={settings.brandName} />
                : currentPage < dairiProductPages.length + 2 ? <DairiProductPage title={dairiProductPages[currentPage - 2]?.title || lookbook.name} pageNumber={currentPage - 1} products={dairiProductPages[currentPage - 2]?.products || []} productIndexes={productIndexes} />
                  : currentPage < dairiProductPages.length + dairiPricePages.length + 2 ? <DairiPricePage pageNumber={currentPage + 1} groups={dairiPricePages[currentPage - dairiProductPages.length - 2] || []} productIndexes={productIndexes} />
                    : <DairiBackCover logo={settings.logo} brandName={settings.brandName} />}
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
              Page {currentPage + 1} of {previewPageCount}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(previewPageCount - 1, currentPage + 1))}
              disabled={currentPage >= previewPageCount - 1}
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
              <p>A4 · 210 × 297 mm</p>
            </div>
            <div>
              <p className="text-neutral-600 uppercase tracking-wider text-xs mb-1">Layout</p>
              <p>3 columns × 3 rows</p>
            </div>
            <div>
              <p className="text-neutral-600 uppercase tracking-wider text-xs mb-1">Products</p>
              <p>{lookbookProducts.length} styles across {dairiProductPages.length} pages and {dairiPricePages.length} price page{dairiPricePages.length === 1 ? '' : 's'}</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`@media print { @page { margin: 0; size: ${isDairiPrint ? '210mm 297mm' : `${formatSpec.width}mm ${formatSpec.height}mm`}; } .lookbook-print-root { width: ${formatSpec.width}mm !important; } .lookbook-print-root .lookbook-catalog-page { height: ${formatSpec.height}mm !important; width: ${formatSpec.width}mm !important; } }`}</style>
      <div className="lookbook-print-root" aria-hidden="true">
        <CatalogCoverPage
          title={lookbook.coverTitle || lookbook.name}
          image={lookbook.coverImage || ''}
          format={lookbook.format}
          logo={settings.logo}
          brandName={settings.brandName}
          website={publicWebsite}
        />
        {productPages.map((pageProducts, pageIndex) => (
          <CatalogPage
            key={pageIndex}
            title={lookbook.coverTitle || lookbook.name}
            pageNumber={pageIndex + 1}
            products={pageProducts}
            startIndex={pageIndex * layoutSpec.perPage}
            layout={lookbook.layout}
            format={lookbook.format}
            logo={settings.logo}
            brandName={settings.brandName}
            email={settings.email}
            website={publicWebsite}
          />
        ))}
      </div>
      <div className={`dairi-line-sheet-print-root${isDairiPrint ? ' is-printing' : ''}`} aria-hidden="true">
        <DairiCoverPage title={lookbook.coverTitle || lookbook.name} image={lookbook.coverImage || ''} logo={settings.logo} brandName={settings.brandName} />
        <DairiContactPage logo={settings.logo} brandName={settings.brandName} />
        {dairiProductPages.map((page, index) => <DairiProductPage key={index} title={page.title || lookbook.name} pageNumber={index + 1} products={page.products} productIndexes={productIndexes} />)}
        {dairiPricePages.map((groups, index) => <DairiPricePage key={index} pageNumber={dairiProductPages.length + index + 3} groups={groups} productIndexes={productIndexes} />)}
        <DairiBackCover logo={settings.logo} brandName={settings.brandName} />
      </div>
    </div>
  );
}
