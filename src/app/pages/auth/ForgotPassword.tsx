import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.info('Local demo mode does not send email. Connect an auth provider to enable password reset.');
  };

  return (
    <div className="flex h-screen items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Link 
          to="/auth/login" 
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>

        <div className="mb-12">
          <h1 className="text-4xl mb-2 tracking-tight">Reset Password</h1>
          <p className="text-neutral-600">
            Enter your email to check the reset flow
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-sm uppercase tracking-wider text-neutral-600 mb-2 block">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 border-neutral-300 rounded-none"
                placeholder="your@email.com"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-black text-white hover:bg-neutral-800 rounded-none"
            >
              Send Reset Link
            </Button>
          </form>
        ) : (
          <div className="p-8 bg-neutral-50 border border-neutral-200">
            <p className="text-neutral-600">
              Local demo mode has no email service, so no reset link was sent to <strong>{email}</strong>. Configure an authentication provider to enable password recovery.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
