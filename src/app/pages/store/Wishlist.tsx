import { Link } from "react-router";

import { StoreFooter } from "../../components/store/StoreFooter";
import { StoreHeader } from "../../components/store/StoreHeader";
import { storeProducts } from "../../data/storeProducts";

export function Wishlist() {
  const items = storeProducts.slice(6, 9);

  return (
    <div className="store-page min-h-screen bg-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <StoreHeader />
      <main className="px-8 lg:px-10 py-16">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="text-3xl mb-3">Wishlist</h1>
            <p className="text-black/55">Save pieces here and move them to your bag when you are ready.</p>
          </div>
          <Link to="/store/shop" className="hidden md:block underline underline-offset-2">Continue shopping</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {items.map((item) => (
            <Link key={item.id} to={`/store/products/${item.id}`} className="store-card block">
              <div className="relative aspect-[4/5] bg-[#f6f6f6] overflow-hidden mb-4">
                <img src={item.image} alt={item.name} className="h-full w-full object-cover object-top" />
                <span className="absolute right-4 bottom-3 text-2xl">+</span>
              </div>
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-sm mt-1">${item.price}</p>
            </Link>
          ))}
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
