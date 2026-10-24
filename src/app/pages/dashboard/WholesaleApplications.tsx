import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

type ApplicationRow = { id: string; company_name: string; contact_name: string; email: string; phone: string; country: string; website: string; business_type: string; annual_volume: string; message: string; status: 'pending'|'approved'|'rejected'; decision_notes: string; wholesale_moq: number; created_at: string; decided_at: string | null };
const statusStyle: Record<ApplicationRow['status'], string> = { pending: 'bg-amber-50 text-amber-800', approved: 'bg-emerald-50 text-emerald-800', rejected: 'bg-neutral-100 text-neutral-600' };

export function WholesaleApplications() {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [filter, setFilter] = useState<'all'|ApplicationRow['status']>('pending');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [moqs, setMoqs] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return; }
    const { data, error: queryError } = await supabase.from('wholesale_applications').select('*').order('created_at', { ascending: false });
    if (queryError) setError(queryError.message); else { setError(''); setApplications((data ?? []) as ApplicationRow[]); }
    setLoading(false);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const decide = async (application: ApplicationRow, status: 'approved'|'rejected') => {
    if (!supabase) return;
    const moq = moqs[application.id] ?? application.wholesale_moq ?? 12;
    if (!Number.isInteger(moq) || moq < 1 || moq > 1000) { toast.error('Set a minimum order quantity from 1 to 1,000 pieces.'); return; }
    setBusy(application.id);
    try {
      const { error: actionError } = await supabase.rpc('decide_wholesale_application', { p_id: application.id, p_status: status, p_notes: notes[application.id] ?? '', p_wholesale_moq: moq });
      if (actionError) toast.error(actionError.message); else { toast.success(`Application ${status}.`); await refresh(); }
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save this application decision.');
    } finally {
      setBusy(null);
    }
  };
  const shown = applications.filter(application => filter === 'all' || application.status === filter);
  return <div className="admin-page p-6 lg:p-10"><div className="mx-auto max-w-6xl">
    <p className="mb-2 text-[10px] uppercase tracking-[3px] text-black/40">Client care</p><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-4xl">Wholesale applications</h1><p className="mt-3 text-sm text-black/55">Review and record decisions for prospective stockists. Decisions are saved to the local backend.</p></div><Link className="text-sm underline" to="/">Back to dashboard</Link></div>
    <div className="my-8 flex flex-wrap gap-2">{(['pending','approved','rejected','all'] as const).map(value => <button key={value} onClick={() => setFilter(value)} className={`border px-4 py-2 text-xs capitalize ${filter === value ? 'border-black bg-black text-white' : 'border-black/15'}`}>{value} ({value === 'all' ? applications.length : applications.filter(item => item.status === value).length})</button>)}</div>
    {error && <p role="alert" className="mb-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {loading ? <p className="text-sm text-black/55">Loading applications…</p> : shown.length === 0 ? <div className="admin-panel p-8 text-sm text-black/60">No {filter === 'all' ? '' : filter + ' '}applications to show.</div> : <div className="space-y-4">{shown.map(application => <article key={application.id} className="admin-panel p-5 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xl font-medium">{application.company_name}</p><p className="mt-1 text-sm text-black/60">{application.contact_name} · <a className="underline" href={`mailto:${application.email}`}>{application.email}</a></p></div><span className={`px-3 py-1 text-[10px] uppercase tracking-[1px] ${statusStyle[application.status]}`}>{application.status}</span></div>
      <div className="mt-5 grid gap-3 border-t border-black/10 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-3"><p><span className="text-black/45">Country</span><br/>{application.country}</p><p><span className="text-black/45">Business type</span><br/>{application.business_type}</p><p><span className="text-black/45">Annual volume</span><br/>{application.annual_volume || 'Not provided'}</p><p><span className="text-black/45">Phone</span><br/>{application.phone || 'Not provided'}</p><p><span className="text-black/45">Website</span><br/>{application.website ? <a href={application.website} target="_blank" rel="noreferrer" className="underline">{application.website}</a> : 'Not provided'}</p><p><span className="text-black/45">Received</span><br/>{new Date(application.created_at).toLocaleString()}</p></div>
      {application.message && <p className="mt-4 whitespace-pre-wrap border-t border-black/10 pt-4 text-sm leading-6">{application.message}</p>}
      {application.status === 'pending' ? <div className="mt-5 border-t border-black/10 pt-4"><label className="block max-w-xs text-xs">Minimum order quantity (pieces)<input type="number" min={1} max={1000} value={moqs[application.id] ?? application.wholesale_moq ?? 12} onChange={event => setMoqs(current => ({ ...current, [application.id]: Number(event.target.value) }))} className="mt-2 h-11 w-full border border-black/15 px-3 text-sm" /></label><label className="mt-4 block text-xs">Internal decision note<textarea maxLength={2000} value={notes[application.id] ?? ''} onChange={event => setNotes(current => ({ ...current, [application.id]: event.target.value }))} className="mt-2 min-h-20 w-full border border-black/15 p-3 text-sm" placeholder="Optional internal note" /></label><div className="mt-3 flex gap-3"><button disabled={busy === application.id} onClick={() => void decide(application, 'approved')} className="bg-black px-5 py-3 text-xs uppercase tracking-wider text-white disabled:opacity-50">Approve</button><button disabled={busy === application.id} onClick={() => void decide(application, 'rejected')} className="border border-black/20 px-5 py-3 text-xs uppercase tracking-wider disabled:opacity-50">Reject</button></div></div> : <div className="mt-4 border-t border-black/10 pt-4 text-sm"><p><span className="text-black/45">Wholesale MOQ:</span> {application.wholesale_moq} pieces</p>{application.decision_notes && <p className="mt-2"><span className="text-black/45">Decision note:</span> {application.decision_notes}</p>}</div>}
    </article>)}</div>}
  </div></div>;
}
