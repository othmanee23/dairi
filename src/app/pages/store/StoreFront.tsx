import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

import heroImage from "../../../imports/image.webp";
import img1 from "../../../imports/image-1.webp";
import img2 from "../../../imports/image-2.webp";
import img3 from "../../../imports/image-3.webp";
import img4 from "../../../imports/image-4.webp";
import img9 from "../../../imports/image-9.webp";
import DairiLogo from "../../../imports/Group1321319317";
import { StoreFooter } from "../../components/store/StoreFooter";
import { StoreHeader } from "../../components/store/StoreHeader";
import { StoreProduct, toStoreProduct } from "../../data/storeProducts";
import { useApp } from "../../context/AppContext";

const CHARCOAL = "#171717";
const SOFT_TEXT = "#4c4a46";

const featureTiles = [
  { title: "New Arrivals", image: img1, href: "/store/shop?featured=new" },
  { title: "The Casual Edit", image: img4, href: "/store/shop?category=Sets" },
  { title: "Best-Sellers", image: img3, href: "/store/shop?featured=bestseller" },
];

const editorialTiles = [
  { title: "The Smart Chic", image: img3, href: "/store/shop?featured=bestseller" },
  { title: "Ready To Go", image: img2, href: "/store/shop?featured=new" },
];

const instagramImages = [img1, img2, img3, img4, img9];

function CategoryTile({ title, image, href }: { title: string; image: string; href: string }) {
  return (
    <Link to={href} className="store-card group relative block overflow-hidden bg-[#f1f1f1] aspect-[4/5]">
      <img
        src={image}
        alt={title}
        className="h-full w-full object-cover object-top"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
      <span className="absolute left-6 bottom-6 text-white text-sm font-medium">
        {title}
      </span>
    </Link>
  );
}

function HomeProductCard({ product }: { product: StoreProduct }) {
  return (
    <Link to={`/store/products/${product.id}`} className="store-card group block">
      <div className="relative aspect-[4/5] bg-[#f5f5f5] overflow-hidden mb-4">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover object-top"
        />
        <span className="absolute right-4 bottom-4 text-2xl leading-none text-black/70 transition-transform group-hover:rotate-90">
          +
        </span>
      </div>
      <div className="min-h-[58px]">
        <p className="text-[12px] leading-snug font-medium" style={{ color: CHARCOAL }}>
          {product.name}
        </p>
        <p className="text-[12px] mt-1" style={{ color: SOFT_TEXT }}>
          ${product.price}
        </p>
      </div>
    </Link>
  );
}

function SpotlightProductCard({ product }: { product: StoreProduct }) {
  return (
    <Link
      to={`/store/products/${product.id}`}
      className="store-card group block w-[72%] shrink-0 snap-start sm:w-[42%] md:w-[30%] lg:w-[calc((100%-72px)/4)]"
    >
      <div className="mb-3 aspect-[4/5] overflow-hidden bg-[#f3f2f0]">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover object-top"
        />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium leading-snug text-[#171717]">{product.name}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-black/45">{product.color}</p>
        </div>
        <p className="shrink-0 text-[13px] text-[#171717]">${product.price}</p>
      </div>
    </Link>
  );
}

function OpeningLoader({ leaving }: { leaving: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#f7f5f1] transition-all duration-700 ${
        leaving ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <style>{`
        @keyframes dairi-logo-rise {
          0% { opacity: 0; transform: translateY(18px) scale(0.96); filter: blur(8px); }
          45% { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes dairi-line {
          0% { transform: scaleX(0); transform-origin: left; opacity: 0.15; }
          45% { opacity: 1; }
          100% { transform: scaleX(1); transform-origin: left; opacity: 1; }
        }
        @keyframes dairi-word {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes dairi-sweep {
          0% { transform: translateX(-115%); }
          100% { transform: translateX(115%); }
        }
      `}</style>
      <div className="relative w-full max-w-[520px] px-10 text-center">
        <div className="absolute left-10 right-10 top-1/2 h-px bg-black/10 overflow-hidden">
          <div
            className="h-full w-1/2 bg-black/45"
            style={{ animation: "dairi-sweep 1.4s cubic-bezier(.65,0,.35,1) infinite" }}
          />
        </div>
        <div className="relative bg-[#f7f5f1] px-8 py-10 mx-auto w-[min(320px,70vw)]">
          <div
            className="mx-auto mb-8"
            style={{
              width: "min(280px, 64vw)",
              aspectRatio: "1039.31 / 317.071",
              animation: "dairi-logo-rise 900ms cubic-bezier(.2,.8,.2,1) both",
            }}
          >
            <DairiLogo />
          </div>
          <div className="mx-auto h-px bg-black/80 mb-5" style={{ animation: "dairi-line 1.1s 260ms cubic-bezier(.65,0,.35,1) both" }} />
          <p
            className="text-[10px] tracking-[4px] uppercase text-black/55"
            style={{ animation: "dairi-word 700ms 620ms ease-out both" }}
          >
            Fewer pieces. Better choices.
          </p>
        </div>
      </div>
    </div>
  );
}

export function StoreFront() {
  const { products } = useApp();
  const spotlightProducts = products.filter(p => p.status === "published" && p.showOnWebsite).map(toStoreProduct);
  const featuredProducts = spotlightProducts.filter(p => p.isNew || p.isBestseller).slice(0, 5);
  const spotlightRailRef = useRef<HTMLDivElement>(null);
  const [showLoader, setShowLoader] = useState(false);
  const [loaderLeaving, setLoaderLeaving] = useState(false);

  const scrollSpotlight = (direction: -1 | 1) => {
    if (!spotlightRailRef.current) return;
    spotlightRailRef.current.scrollBy({
      left: direction * spotlightRailRef.current.clientWidth * 0.78,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    setShowLoader(true);
    setLoaderLeaving(false);
    const leaveTimer = window.setTimeout(() => setLoaderLeaving(true), 1650);
    const removeTimer = window.setTimeout(() => {
      setShowLoader(false);
    }, 2350);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  return (
    <div className="store-page min-h-screen bg-white" style={{ fontFamily: "Inter, sans-serif", color: CHARCOAL }}>
      {showLoader && <OpeningLoader leaving={loaderLeaving} />}
      <StoreHeader />

      <main>
        <section className="relative min-h-[520px] lg:h-[720px] overflow-hidden bg-[#e6e4e1]">
          <img
            src={heroImage}
            alt="DAIRI fashion editorial"
            className="store-hero-image absolute inset-0 h-full w-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/5 to-transparent" />
          <div className="relative z-10 h-full min-h-[520px] lg:min-h-0 flex items-end px-8 lg:px-16 pb-16 lg:pb-28">
            <div className="max-w-[360px] text-white">
              <h1 className="text-2xl lg:text-3xl font-semibold leading-tight mb-5">
                Elevate Your Style
                <br />
                Timeless Fashion, Sustainable Choices
              </h1>
              <Link
                to="/store/shop"
                className="store-button-motion inline-flex items-center justify-center bg-white text-black px-5 py-3 text-[12px] font-medium hover:bg-black hover:text-white transition-colors"
              >
                Shop Now
              </Link>
            </div>
          </div>
        </section>

        <section className="px-8 lg:px-10 py-10 lg:py-12">
          <p className="max-w-[640px] text-lg lg:text-xl leading-snug font-medium" style={{ color: CHARCOAL }}>
            Elevate your lifestyle with a more intelligent, superior wardrobe.
            <br />
            Our range is crafted sustainably with longevity in mind.
          </p>
        </section>

        <section id="collections" className="px-8 lg:px-10 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featureTiles.map((tile) => (
              <CategoryTile key={tile.title} {...tile} />
            ))}
          </div>
        </section>

        <section id="products" className="px-8 lg:px-10 pb-16">
          <h2 className="text-base font-semibold mb-10">What to Wear Now</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-10">
            {featuredProducts.map((product) => (
              <HomeProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="px-8 lg:px-10 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {editorialTiles.map((tile) => (
              <Link
                key={tile.title}
                to={tile.href}
                className="store-card group relative block overflow-hidden bg-[#f2f1ef] aspect-[5/4] lg:aspect-[4/5]"
              >
                <img
                  src={tile.image}
                  alt={tile.title}
                  className="h-full w-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                <span className="absolute left-7 bottom-7 text-white text-sm font-medium">
                  {tile.title}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section id="journal" className="px-8 py-12 lg:px-10 lg:py-16">
          <div className="mb-6 flex items-end justify-between gap-4 border-b border-black/10 pb-4">
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-black/45">DAIRI EDIT</p>
              <h2 className="text-xl font-medium leading-tight lg:text-2xl">Selected for the season</h2>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/store/shop" className="text-xs font-medium underline underline-offset-4 hover:text-black/55">
                Shop all
              </Link>
              <div className="hidden gap-2 sm:flex">
                <button
                  type="button"
                  aria-label="Scroll products left"
                  title="Previous products"
                  onClick={() => scrollSpotlight(-1)}
                  className="inline-flex h-9 w-9 items-center justify-center border border-black/15 text-black transition-colors hover:bg-black hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll products right"
                  title="Next products"
                  onClick={() => scrollSpotlight(1)}
                  className="inline-flex h-9 w-9 items-center justify-center border border-black/15 text-black transition-colors hover:bg-black hover:text-white"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={spotlightRailRef}
            role="region"
            aria-label="Seasonal product selection"
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:gap-6"
          >
            {spotlightProducts.map((product) => (
              <SpotlightProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="px-8 lg:px-10 py-16">
          <h2 className="text-center text-base font-semibold mb-12">Shop Instagram</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
            {instagramImages.map((image, index) => (
              <a
                key={image}
                href="/store/journal"
                className="store-card block aspect-square overflow-hidden bg-[#f2f2f2]"
                aria-label={`Instagram look ${index + 1}`}
              >
                <img
                  src={image}
                  alt={`DAIRI Instagram look ${index + 1}`}
                  className="h-full w-full object-cover object-top"
                />
              </a>
            ))}
          </div>
        </section>
      </main>

      <StoreFooter />
    </div>
  );
}
