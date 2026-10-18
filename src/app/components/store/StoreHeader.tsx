import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Heart, Menu, Search, ShoppingBag, Store, User, X } from "lucide-react";

import dairiLogo from "../../../imports/dairi-logo.svg";
import menuImage from "../../../imports/image-4.png";
import modalImage from "../../../imports/image-2.png";
import { storeProducts } from "../../data/storeProducts";

const CHARCOAL = "#111111";

const navLinks = [
  { label: "Shop", href: "/store/shop" },
  { label: "New Arrivals", href: "/store/shop" },
  { label: "Sales", href: "/store/shop" },
  { label: "Journal", href: "/store/journal" },
];

const menuColumns = [
  {
    title: "Categories",
    links: ["Bags", "Clothing", "Leather Goods", "Accessories", "Gifts", "Shop All"],
  },
  {
    title: "Featured",
    links: ["New Arrivals", "Bestsellers", "Trending Now", "Loungewear"],
  },
  {
    title: "Collections",
    links: ["Party and events", "Office looks", "Selection", "Online Exclusive", "Knitwear", "Total Look", "Basics"],
  },
];

export function StoreHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const [query, setQuery] = useState("pant");

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const fallback = storeProducts.slice(0, 4);
    if (!normalized) return fallback;

    const matches = storeProducts.filter((product) =>
      `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(normalized)
    );
    return (matches.length ? matches : fallback).slice(0, 4);
  }, [query]);

  return (
    <>
      <header className="store-header relative z-50 bg-white" style={{ color: CHARCOAL }}>
        <div className="h-8 bg-black flex items-center justify-center px-4">
          <p className="text-[10px] tracking-wide text-white/85 text-center">
            Complimentary U.S. No-Rush Shipping on orders of $95 or more. Shop now
          </p>
        </div>

        <nav className="h-16 px-6 lg:px-8 flex items-center justify-between border-b border-black/10">
          <div className="flex items-center gap-10">
            <Link
              to="/store"
              className="relative block"
              aria-label="DAIRI home"
            >
              <img src={dairiLogo} alt="DAIRI" className="block h-auto w-[92px]" />
            </Link>

            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  onMouseEnter={() => link.label === "Shop" && setMenuOpen(true)}
                  className="text-[12px] font-medium hover:opacity-60 transition-opacity store-button-motion"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-5">
            <button className="hover:opacity-60 transition-opacity store-button-motion" aria-label="Search" onClick={() => setSearchOpen(true)}>
              <Search size={15} />
            </button>
            <Link to="/store/support" className="flex items-center gap-2 text-[12px] font-medium hover:opacity-60 transition-opacity store-button-motion">
              <Store size={15} />
              Stores
            </Link>
            <button className="hover:opacity-60 transition-opacity store-button-motion" aria-label="Account" onClick={() => setNewsletterOpen(true)}>
              <User size={15} />
            </button>
            <Link to="/store/wishlist" className="flex items-center gap-1 hover:opacity-60 transition-opacity store-button-motion" aria-label="Wishlist">
              <Heart size={15} />
              <span className="text-[12px]">0</span>
            </Link>
            <Link to="/store/cart" className="flex items-center gap-1 hover:opacity-60 transition-opacity store-button-motion" aria-label="Shopping bag">
              <ShoppingBag size={15} />
              <span className="text-[12px]">2</span>
            </Link>
          </div>

          <button className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open menu">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        {menuOpen && (
          <div
            className="store-mega-menu hidden lg:block absolute left-0 right-0 top-full bg-white border-b border-black/10 shadow-sm"
            onMouseLeave={() => setMenuOpen(false)}
          >
            <div className="grid grid-cols-[1fr_1fr_1.2fr_360px] gap-16 px-32 py-12">
              {menuColumns.map((column) => (
                <div key={column.title}>
                  <p className="text-[12px] mb-7 text-black/45">{column.title}</p>
                  <div className="space-y-4">
                    {column.links.map((item) => (
                      <Link key={item} to="/store/shop" className="block text-[15px] hover:opacity-60">
                        {item}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <Link to="/store/shop" className="block aspect-[4/5] overflow-hidden bg-[#f4f4f4]">
                <img src={menuImage} alt="New collection preview" className="h-full w-full object-cover object-top" />
              </Link>
            </div>
          </div>
        )}

        {mobileOpen && (
          <div className="lg:hidden bg-white border-b border-black/10 px-6 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="block py-3 text-sm font-medium border-b border-black/5"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <button className="block py-3 text-sm font-medium" onClick={() => setSearchOpen(true)}>
              Search
            </button>
          </div>
        )}
      </header>

      {searchOpen && (
        <div className="store-search-overlay fixed inset-0 z-[70] bg-white">
          <div className="h-24 flex items-center px-8 lg:px-14 gap-5 border-b border-black/10">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="flex-1 text-xl outline-none"
              placeholder="Search"
              autoFocus
            />
            <button aria-label="Close search" onClick={() => setSearchOpen(false)}>
              <X size={21} />
            </button>
          </div>
          <div className="px-8 lg:px-14 py-10">
            <div className="flex items-center justify-between border-b border-black/15 pb-4 mb-8">
              <p className="text-sm text-black/55">{searchResults.length} results</p>
              <Link to="/store/shop" className="text-sm text-black/55" onClick={() => setSearchOpen(false)}>
                View all
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {searchResults.map((product) => (
                <Link key={product.id} to={`/store/products/${product.id}`} onClick={() => setSearchOpen(false)} className="group">
                  <div className="relative aspect-[4/5] bg-[#f6f6f6] overflow-hidden mb-4">
                    <img src={product.image} alt={product.name} className="h-full w-full object-cover object-top" />
                    <span className="absolute right-4 bottom-3 text-2xl">+</span>
                  </div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-sm mt-1">${product.price}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {newsletterOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center px-6">
          <div className="store-newsletter-modal relative bg-white grid grid-cols-1 md:grid-cols-2 max-w-[780px] w-full">
            <button className="absolute right-5 top-5 z-10" aria-label="Close" onClick={() => setNewsletterOpen(false)}>
              <X size={22} />
            </button>
            <div className="hidden md:block min-h-[460px]">
              <img src={modalImage} alt="DAIRI newsletter" className="h-full w-full object-cover object-top" />
            </div>
            <div className="flex flex-col items-center justify-center text-center px-10 py-16">
              <p className="text-sm mb-7">Enter your email to unlock</p>
              <h2 className="text-3xl leading-tight mb-5">15% off your first order</h2>
              <p className="text-sm leading-6 mb-8 max-w-[320px]">
                Plus, get insider access to promotions, launches, events, and more.
              </p>
              <input className="w-full border border-black/20 px-4 py-4 mb-4 text-sm" placeholder="Enter your email address" />
              <button className="bg-black text-white px-8 py-4 text-sm" onClick={() => setNewsletterOpen(false)}>
                Unlock Access
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
