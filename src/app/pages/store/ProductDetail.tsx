import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ChevronDown, Heart } from "lucide-react";

import { StoreFooter } from "../../components/store/StoreFooter";
import { StoreHeader } from "../../components/store/StoreHeader";
import { getStoreProduct, storeProducts, StoreProduct } from "../../data/storeProducts";

function MiniProduct({ product }: { product: StoreProduct }) {
  return (
    <Link to={`/store/products/${product.id}`} className="store-card group block">
      <div className="relative aspect-[4/5] bg-[#f6f6f6] overflow-hidden mb-3">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover object-top" />
        <span className="absolute right-3 bottom-2 text-xl">+</span>
      </div>
      <p className="text-xs leading-snug">{product.name}</p>
      <p className="text-xs mt-1">${product.price}</p>
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
  const product = getStoreProduct(id);
  const [selectedSize, setSelectedSize] = useState(product?.sizes[0] ?? "");
  const [saved, setSaved] = useState(false);
  const [added, setAdded] = useState(false);

  const related = useMemo(() => {
    if (!product) return [];
    return storeProducts.filter((item) => item.id !== product.id).slice(0, 3);
  }, [product]);

  const recentlyViewed = storeProducts.slice(0, 3);

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

  const imageSet = [product.image, product.image, product.image, product.image];

  return (
    <div className="store-page min-h-screen bg-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <StoreHeader />

      <main>
        <section className="px-6 lg:px-10 py-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,.72fr)] gap-10">
          <div className="grid gap-4">
            {imageSet.map((image, index) => (
              <div key={index} className="bg-[#f5f5f5] overflow-hidden">
                <img
                  src={image}
                  alt={`${product.name} view ${index + 1}`}
                  className="w-full h-full max-h-[760px] object-cover object-top"
                />
              </div>
            ))}
          </div>

          <aside className="lg:sticky lg:top-8 self-start">
            <p className="text-xs text-black/50 mb-4">Shop / {product.category}</p>
            <h1 className="text-xl font-semibold leading-snug mb-2">{product.name}</h1>
            <p className="text-sm mb-8">${product.price}</p>
            <p className="text-sm leading-6 mb-6">{product.description}</p>

            <div className="mb-6">
              <p className="text-sm font-medium mb-3">Product Color: {product.color}</p>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full border border-black/20" style={{ background: product.colorHex }} />
                <span className="w-5 h-5 rounded-full bg-[#d8d1c8] border border-black/20" />
                <span className="w-5 h-5 rounded-full bg-[#9da7aa] border border-black/20" />
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Product Size</p>
                <button className="text-xs underline underline-offset-2">Size Chart</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className="store-button-motion w-10 h-9 border text-xs"
                    style={{
                      background: selectedSize === size ? "#111" : "white",
                      color: selectedSize === size ? "white" : "#111",
                      borderColor: selectedSize === size ? "#111" : "rgba(0,0,0,.2)",
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="store-button-motion w-full bg-black text-white py-3.5 text-sm mb-3"
              onClick={() => {
                setAdded(true);
                window.setTimeout(() => setAdded(false), 2200);
              }}
            >
              {added ? "Added To Bag" : "Add To Bag"}
            </button>
            <button
              className="store-button-motion w-full flex items-center justify-center gap-2 border border-black/20 py-3.5 text-sm mb-8"
              onClick={() => setSaved(!saved)}
            >
              <Heart size={15} fill={saved ? "black" : "none"} />
              {saved ? "Saved" : "Save For Later"}
            </button>

            <AccordionRow label="Check In-Store Availability">
              Available in select DAIRI stores. Choose your size and contact a stylist to reserve this piece.
            </AccordionRow>
            <AccordionRow label="Fit Details">
              {product.fit}. If you are between sizes, choose the larger size for an easier drape.
            </AccordionRow>
            <AccordionRow label="Fabrication & Care">
              {product.material}. {product.care}.
            </AccordionRow>
            <AccordionRow label="Shipping & Returns">
              Complimentary no-rush shipping on orders over $95. Returns are accepted within 14 days.
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
            <img src={product.image} alt={`${product.name} editorial detail`} className="aspect-square object-cover object-top bg-[#f6f6f6]" />
            <img src={related[0]?.image ?? product.image} alt="Fabric stack" className="aspect-square object-cover object-top bg-[#f6f6f6]" />
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
            {related.map((item) => <MiniProduct key={item.id} product={item} />)}
          </div>
        </section>

        <section className="px-6 lg:px-10 py-14 border-t border-black/10">
          <h2 className="text-center font-semibold mb-10">Recently viewed</h2>
          <div className="grid grid-cols-3 gap-5 max-w-[760px] mx-auto">
            {recentlyViewed.map((item) => <MiniProduct key={item.id} product={item} />)}
          </div>
        </section>
      </main>

      <StoreFooter />
    </div>
  );
}
