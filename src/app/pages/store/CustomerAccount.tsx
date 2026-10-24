import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { StoreFooter } from '../../components/store/StoreFooter';
import { StoreHeader } from '../../components/store/StoreHeader';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

type CustomerOrder = { order_number: string; total: number; status: string; created_at: string; currency: string; tracking_carrier: string | null; tracking_number: string | null; shipped_at: string | null };

function trackingUrl(carrier: string, number: string) {
  const encoded = encodeURIComponent(number.trim());
  if (carrier === 'UPS') return `https://www.ups.com/track?tracknum=${encoded}`;
  if (carrier === 'FedEx') return `https://www.fedex.com/fedextrack/?trknbr=${encoded}`;
  if (carrier === 'USPS') return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encoded}`;
  return null;
}

export function CustomerAccount() {
  const { customerAccount, authReady, refreshCustomerAccount, logout } = useApp();
  const navigate = useNavigate(); const [orders, setOrders] = useState<CustomerOrder[]>([]); const [error, setError] = useState(''); const [signingOut, setSigningOut] = useState(false);
  useEffect(() => { if (authReady && !customerAccount) navigate('/auth/customer-login', { replace: true }); }, [authReady, customerAccount, navigate]);
  useEffect(() => { void refreshCustomerAccount(); }, [customerAccount?.id]);
  useEffect(() => {
    if (!supabase || !customerAccount) return;
    void supabase.from('orders').select('order_number,total,status,created_at,currency,tracking_carrier,tracking_number,shipped_at').eq('user_id', customerAccount.id).order('created_at', { ascending: false })
      .then(({ data, error: queryError }) => { if (queryError) setError(queryError.message); else setOrders((data ?? []) as CustomerOrder[]); });
  }, [customerAccount?.id]);
  const signOut = async () => { setSigningOut(true); try { await logout(); navigate('/store'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign out.'); } finally { setSigningOut(false); } };
  if (!authReady || !customerAccount) return <div className="min-h-screen bg-white" />;
  const status = customerAccount.wholesaleStatus;
  return <div className="store-page min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}><StoreHeader/><main className="mx-auto max-w-5xl px-6 py-14 lg:px-10 lg:py-20">
    <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-[10px] uppercase tracking-[3px] text-black/45">Your DAIRI account</p><h1 className="mt-3 text-4xl">Hello, {customerAccount.displayName.split(' ')[0] || 'there'}.</h1><p className="mt-2 text-sm text-black/55">{customerAccount.email}</p></div><button type="button" disabled={signingOut} onClick={() => void signOut()} className="border border-black/20 px-5 py-3 text-xs uppercase tracking-wider disabled:opacity-50">{signingOut ? 'Signing out…' : 'Sign out'}</button></div>
    {error && <p role="alert" className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <section className="mt-10 border border-black/15 p-6 lg:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-[10px] uppercase tracking-[2px] text-black/45">Wholesale access</p><h2 className="mt-2 text-2xl">{status === 'approved' ? 'Approved stockist' : status === 'pending' ? 'Application under review' : status === 'rejected' ? 'Application not approved' : 'Apply to become a stockist'}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-black/60">{status === 'approved' ? `Your account is approved for wholesale pricing. The minimum order is ${customerAccount.wholesaleMoq} pieces across the order.` : status === 'pending' ? 'The DAIRI team is reviewing your application. We will contact you at this email address when there is an update.' : status === 'rejected' ? 'You can update your business information and submit a new application.' : 'Apply for wholesale access to view account pricing and place orders that meet the DAIRI minimum quantity.'}</p>{customerAccount.companyName && <p className="mt-3 text-sm">{customerAccount.companyName}</p>}</div><span className={`px-3 py-2 text-[10px] uppercase tracking-[1px] ${status === 'approved' ? 'bg-emerald-50 text-emerald-800' : status === 'pending' ? 'bg-amber-50 text-amber-800' : 'bg-neutral-100 text-neutral-700'}`}>{status}</span></div>{status !== 'approved' && status !== 'pending' && <div className="mt-6"><Link to="/store/wholesale" className="inline-block bg-black px-6 py-4 text-xs uppercase tracking-[2px] text-white">{status === 'rejected' ? 'Reapply for wholesale' : 'Start an application'}</Link></div>}{status === 'approved' && <Link to="/store/shop" className="mt-6 inline-block text-sm underline">Shop wholesale collection</Link>}</section>
    <section className="mt-12"><div className="flex items-end justify-between border-b border-black/15 pb-4"><div><p className="text-[10px] uppercase tracking-[2px] text-black/45">Order history</p><h2 className="mt-2 text-2xl">Your orders</h2></div></div>{orders.length ? <div className="divide-y divide-black/10">{orders.map(order => {const url=order.tracking_carrier&&order.tracking_number?trackingUrl(order.tracking_carrier,order.tracking_number):null;return <article key={order.order_number} className="flex flex-wrap justify-between gap-3 py-5 text-sm"><div><p className="font-medium">{order.order_number}</p><p className="mt-1 text-xs text-black/50">{new Date(order.created_at).toLocaleDateString()}</p></div><div className="text-right"><p className="font-medium">${Number(order.total).toFixed(2)} {order.currency}</p><p className="mt-1 text-xs capitalize text-black/55">{order.status} · payment features are not enabled yet</p>{order.tracking_carrier&&order.tracking_number&&<p className="mt-2 text-xs">{url?<a href={url} target="_blank" rel="noreferrer" className="underline">Track {order.tracking_carrier} · {order.tracking_number}</a>:`${order.tracking_carrier} · ${order.tracking_number}`}{order.shipped_at?` · shipped ${new Date(order.shipped_at).toLocaleDateString()}`:''}</p>}</div></article>})}</div> : <p className="py-7 text-sm text-black/55">No orders are linked to this account yet.</p>}</section>
    <Link to="/store/shop" className="mt-8 inline-block text-sm underline">Continue shopping</Link>
  </main><StoreFooter/></div>;
}
