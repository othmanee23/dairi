import { useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { Link } from 'react-router';

export function ClientActivity() {
  const { orders, supportRequests, subscribers, products, cancelOrder, updateOrderTracking, retryOrderEmails } = useApp();
  const [cancelingOrder, setCancelingOrder] = useState<string | null>(null);
  const [confirmCancelOrder, setConfirmCancelOrder] = useState<string | null>(null);
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, { carrier: string; number: string }>>({});
  const [savingTracking, setSavingTracking] = useState<string | null>(null);
  const [retryingEmail, setRetryingEmail] = useState<string | null>(null);
  const handleCancel = async (orderNumber: string) => {
    setCancelingOrder(orderNumber);
    try { await cancelOrder(orderNumber); toast.success('Order cancelled and stock released.'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not cancel this order.'); }
    finally { setCancelingOrder(null); setConfirmCancelOrder(null); }
  };
  const handleSaveTracking = async (orderNumber: string) => {
    const draft = trackingDrafts[orderNumber];
    if (!draft) return;
    setSavingTracking(orderNumber);
    try { await updateOrderTracking(orderNumber, draft.carrier, draft.number); toast.success('Tracking saved and order marked shipped.'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save tracking.'); }
    finally { setSavingTracking(null); }
  };
  const handleRetryEmails = async (orderNumber: string) => {
    setRetryingEmail(orderNumber);
    try { const result = await retryOrderEmails(orderNumber); toast.success(`Email status · confirmation: ${result.confirmation.replaceAll('_', ' ')} · shipment: ${result.shipment.replaceAll('_', ' ')}`); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not retry order email.'); }
    finally { setRetryingEmail(null); }
  };

  return <div className="admin-page p-8 lg:p-10"><div className="max-w-6xl mx-auto"><p className="mb-2 text-[10px] uppercase tracking-[3px] text-black/40">Client care</p><h1 className="text-4xl mb-10">Client activity</h1>
    <section className="mb-12"><h2 className="text-2xl mb-5">Orders <span className="text-base text-black/45">{orders.length}</span></h2>{orders.length?<div className="space-y-4">{orders.map(order=>{const draft=trackingDrafts[order.id]??{carrier:order.trackingCarrier??'USPS',number:order.trackingNumber??''};return <article key={order.id} className="admin-panel p-5"><div className="flex flex-wrap justify-between gap-4"><div><p className="font-medium">{order.id} · {order.customer.name}</p><p className="text-sm text-neutral-600">{order.customer.email} · {new Date(order.createdAt).toLocaleString()}</p></div><div className="text-right"><p className="font-semibold">${order.total.toFixed(2)} · {order.status}</p>{order.status === 'pending' && (confirmCancelOrder === order.id ? <div className="mt-2 flex justify-end gap-3 text-xs"><span className="text-neutral-600">Release reserved stock?</span><button type="button" disabled={cancelingOrder === order.id} onClick={() => void handleCancel(order.id)} className="underline disabled:opacity-50">{cancelingOrder === order.id ? 'Cancelling…' : 'Confirm cancel'}</button><button type="button" onClick={() => setConfirmCancelOrder(null)} className="underline">Keep order</button></div> : <button type="button" onClick={() => setConfirmCancelOrder(order.id)} className="mt-2 text-xs underline">Cancel unpaid order</button>)}</div></div><div className="mt-4 border-t pt-3 text-sm">{order.items.map(item=><p key={item.variantId}>{products.find(p=>p.id===item.productId)?.name ?? 'Removed product'} · {item.color || 'Standard'} · {item.size} × {item.quantity}{item.sku ? ` · ${item.sku}` : ''}</p>)}</div><p className="text-xs text-neutral-500 mt-3">Unpaid order · payment not processed</p><div className="mt-4 border-t border-black/10 pt-4"><p className="text-sm font-medium">Shipping and tracking</p><div className="mt-3 grid gap-3 sm:grid-cols-[150px_1fr_auto]"><select aria-label={`Carrier for ${order.id}`} value={draft.carrier} onChange={event=>setTrackingDrafts(current=>({...current,[order.id]:{...draft,carrier:event.target.value}}))} className="h-11 border border-black/15 bg-white px-3 text-sm"><option>USPS</option><option>UPS</option><option>FedEx</option><option>Other</option></select><input aria-label={`Tracking number for ${order.id}`} value={draft.number} maxLength={100} onChange={event=>setTrackingDrafts(current=>({...current,[order.id]:{...draft,number:event.target.value}}))} placeholder="Tracking number" className="h-11 border border-black/15 px-3 text-sm"/><button type="button" disabled={savingTracking===order.id||!draft.number.trim()} onClick={()=>void handleSaveTracking(order.id)} className="bg-black px-4 py-3 text-xs text-white disabled:opacity-50">{savingTracking===order.id?'Saving…':order.status==='shipped'?'Update tracking':'Save and mark shipped'}</button></div>{order.trackingNumber&&<p className="mt-2 text-xs text-neutral-500">Current: {order.trackingCarrier} · {order.trackingNumber}{order.shippedAt?` · shipped ${new Date(order.shippedAt).toLocaleDateString()}`:''}</p>}<button type="button" disabled={retryingEmail===order.id} onClick={()=>void handleRetryEmails(order.id)} className="mt-3 text-xs underline disabled:opacity-50">{retryingEmail===order.id?'Checking email…':'Check or retry queued emails'}</button><p className="mt-1 text-xs text-neutral-500">Email delivery requires the configured studio sender.</p></div></article>})}</div>:<p className="text-neutral-600">No orders yet.</p>}</section>
    <section className="mb-12"><h2 className="text-2xl mb-5">Support requests <span className="text-base text-black/45">{supportRequests.length}</span></h2>{supportRequests.length?<div className="space-y-3">{[...supportRequests].reverse().map((request,index)=><article key={`${request.createdAt}-${index}`} className="admin-panel p-5"><p className="text-sm">{request.email} · {new Date(request.createdAt).toLocaleString()}</p><p className="mt-3 whitespace-pre-wrap">{request.message}</p></article>)}</div>:<p className="text-neutral-600">No client requests yet.</p>}</section>
    <section><h2 className="text-2xl mb-5">Private list <span className="text-base text-black/45">{subscribers.length}</span></h2>{subscribers.length?<ul className="admin-panel p-5 divide-y">{subscribers.map(email=><li key={email} className="py-3 text-sm">{email}</li>)}</ul>:<p className="text-neutral-600">No subscribers yet.</p>}</section><Link to="/" className="inline-block mt-10 underline text-sm">Back to dashboard</Link></div></div>;
}
