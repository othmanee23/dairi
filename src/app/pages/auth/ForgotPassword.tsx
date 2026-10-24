import { FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useApp } from '../../context/AppContext';
import { supabaseReady } from '../../lib/supabase';
import { ArrowLeft } from 'lucide-react';

export function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const audience = searchParams.get('audience') === 'customer' ? 'customer' : 'admin';
  const loginPath = audience === 'customer' ? '/auth/customer-login' : '/auth/login';
  const { requestPasswordReset } = useApp();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await requestPasswordReset(email, audience);
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not send the reset email. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Link to={loginPath} className="mb-8 inline-flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-black">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
        <div className="mb-10">
          <p className="mb-3 text-[10px] uppercase tracking-[3px] text-black/40">Account recovery</p>
          <h1 className="mb-2 text-4xl tracking-tight">Reset password</h1>
          <p className="text-sm leading-6 text-neutral-600">Enter the email address on your DAIRI {audience} account. We’ll send a secure reset link.</p>
        </div>

        {!supabaseReady && <p role="status" className="mb-5 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Connect the Supabase backend to enable password recovery.</p>}
        {error && <p role="alert" className="mb-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {submitted ? (
          <p role="status" className="border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">If an account exists for <strong>{email}</strong>, a password reset link is on its way.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="reset-email" className="mb-2 block text-[10px] uppercase tracking-[2px] text-black/55">Email</label>
              <input id="reset-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} className="h-12 w-full rounded-none border border-black/20 bg-white px-3 text-sm focus:border-black focus:outline-none" placeholder="your@email.com" />
            </div>
            <button type="submit" disabled={!supabaseReady || busy} className="admin-button mt-2 flex h-12 w-full items-center justify-center bg-black text-xs uppercase tracking-[3px] text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
