import { Link } from "react-router";
import { StoreFooter } from "../../components/store/StoreFooter";
import { StoreHeader } from "../../components/store/StoreHeader";
import { useApp } from "../../context/AppContext";
import { toStoreProduct } from "../../data/storeProducts";

export function Cart() {
  const { cart, products, setCartQuantity, removeFromCart } = useApp();
  const items = cart.map((line) => ({ line, product: products.find(p => p.id === line.productId) })).filter((row): row is { line: typeof cart[number]; product: NonNullable<typeof row.product> } => Boolean(row.product));
  const subtotal = items.reduce((sum, { line, product }) => sum + product.price * line.quantity, 0);
  return <div className="store-page min-h-screen bg-white" style={{ fontFamily: "Inter, sans-serif" }}><StoreHeader /><main className="px-8 lg:px-10 py-16">
    <h1 className="text-3xl mb-10">Shopping Bag <span className="text-base text-black/45">({cart.reduce((n, i) => n + i.quantity, 0)})</span></h1>
    {!items.length ? <div className="py-20 text-center"><p className="text-black/55 mb-6">Your bag is waiting for something special.</p><Link to="/store/shop" className="store-button-motion inline-block bg-black text-white px-8 py-4">Explore the collection</Link></div> : <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-14">
      <section className="space-y-6">{items.map(({ line, product }) => { const view = toStoreProduct(product); return <div key={`${line.productId}:${line.size}`} className="grid grid-cols-[100px_1fr_auto] md:grid-cols-[130px_1fr_auto] gap-5 border-b border-black/10 pb-6"><Link to={`/store/products/${product.id}`}><img src={view.image} alt={product.name} className="aspect-[4/5] w-full object-cover object-top bg-[#f6f6f6]" /></Link><div><Link to={`/store/products/${product.id}`} className="font-medium">{product.name}</Link><p className="text-sm text-black/55 mt-2">{view.color} / Size {line.size}</p><p className="text-sm text-black/55 mt-1">{product.category}</p><label className="mt-4 inline-flex items-center gap-2 text-sm">Qty <select aria-label={`Quantity for ${product.name}`} value={line.quantity} onChange={e => setCartQuantity(product.id, line.size, Number(e.target.value))} className="border border-black/20 px-2 py-1">{Array.from({length:10},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label><button className="block mt-3 text-xs underline" onClick={() => removeFromCart(product.id,line.size)}>Remove</button></div><p>${(product.price * line.quantity).toFixed(2)}</p></div>; })}</section>
      <aside className="border border-black/10 p-6 self-start"><h2 className="text-xl mb-6">Order Summary</h2><div className="flex justify-between text-sm mb-3"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div><div className="flex justify-between text-sm mb-6"><span>Estimated shipping</span><span>Free</span></div><div className="flex justify-between font-semibold border-t border-black/10 pt-5 mb-6"><span>Total</span><span>${subtotal.toFixed(2)}</span></div><Link to="/store/checkout" className="block text-center store-button-motion w-full bg-black text-white py-4">Checkout</Link><Link to="/store/shop" className="block text-center text-sm mt-5 underline underline-offset-2">Continue shopping</Link></aside>
    </div>}</main><StoreFooter /></div>;
}
