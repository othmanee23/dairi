import { Link } from "react-router";

import { StoreFooter } from "../../components/store/StoreFooter";
import { StoreHeader } from "../../components/store/StoreHeader";
import { storeProducts } from "../../data/storeProducts";

export function Cart() {
  const items = storeProducts.slice(0, 2);
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="store-page min-h-screen bg-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <StoreHeader />
      <main className="px-8 lg:px-10 py-16">
        <h1 className="text-3xl mb-10">Shopping Bag</h1>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-14">
          <section className="space-y-6">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-[130px_1fr_auto] gap-6 border-b border-black/10 pb-6">
                <img src={item.image} alt={item.name} className="aspect-[4/5] object-cover object-top bg-[#f6f6f6]" />
                <div>
                  <Link to={`/store/products/${item.id}`} className="font-medium">{item.name}</Link>
                  <p className="text-sm text-black/55 mt-2">{item.color} / Qty 1</p>
                  <p className="text-sm text-black/55 mt-1">{item.category}</p>
                </div>
                <p>${item.price}</p>
              </div>
            ))}
          </section>
          <aside className="border border-black/10 p-6 self-start">
            <h2 className="text-xl mb-6">Order Summary</h2>
            <div className="flex justify-between text-sm mb-3"><span>Subtotal</span><span>${subtotal}</span></div>
            <div className="flex justify-between text-sm mb-6"><span>Estimated shipping</span><span>Free</span></div>
            <div className="flex justify-between font-semibold border-t border-black/10 pt-5 mb-6"><span>Total</span><span>${subtotal}</span></div>
            <button className="store-button-motion w-full bg-black text-white py-4">Checkout</button>
            <Link to="/store/shop" className="block text-center text-sm mt-5 underline underline-offset-2">Continue shopping</Link>
          </aside>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
