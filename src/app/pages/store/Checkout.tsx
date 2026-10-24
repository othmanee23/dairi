import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { StoreHeader } from "../../components/store/StoreHeader";
import { StoreFooter } from "../../components/store/StoreFooter";
import { useApp } from "../../context/AppContext";
import { customerUnitPrice } from "../../data/storeProducts";
import { supabase } from "../../lib/supabase";

type CheckoutEstimate = { subtotal: number; discount: number; discountCode: string | null; shipping: number; tax: number; total: number; shippingConfigured: boolean; taxConfigured: boolean };

export function Checkout() {
  const { cart, products, placeOrder, customerAccount, wholesaleMoq } = useApp();
  const wholesale = customerAccount?.wholesaleStatus === 'approved';
  const navigate = useNavigate();
  const getUnitPrice = (item: typeof cart[number]) => { const product = products.find(p => p.id === item.productId); return product ? customerUnitPrice(product, item.variantId, wholesale) : null; };
  const total = cart.reduce((sum, item) => sum + (getUnitPrice(item) ?? 0) * item.quantity, 0);
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const hasMissingPrice = cart.some(item => getUnitPrice(item) == null);
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [country, setCountry] = useState(''); const [region, setRegion] = useState('');
  const [estimate, setEstimate] = useState<CheckoutEstimate | null>(null);
  const [discountCode, setDiscountCode] = useState(''); const [discountMessage, setDiscountMessage] = useState('');
  useEffect(() => { if (customerAccount) { setName(current => current || customerAccount.displayName); setEmail(current => current || customerAccount.email); } }, [customerAccount?.id]);
  useEffect(() => {
    let current = true;
    setEstimate(null);
    setDiscountMessage('');
    if (!supabase || !/^[a-z]{2}$/i.test(country) || hasMissingPrice) return () => { current = false; };
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase.functions.invoke('customer-actions', { body: { action: 'checkout-estimate', country, region, subtotal: total, discountCode, email } });
      if (!current) return;
      if (error || data?.error) { setDiscountMessage(discountCode ? (data?.error ?? 'Could not validate this code yet.') : ''); return; }
      if (data?.estimate) { const next = data.estimate as CheckoutEstimate; setEstimate(next); setDiscountMessage(next.discountCode ? `${next.discountCode} applied` : discountCode ? 'Code was not applied' : ''); }
    }, 250);
    return () => { current = false; window.clearTimeout(timer); };
  }, [country, region, total, hasMissingPrice, discountCode, email, customerAccount?.id]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      if (wholesale && totalUnits < wholesaleMoq) throw new Error(`Wholesale orders require at least ${wholesaleMoq} pieces.`);
      if (hasMissingPrice) throw new Error('Wholesale pricing is missing for one or more items. Please contact DAIRI.');
      const order = await placeOrder({ name: String(data.get("name")), email: String(data.get("email")), address: String(data.get("address")), city: String(data.get("city")), region: String(data.get("region")), postalCode: String(data.get("postalCode")), country: String(data.get("country")), discountCode: discountCode.trim().toUpperCase() });
      navigate(`/store/order/${order.id}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "We could not save your order. Please try again."); }
    finally { setSubmitting(false); }
  };
  return <div className="store-page min-h-screen bg-white" style={{fontFamily:"Inter, sans-serif"}}>
    <StoreHeader/><main className="max-w-6xl mx-auto px-6 py-14"><Link to="/store/cart" className="text-sm underline">← Back to bag</Link>
      <h1 className="text-3xl mt-8 mb-10">Checkout</h1><div className="grid md:grid-cols-[1fr_360px] gap-12">
        <form onSubmit={submit} className="space-y-5">
          <p className="text-sm text-black/60 border border-black/10 p-4">This places an unpaid order for the studio to review. No payment is collected.</p>
          {wholesale && <p className="text-sm text-black/60">Wholesale minimum: {wholesaleMoq} pieces · {totalUnits} in your bag</p>}
          {error&&<p role="alert" className="text-red-700">{error}</p>}<h2 className="text-xl">Contact and delivery</h2>
          {[['name','Full name','text'],['email','Email address','email'],['address','Street address','text'],['city','City','text'],['region','State / Province / Region code (optional, e.g. CA)','text'],['postalCode','Postal code','text'],['country','Country (2-letter code, e.g. US)','text']].map(([field,label,type])=><label key={field} className="block text-sm">{label}<input name={field} type={type} required={field!=='region'} pattern={field==='country'?'[A-Za-z]{2}':undefined} minLength={field==='country'?2:undefined} maxLength={field==='country'?2:undefined} autoComplete={field==='country'?'country':field==='region'?'address-level1':field} value={field === 'name' ? name : field === 'email' ? email : field === 'country' ? country : field === 'region' ? region : undefined} onChange={field === 'name' ? event => setName(event.target.value) : field === 'email' ? event => setEmail(event.target.value) : field === 'country' ? event => setCountry(event.target.value.toUpperCase()) : field === 'region' ? event => setRegion(event.target.value.toUpperCase()) : undefined} className="block w-full border border-black/20 px-4 py-3 mt-2"/></label>)}
          <label className="block text-sm">Discount code<input name="discountCode" autoComplete="off" maxLength={40} value={discountCode} onChange={event => setDiscountCode(event.target.value.toUpperCase())} placeholder="Enter a code" className="block w-full border border-black/20 px-4 py-3 mt-2" /></label>
          {discountMessage && <p role="status" className={`text-sm ${estimate?.discountCode ? 'text-emerald-800' : 'text-amber-800'}`}>{discountMessage}</p>}
          {hasMissingPrice && <p role="alert" className="text-sm text-amber-800">Wholesale pricing is missing for an item. Contact DAIRI before placing this order.</p>}
          <button disabled={submitting||cart.length===0||hasMissingPrice||(wholesale&&totalUnits<wholesaleMoq)||(Boolean(discountCode.trim())&&!estimate)} className="w-full bg-black text-white py-4 disabled:opacity-50">{submitting?"Saving order…":"Place unpaid order"}</button>
        </form>
        <aside className="border border-black/10 p-6 self-start"><h2 className="text-xl mb-6">Order summary</h2>
          {cart.map(item=>{const product=products.find(p=>p.id===item.productId);const price=getUnitPrice(item);return product?<div key={item.variantId} className="flex justify-between text-sm py-2"><span>{product.name} · {item.color||"Standard"} · {item.size} × {item.quantity}</span><span>{price == null ? 'Contact for pricing' : `$${(price*item.quantity).toFixed(2)}`}</span></div>:null})}
          <div className="flex justify-between border-t pt-4 mt-4 text-sm"><span>Merchandise subtotal</span><span>{hasMissingPrice?'—':`$${total.toFixed(2)}`}</span></div>
          {estimate?.discountCode && <p className="flex justify-between text-sm mt-3 text-emerald-800"><span>Discount · {estimate.discountCode}</span><span>−${estimate.discount.toFixed(2)}</span></p>}
          <p className="flex justify-between text-sm mt-3"><span>Shipping</span><span>{estimate?.shippingConfigured ? `$${estimate.shipping.toFixed(2)}` : 'Studio quote'}</span></p>
          <p className="flex justify-between text-sm mt-3"><span>Estimated tax</span><span>{estimate?.taxConfigured ? `$${estimate.tax.toFixed(2)}` : 'Confirmed by studio'}</span></p>
          <p className="flex justify-between border-t pt-4 mt-4 font-semibold"><span>Estimated total</span><span>{hasMissingPrice?'—':`$${(estimate?.total ?? total).toFixed(2)}`}</span></p>
          {(!estimate?.shippingConfigured || !estimate?.taxConfigured) && <p className="mt-4 text-xs text-black/50">Unconfigured amounts will be confirmed by DAIRI before payment. All prices are USD.</p>}
        </aside>
      </div>
    </main><StoreFooter/>
  </div>;
}

export function OrderConfirmation() {
  const { id } = useParams();
  const { orders, products } = useApp();
  const order = orders.find(item => item.id === id);
  return <div className="store-page min-h-screen bg-white" style={{fontFamily:"Inter, sans-serif"}}><StoreHeader/><main className="max-w-3xl mx-auto px-6 py-24 text-center">{order ? <><p className="text-xs uppercase tracking-[.25em] text-black/45">Order received · unpaid</p><h1 className="text-4xl mt-5 mb-4">Thank you.</h1><p className="text-black/60">Order <strong>{order.id}</strong> has been saved for studio review. No payment was collected.</p><div className="border-y border-black/10 my-10 py-6 text-left">{order.items.map(item=>{const product=products.find(p=>p.id===item.productId);return <p key={item.variantId} className="py-2 text-sm">{product?.name??`Product ${item.productId}`} · {item.color||"Standard"} · {item.size} × {item.quantity}</p>})}<p className="flex justify-between border-t mt-4 pt-4 text-sm"><span>Merchandise subtotal</span><span>${(order.subtotal ?? order.total).toFixed(2)} USD</span></p>{order.discountCode && <p className="flex justify-between mt-2 text-sm text-emerald-800"><span>Discount · {order.discountCode}</span><span>−${(order.discount ?? 0).toFixed(2)} USD</span></p>}<p className="flex justify-between mt-2 text-sm"><span>Shipping</span><span>{order.shippingConfigured ? `$${(order.shipping ?? 0).toFixed(2)} USD` : 'To be quoted by studio'}</span></p><p className="flex justify-between mt-2 text-sm"><span>Tax</span><span>{order.taxConfigured ? `$${(order.tax ?? 0).toFixed(2)} USD` : 'Confirmed by studio'}</span></p><p className="font-semibold border-t mt-4 pt-4">Estimated total ${order.total.toFixed(2)} USD</p></div><Link to="/store/shop" className="inline-block bg-black text-white px-8 py-4">Continue shopping</Link></>:<><h1 className="text-3xl mb-4">Order not found</h1><Link className="underline" to="/store">Return to DAIRI</Link></>}</main><StoreFooter/></div>;
}
