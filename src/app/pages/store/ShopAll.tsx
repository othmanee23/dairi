import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ChevronDown, Heart } from "lucide-react";

import { StoreFooter } from "../../components/store/StoreFooter";
import { StoreHeader } from "../../components/store/StoreHeader";
import { StoreProduct, withCustomerPrice, customerPriceLabel } from "../../data/storeProducts";
import { useApp } from "../../context/AppContext";
import { usePageSeo } from "../../lib/seo";

const categories = ["Women's Tops", "Dresses", "Pants or skirts", "Jackets or coats", "Scarves or shawls", "Natural-Fiber Clothing", "Handwoven Collection", "Leather Belts", "Sets", "Tops", "Bottoms", "Outerwear", "Accessories"];

function ShopProductCard({ product }: { product: StoreProduct }) {
  const { wishlist, toggleWishlist, customerAccount } = useApp();
  const wholesale = customerAccount?.wholesaleStatus === 'approved';
  const wishlisted = wishlist.includes(product.id);

  return (
    <Link to={`/store/products/${product.id}`} className="store-card group block">
      <div className="relative aspect-[3/4] bg-[#f6f6f6] overflow-hidden mb-4">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover object-top"
        />
        <button
          className="absolute right-5 top-5"
          aria-label="Add to wishlist"
          onClick={(event) => {
            event.preventDefault();
            toggleWishlist(product.id);
          }}
        >
          <Heart size={18} fill={wishlisted ? "black" : "none"} />
        </button>
        <span className="absolute right-5 bottom-4 text-2xl leading-none">+</span>
      </div>
      <p className="text-sm font-medium leading-snug">{product.name}</p>
      <p className="text-sm mt-1">{customerPriceLabel(product, wholesale)}</p>
    </Link>
  );
}

export function ShopAll() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState("featured");
  const [filterOpen, setFilterOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState("all");
  const { products: catalog, customerAccount } = useApp();
  const wholesale = customerAccount?.wholesaleStatus === 'approved';
  usePageSeo({ title: activeCategory === 'All' ? 'Shop Women’s Clothing | DAIRI' : `${activeCategory} | DAIRI`, description: `Shop DAIRI ${activeCategory === 'All' ? 'women’s clothing and new fashion collections' : activeCategory.toLowerCase()}. Browse product details, available sizes, and USD pricing.`, path: '/store/shop' });
  useEffect(() => { setActiveCategory(searchParams.get("category") || "All"); }, [searchParams]);
  const products = useMemo(() => {
    let next = catalog.filter((p) => p.status === "published" && p.showOnWebsite).map(product => withCustomerPrice(product, wholesale));
    const featured = searchParams.get("featured");
    if (featured === "new") next = next.filter(product => product.isNew);
    if (featured === "bestseller") next = next.filter(product => product.isBestseller);
    if (activeCategory !== "All") next = next.filter((product) => product.category === activeCategory);

    if (maxPrice === "under200") next = next.filter((product) => product.displayPrice != null && product.displayPrice < 200);
    if (maxPrice === "under300") next = next.filter((product) => product.displayPrice != null && product.displayPrice < 300);
    if (sortBy === "price-low") next.sort((a, b) => (a.displayPrice ?? Number.POSITIVE_INFINITY) - (b.displayPrice ?? Number.POSITIVE_INFINITY));
    if (sortBy === "price-high") next.sort((a, b) => (b.displayPrice ?? -1) - (a.displayPrice ?? -1));
    if (sortBy === "name") next.sort((a, b) => a.name.localeCompare(b.name));
    return next;
  }, [activeCategory, maxPrice, sortBy, catalog, searchParams, wholesale]);

  return (
    <div className="store-page min-h-screen bg-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <StoreHeader />

      <main>
        <section className="px-6 lg:px-10 pt-14 pb-5 border-b border-black/10">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl mb-5">Shop</h1>
              <div className="flex flex-wrap gap-1.5">
                {["All", ...categories].map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className="store-button-motion rounded-full border px-5 py-1.5 text-sm font-medium transition-colors"
                    style={{
                      borderColor: activeCategory === category ? "#111" : "rgba(0,0,0,.55)",
                      background: activeCategory === category ? "#111" : "white",
                      color: activeCategory === category ? "white" : "#111",
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm">
              <label className="inline-flex items-center gap-2">
                Sort
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="bg-white border-none outline-none"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price low to high</option>
                  <option value="price-high">Price high to low</option>
                  <option value="name">Name</option>
                </select>
                <ChevronDown size={14} />
              </label>
              <button onClick={() => setFilterOpen(true)}>Filter</button>
            </div>
          </div>
        </section>

        {filterOpen && (
          <div className="fixed inset-0 z-[60] bg-black/30 flex justify-end">
            <aside className="store-filter-drawer w-full max-w-sm bg-white h-full p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl">Filter</h2>
                <button onClick={() => setFilterOpen(false)}>Close</button>
              </div>
              <p className="text-sm font-medium mb-4">Price</p>
              <div className="space-y-3">
                {[
                  ["all", "All prices"],
                  ["under200", "Under $200"],
                  ["under300", "Under $300"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setMaxPrice(value)}
                    className="flex items-center justify-between w-full border-b border-black/10 py-3 text-sm"
                  >
                    {label}
                    <span>{maxPrice === value ? "●" : "○"}</span>
                  </button>
                ))}
              </div>
              <button className="store-button-motion w-full bg-black text-white py-4 mt-10" onClick={() => setFilterOpen(false)}>
                View {products.length} items
              </button>
            </aside>
          </div>
        )}

        <section className="px-6 lg:px-10 py-16 lg:py-20">
          {products.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-16">
              {products.map((product) => (
                <ShopProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="py-24 text-center">
              <p className="mb-6">No products match this selection.</p>
              <button
                className="store-button-motion bg-black text-white px-8 py-3"
                onClick={() => {
                  setActiveCategory("All");
                  setMaxPrice("all");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>
      </main>

      <StoreFooter />
    </div>
  );
}
