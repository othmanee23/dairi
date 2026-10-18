import { FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { StoreHeader } from "../../components/store/StoreHeader";
import { StoreFooter } from "../../components/store/StoreFooter";
import { useApp } from "../../context/AppContext";

export function Checkout() {
  const { cart, products, placeOrder } = useApp();
  const navigate = useNavigate();
  const total = cart.reduce((sum, item) => sum + (products.find(p => p.id === item.productId)?.price ?? 0) * item.quantity, 0);
  const [error, setError] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const order = placeOrder({ name: String(data.get("name")), email: String(data.get("email")), address: String(data.get("address")), city: String(data.get("city")), postalCode: String(data.get("postalCode")), country: String(data.get("country")) }); if (order) navigate(`/store/order/${order.id}`); else setError("Your bag is empty. Add an item before checkout."); };
  return <div className="store-page min-h-screen bg-white" style={{fontFamily:"Inter, sans-serif"}}><StoreHeader/><main className="max-w-6xl mx-auto px-6 py-14"><Link to="/store/cart" className="text-sm underline">← Back to bag</Link><h1 className="text-3xl mt-8 mb-10">Checkout</h1><div className="grid md:grid-cols-[1fr_360px] gap-12"><form onSubmit={submit} className="space-y-5"><p className="text-sm text-black/60 border border-black/10 p-4">Local preview checkout: this records a sample order in this browser. No payment is charged.</p>{error&&<p role="alert" className="text-red-700">{error}</p>}<h2 className="text-xl">Contact and delivery</h2>{[["name","Full name","text"],["email","Email address","email"],["address","Street address","text"],["city","City","text"],["postalCode","Postal code","text"],["country","Country","text"]].map(([name,label,type])=><label key={name} className="block text-sm">{label}<input name={name} type={type} required autoComplete={name} className="block w-full border border-black/20 px-4 py-3 mt-2"/></label>)}<button className="w-full bg-black text-white py-4">Place sample order</button></form><aside className="border border-black/10 p-6 self-start"><h2 className="text-xl mb-6">Order summary</h2>{cart.map(item=>{const p=products.find(x=>x.id===item.productId);return p?<div key={`${item.productId}${item.size}`} className="flex justify-between text-sm py-2"><span>{p.name} · {item.size} × {item.quantity}</span><span>${(p.price*item.quantity).toFixed(2)}</span></div>:null})}<div className="flex justify-between border-t pt-4 mt-4 font-semibold"><span>Total</span><span>${total.toFixed(2)}</span></div></aside></div></main><StoreFooter/></div>;
}

export function OrderConfirmation() {
  const { id } = useParams();
  const { orders, products } = useApp();
  const order = orders.find(item => item.id === id);
  return <div className="store-page min-h-screen bg-white" style={{fontFamily:"Inter, sans-serif"}}><StoreHeader/><main className="max-w-3xl mx-auto px-6 py-24 text-center">{order ? <><p className="text-xs uppercase tracking-[.25em] text-black/45">Order received · local preview</p><h1 className="text-4xl mt-5 mb-4">Thank you, {order.customer.name.split(" ")[0]}.</h1><p className="text-black/60">Sample order <strong>{order.id}</strong> has been saved in this browser. No payment was taken.</p><div className="border-y border-black/10 my-10 py-6 text-left">{order.items.map(item=>{const product = products.find(p=>p.id===item.productId); return <p key={`${item.productId}${item.size}`} className="py-2 text-sm">{product?.name ?? `Product ${item.productId}`} · {item.size} × {item.quantity}</p>})}<p className="font-semibold border-t mt-4 pt-4">Total ${order.total.toFixed(2)}</p></div><Link to="/store/shop" className="inline-block bg-black text-white px-8 py-4">Continue shopping</Link></>:<><h1 className="text-3xl mb-4">Order not found</h1><Link className="underline" to="/store">Return to DAIRI</Link></>}</main><StoreFooter/></div>;
}
