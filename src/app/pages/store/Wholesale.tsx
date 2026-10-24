import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { StoreFooter } from '../../components/store/StoreFooter';
import { StoreHeader } from '../../components/store/StoreHeader';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { usePageSeo } from '../../lib/seo';

const fields = [
  ['companyName', 'Company name', 'text'], ['contactName', 'Your name', 'text'],
  ['email', 'Business email', 'email'], ['phone', 'Phone', 'tel'],
  ['country', 'Country', 'text'], ['website', 'Website', 'url'],
  ['businessType', 'Business type', 'text'], ['annualVolume', 'Estimated annual order volume', 'text'],
] as const;
type Application = Record<(typeof fields)[number][0] | 'message', string>;
const blank: Application = { companyName: '', contactName: '', email: '', phone: '', country: '', website: '', businessType: '', annualVolume: '', message: '' };

export function Wholesale() {
  usePageSeo({ title: 'Wholesale Fashion for Retailers | DAIRI', description: 'Apply for DAIRI wholesale access. Retail buyers can request an account, review wholesale pricing after approval, and submit unpaid orders.', path: '/store/wholesale' });
  const { customerAccount } = useApp();
  const [form, setForm] = useState<Application>(blank);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  useEffect(() => { if (customerAccount && !form.email) setForm(current => ({ ...current, email: customerAccount.email })); }, [customerAccount?.email]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError('');
    try {
      if (!supabase) throw new Error('The local backend is not available. Start Supabase and try again.');
      const { data, error: invokeError } = await supabase.functions.invoke('customer-actions', { body: { action: 'wholesale-application', application: form } });
      if (invokeError) throw new Error(data?.error ?? invokeError.message);
      setSent(true); setForm(blank);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not submit your application. Please try again.'); }
    finally { setSubmitting(false); }
  };
  return <div className="store-page min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}><StoreHeader />
    <main className="mx-auto max-w-5xl px-6 py-16 lg:px-12 lg:py-24">
      <p className="mb-4 text-[10px] uppercase tracking-[3px] text-black/45">DAIRI for business</p>
      <h1 className="max-w-3xl text-4xl font-medium leading-tight md:text-6xl">A considered collection for your store.</h1>
      <p className="mt-6 max-w-2xl text-sm leading-7 text-black/65">Tell us about your business to request wholesale access. Our team will review your application and contact you by email. Sign in first, or create an account with this email and verify it later to link your application to your account. Submitting this form does not place an order or process a payment.</p>
      {!customerAccount && <p className="mt-4 text-sm"><Link to="/auth/customer-login" className="underline">Sign in</Link><span className="mx-2 text-black/35">or</span><Link to="/auth/register" className="underline">create a customer account</Link></p>}
      {sent ? <div role="status" className="mt-12 border border-black/15 bg-[#f7f6f3] p-8"><h2 className="text-2xl">Application received</h2><p className="mt-3 text-sm leading-6 text-black/65">Thank you. The DAIRI team will review your business details and follow up by email.</p><button type="button" onClick={() => setSent(false)} className="mt-6 text-sm underline">Submit another application</button></div> :
        <form onSubmit={submit} className="mt-12 grid gap-5 border-t border-black/15 pt-8 md:grid-cols-2">
          {fields.map(([key, label, type]) => <label key={key} className="block text-xs">{label}{key !== 'phone' && key !== 'website' ? ' *' : ''}<input required={key !== 'phone' && key !== 'website'} type={type} autoComplete={key === 'email' ? 'email' : undefined} value={form[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} className="mt-2 block h-12 w-full border border-black/20 bg-white px-3 text-sm outline-none focus:border-black" /></label>)}
          <label className="block text-xs md:col-span-2">Tell us about your store and what you are looking for<textarea value={form.message} maxLength={3000} onChange={event => setForm(current => ({ ...current, message: event.target.value }))} rows={5} className="mt-2 block w-full border border-black/20 bg-white p-3 text-sm outline-none focus:border-black" /></label>
          {error && <p role="alert" className="text-sm text-red-700 md:col-span-2">{error}</p>}
          <div className="flex flex-wrap items-center gap-5 md:col-span-2"><button disabled={submitting} className="bg-black px-7 py-4 text-xs uppercase tracking-[2px] text-white disabled:opacity-50">{submitting ? 'Submitting…' : 'Request wholesale access'}</button><Link to="/store/shop" className="text-xs underline">Continue shopping</Link></div>
        </form>}
    </main><StoreFooter /></div>;
}
