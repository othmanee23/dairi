import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ChevronDown, Heart } from "lucide-react";

import { StoreFooter } from "../../components/store/StoreFooter";
import { StoreHeader } from "../../components/store/StoreHeader";
import { StoreProduct, withCustomerPrice, customerPriceLabel, customerUnitPrice } from "../../data/storeProducts";
import { useApp } from "../../context/AppContext";
import { usePageSeo } from "../../lib/seo";
import { ProductVariant } from "../../types";

function MiniProduct({ product, wholesale }: { product: StoreProduct; wholesale: boolean }) {
  return (
    <Link to={`/store/products/${product.id}`} className="store-card group block">
      <div className="relative aspect-[3/4] bg-[#f6f6f6] overflow-hidden mb-3">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover object-top" />
        <span className="absolute right-3 bottom-2 text-xl">+</span>
      </div>
      <p className="text-xs leading-snug">{product.name}</p>
      <p className="text-xs mt-1">{customerPriceLabel(product, wholesale)}</p>
    </Link>
  );
}

function AccordionRow({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-black/15">
      <button className="w-full flex items-center justify-between py-4 text-sm" onClick={() => setOpen(!open)}>
        {label}
        <ChevronDown size={15} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {open && <div className="pb-5 text-sm leading-6 text-black/65">{children}</div>}
    </div>
  );
}

export function ProductDetail() {
  const { id } = useParams();
  const { products: catalog, wishlist, toggleWishlist, addToCart, customerAccount } = useApp();
  const wholesale = customerAccount?.wholesaleStatus === 'approved';
  const product = catalog.find((item) => item.id === id && item.status === "published" && item.showOnWebsite);
  const storeProduct = product ? withCustomerPrice(product, wholesale) : undefined;
  const retailPrices = product?.variants?.filter(variant => variant.isActive).map(variant => variant.retailPrice ?? product.price) ?? (product ? [product.price] : []);
  const productStructuredData = product && !wholesale ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    ...(product.styleNumber ? { sku: product.styleNumber } : {}),
    image: product.images.map(image => new URL(image, window.location.origin).toString()),
    brand: { '@type': 'Brand', name: 'DAIRI' },
    offers: {
      '@type': retailPrices.length > 1 ? 'AggregateOffer' : 'Offer',
      priceCurrency: 'USD',
      ...(retailPrices.length > 1 ? { lowPrice: Math.min(...retailPrices).toFixed(2), highPrice: Math.max(...retailPrices).toFixed(2), offerCount: retailPrices.length } : { price: (retailPrices[0] ?? product.price).toFixed(2) }),
      availability: product.variants?.some(variant => variant.isActive && variant.inventoryQuantity > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  } : undefined;
  usePageSeo({ title: product ? `${product.name}${product.styleNumber ? ` · ${product.styleNumber}` : ''} | DAIRI` : 'Product | DAIRI', description: product?.description || 'Explore the latest DAIRI women’s fashion pieces and product details.', path: `/store/products/${id ?? ''}`, image: storeProduct?.image, structuredData: productStructuredData });
  const [selectedSize, setSelectedSize] = useState(storeProduct?.sizes[0] ?? "");
  const [selectedColor, setSelectedColor] = useState(storeProduct?.color ?? "");
  const [added, setAdded] = useState(false);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);

  const variants: ProductVariant[] = (product?.variants ?? []).filter((variant): variant is ProductVariant => Boolean(variant?.isActive));
  const colors = [...new Map<string, ProductVariant>(variants.map(variant => [variant.color, variant])).values()];
  const colorVariants = variants.filter(variant => variant.color === selectedColor);
  const selectedVariant = colorVariants.find(variant => variant.size === selectedSize);
  const selectedPrice = product && selectedVariant ? customerUnitPrice(product, selectedVariant.id, wholesale) : null;
  useEffect(() => {
    if (!product) return;
    const firstVariant = product.variants?.find(variant => variant.isActive);
    setSelectedColor(firstVariant?.color ?? product.color ?? "");
    setSelectedSize(firstVariant?.size ?? product.sizes?.[0] ?? "");
  }, [product?.id]);

  const related = useMemo(() => {
    if (!storeProduct) return [];
    return catalog.filter((item) => item.id !== storeProduct.id && item.status === "published" && item.showOnWebsite).map(item => withCustomerPrice(item, wholesale)).slice(0, 3);
  }, [storeProduct, catalog, wholesale]);

  const recentlyViewed = catalog.filter((item) => item.status === "published" && item.showOnWebsite).map(item => withCustomerPrice(item, wholesale)).slice(0, 3);

  if (!product) {
    return (
      <div className="store-page min-h-screen bg-white" style={{ fontFamily: "Inter, sans-serif" }}>
        <StoreHeader />
        <main className="min-h-[60vh] flex items-center justify-center text-center px-6">
          <div>
            <p className="text-sm text-black/50 mb-3">Product not found</p>
            <h1 className="text-3xl mb-8">This piece is no longer available</h1>
            <Link to="/store/shop" className="store-button-motion bg-black text-white px-8 py-3 text-sm">Back to Shop</Link>
          </div>
        </main>
        <StoreFooter />
      </div>
    );
  }

  const imageSet = product.images.length ? product.images : [storeProduct.image];

  return (
    <div className="store-page min-h-screen bg-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <StoreHeader />

      <main>
        <section className="px-6 lg:px-10 py-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,.72fr)] gap-10">
          <div className="grid gap-4">
            {imageSet.map((image, index) => (
              <div key={index} className="mx-auto aspect-[3/4] w-full overflow-hidden bg-[#f5f5f5]" style={{ maxWidth: 'min(100%, 56vh, 640px)' }}>
                <img
                  src={image}
                  alt={`${product.name} view ${index + 1}`}
                  className="block h-full w-full object-cover object-top"
                />
              </div>
            ))}
          </div>

          <aside className="lg:sticky lg:top-8 self-start">
            <p className="text-xs text-black/50 mb-4">Shop / {product.category}</p>
            <h1 className="text-xl font-semibold leading-snug mb-2">{product.name}</h1>
            {product.styleNumber && <p className="text-xs text-black/45 mb-3">Style {product.styleNumber}</p>}
            <p className="text-sm mb-3">{selectedVariant ? selectedPrice == null ? 'Wholesale price not set for this option' : `$${selectedPrice.toFixed(2)}` : wholesale ? customerPriceLabel(storeProduct, true) : `$${product.price.toFixed(2)}`}</p>
            {wholesale && <p className="text-[10px] uppercase tracking-[1px] text-black/45 mb-6">Approved wholesale account pricing</p>}
            <p className="text-sm leading-6 mb-6">{product.description}</p>

            <div className="mb-6">
              <p className="text-sm font-medium mb-3">Product Color: {selectedColor || "Standard"}</p>
              <div className="flex gap-3">
                {colors.length ? colors.map(color => <button type="button" key={color.color} aria-label={`Select ${color.color || "standard"} color`} aria-pressed={selectedColor === color.color} onClick={() => { setSelectedColor(color.color); setSelectedSize(colorVariants.find(variant => variant.color === color.color)?.size ?? variants.find(variant => variant.color === color.color)?.size ?? ""); }} className="w-7 h-7 rounded-full border border-black/30 ring-offset-2 aria-pressed:ring-1" style={{ background: color.colorHex ?? "#eee" }} />) : <span className="w-5 h-5 rounded-full border border-black/20" style={{ background: storeProduct.colorHex }} />}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Product Size</p>
                <button className="text-xs underline underline-offset-2" onClick={() => setSizeChartOpen(true)}>Size Chart</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(variants.length ? [...new Set(colorVariants.map(variant => variant.size))] : storeProduct.sizes).map((size) => {
                  const sizeVariant = colorVariants.find(variant => variant.size === size);
                  const soldOut = variants.length > 0 && (!sizeVariant || sizeVariant.inventoryQuantity < 1);
                  return (
                  <button
                    type="button"
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    disabled={soldOut}
                    className="store-button-motion min-w-10 h-9 border px-2 text-xs disabled:opacity-35 disabled:line-through"
                    style={{
                      background: selectedSize === size ? "#111" : "white",
                      color: selectedSize === size ? "white" : "#111",
                      borderColor: selectedSize === size ? "#111" : "rgba(0,0,0,.2)",
                    }}
                  >
                    {size}
                  </button>
                );})}
              </div>
              {selectedVariant && <p className="text-xs text-black/50 mt-3">{selectedVariant.inventoryQuantity > 0 ? `${selectedVariant.inventoryQuantity} in stock` : "Sold out"}</p>}
            </div>

            {sizeChartOpen && <div role="dialog" aria-modal="true" aria-label="Size guide" className="fixed inset-0 z-[90] bg-black/45 flex items-center justify-center p-6"><div className="bg-white p-7 max-w-md w-full"><div className="flex items-center justify-between mb-5"><h2 className="text-xl">DAIRI size guide</h2><button onClick={() => setSizeChartOpen(false)} aria-label="Close size guide">×</button></div><p className="text-sm text-black/65 leading-6 mb-5">Choose your usual size for a close fit. For an easier drape, size up. Measurements are a guide and may vary by silhouette.</p><div className="grid grid-cols-3 text-sm border-t border-l">{[["Size","Bust","Waist"],["XS","32–33 in","24–25 in"],["S","34–35 in","26–27 in"],["M","36–37 in","28–29 in"],["L","38–40 in","30–32 in"],["XL","41–43 in","33–35 in"]].flat().map((cell,index)=><div key={index} className={`p-3 border-r border-b ${index<3?'font-medium bg-neutral-50':''}`}>{cell}</div>)}</div></div></div>}

            <button
              className="store-button-motion w-full bg-black text-white py-3.5 text-sm mb-3"
              disabled={!selectedVariant || selectedVariant.inventoryQuantity < 1 || selectedPrice == null}
              onClick={() => {
                if (!selectedVariant || selectedVariant.inventoryQuantity < 1) return;
                addToCart(product.id, selectedVariant.id, selectedVariant.size, selectedVariant.color);
                setAdded(true);
                window.setTimeout(() => setAdded(false), 2200);
              }}
            >
              {added ? "Added To Bag" : wholesale && selectedVariant && selectedPrice == null ? "Price Unavailable" : selectedVariant?.inventoryQuantity ? "Add To Bag" : "Out Of Stock"}
            </button>
            <button
              className="store-button-motion w-full flex items-center justify-center gap-2 border border-black/20 py-3.5 text-sm mb-8"
              onClick={() => toggleWishlist(product.id)}
            >
              <Heart size={15} fill={wishlist.includes(product.id) ? "black" : "none"} />
              {wishlist.includes(product.id) ? "Saved" : "Save For Later"}
            </button>

            <AccordionRow label="Check In-Store Availability">
              Available in select DAIRI stores. Choose your size and contact a stylist to reserve this piece.
            </AccordionRow>
            <AccordionRow label="Fit Details">
              {storeProduct.fit}. If you are between sizes, choose the larger size for an easier drape.
            </AccordionRow>
            <AccordionRow label="Fabrication & Care">
              {storeProduct.material}. {storeProduct.care}.
            </AccordionRow>
            <AccordionRow label="Shipping & Returns">
              Shipping is estimated at checkout. Returns are accepted within 14 days.
            </AccordionRow>
          </aside>
        </section>

        <section className="px-6 lg:px-10 py-14 border-t border-black/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-black/45 mb-4">Design</p>
              <h3 className="font-semibold mb-3">Airy & Warm</h3>
              <p className="text-xs leading-5 max-w-[260px] mx-auto">
                Designed for comfort with a refined silhouette that moves between everyday wear and occasion dressing.
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-black/45 mb-4">Quality</p>
              <h3 className="font-semibold mb-3">Made in Italy</h3>
              <p className="text-xs leading-5 max-w-[260px] mx-auto">
                Carefully finished materials and details keep each piece feeling considered and long lasting.
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-black/45 mb-4">Sustainability</p>
              <h3 className="font-semibold mb-3">Responsible Fibers</h3>
              <p className="text-xs leading-5 max-w-[260px] mx-auto">
                Made with a fewer, better mindset and designed to stay in rotation season after season.
              </p>
            </div>
          </div>
        </section>

        <section className="px-6 lg:px-10 py-14">
          <div className="text-center mb-8">
            <h2 className="font-semibold mb-2">Elegant Ease</h2>
            <p className="text-xs">Inspiration for your essential wardrobe</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[900px] mx-auto">
            <img src={storeProduct.image} alt={`${product.name} editorial detail`} className="aspect-square object-cover object-top bg-[#f6f6f6]" />
            <img src={related[0]?.image ?? storeProduct.image} alt="Fabric stack" className="aspect-square object-cover object-top bg-[#f6f6f6]" />
          </div>
        </section>

        <section className="px-6 lg:px-10 py-14 border-t border-black/10">
          <div className="max-w-[1100px] mx-auto">
            <h2 className="text-lg font-semibold mb-8">4.4 ★★★★★</h2>
            {["Perfect Essential", "Chic and edgy", "Absolutely exquisite"].map((review, index) => (
              <div key={review} className="grid grid-cols-[160px_1fr_90px] gap-8 border-t border-black/10 py-6 text-xs">
                <p>{["Aleyna A.", "Cynthia V.", "catherine"][index]}</p>
                <div>
                  <p className="font-semibold mb-2">★★★★★ {review}</p>
                  <p className="leading-5 text-black/70">
                    This piece has a polished feel and still works for day-to-day styling. The material is soft and the shape feels easy.
                  </p>
                </div>
                <p className="text-black/45">09/12/26</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 lg:px-10 py-14 border-t border-black/10">
          <h2 className="text-center font-semibold mb-10">Style With</h2>
          <div className="grid grid-cols-3 gap-5 max-w-[760px] mx-auto">
            {related.map((item) => <MiniProduct key={item.id} product={item} wholesale={wholesale} />)}
          </div>
        </section>

        <section className="px-6 lg:px-10 py-14 border-t border-black/10">
          <h2 className="text-center font-semibold mb-10">Recently viewed</h2>
          <div className="grid grid-cols-3 gap-5 max-w-[760px] mx-auto">
            {recentlyViewed.map((item) => <MiniProduct key={item.id} product={item} wholesale={wholesale} />)}
          </div>
        </section>
      </main>

      <StoreFooter />
    </div>
  );
}
