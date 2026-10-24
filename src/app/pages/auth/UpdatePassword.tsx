import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useApp } from '../../context/AppContext';
import { supabaseReady } from '../../lib/supabase';
import { ArrowLeft } from 'lucide-react';

export function UpdatePassword() {
  const [searchParams] = useSearchParams();
  const audience = searchParams.get('audience') === 'customer' ? 'customer' : 'admin';
  const loginPath = audience === 'customer' ? '/auth/customer-login' : '/auth/login';
  const { updatePassword } = useApp();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) { setError('Use at least 8 characters for your new password.'); return; }
    if (password !== confirmPassword) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try {
      await updatePassword(password);
      navigate(loginPath, { replace: true, state: { message: 'Your password has been updated. Sign in with your new password.' } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not update your password. Request a new reset link and try again.');
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
          <h1 className="mb-2 text-4xl tracking-tight">Choose a new password</h1>
          <p className="text-sm leading-6 text-neutral-600">Set a new password for your DAIRI {audience} account.</p>
        </div>
        {!supabaseReady && <p role="status" className="mb-5 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Connect the Supabase backend to update your password.</p>}
        {error && <p role="alert" className="mb-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="new-password" className="mb-2 block text-[10px] uppercase tracking-[2px] text-black/55">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} maxLength={72} className="h-12 w-full rounded-none border border-black/20 bg-white px-3 text-sm focus:border-black focus:outline-none" />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-[10px] uppercase tracking-[2px] text-black/55">Confirm new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required minLength={8} maxLength={72} className="h-12 w-full rounded-none border border-black/20 bg-white px-3 text-sm focus:border-black focus:outline-none" />
          </div>
          <button type="submit" disabled={!supabaseReady || busy} className="admin-button mt-2 flex h-12 w-full items-center justify-center bg-black text-xs uppercase tracking-[3px] text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40">
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
