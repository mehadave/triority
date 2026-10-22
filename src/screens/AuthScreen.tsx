import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { isRemoteConfigured, loadRemote } from '../data/session';
import { Turnstile, turnstileSiteKey } from '../features/Turnstile';
import { useAuth } from '../state/auth';

type Mode = 'signin' | 'signup';

export function AuthScreen() {
  const status = useAuth((s) => s.status);
  const email = useAuth((s) => s.session?.user.email);
  const [mode, setMode] = useState<Mode>('signin');
  const [form, setForm] = useState({ email: '', password: '' });
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const configured = isRemoteConfigured();

  // Warm the account code while the user types.
  useEffect(() => {
    if (configured) void loadRemote().catch(() => undefined);
  }, [configured]);

  const needsCaptcha = Boolean(turnstileSiteKey);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const remote = await loadRemote();
      if (mode === 'signup') {
        const { needsConfirmation } = await remote.signUp(
          form.email,
          form.password,
          token ?? undefined,
        );
        if (needsConfirmation) setMessage('Check your inbox to confirm your email, then sign in.');
      } else {
        await remote.signInWithPassword(form.email, form.password, token ?? undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    try {
      await (await loadRemote()).signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    }
  };

  if (status === 'signedIn') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="title">You’re in</h1>
        <p className="text-[16px]">Signed in as {email}. Your history now follows you.</p>
        <Link to="/" className="btn-sun">
          Back to today
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-4">
      <h1 className="title">{mode === 'signin' ? 'Sign in' : 'Make an account'}</h1>
      <p className="mt-3 max-w-xs text-center text-[16px]">
        Sign in to keep your history across devices.
      </p>
      <p className="text-muted-ink mt-1 text-center text-[14px]">
        Triority works fully without an account, too.
      </p>

      {!configured ? (
        <p className="mt-8 max-w-xs text-center text-[15px]">
          Accounts aren’t switched on for this build.
        </p>
      ) : (
        <div className="mt-8 w-full max-w-sm">
          <form onSubmit={submit} className="flex flex-col gap-5">
            <label className="flex flex-col gap-1">
              <span className="text-[14px] font-medium">Email</span>
              <input
                className="ink-input"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[14px] font-medium">Password</span>
              <input
                className="ink-input"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            {needsCaptcha && <Turnstile key={mode} onToken={setToken} />}
            {error && (
              <p role="alert" className="text-[14px]">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="text-[14px]">
                {message}
              </p>
            )}
            <button type="submit" className="btn-sun" disabled={busy || (needsCaptcha && !token)}>
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <div
            className="text-muted-ink my-5 flex items-center gap-3 text-[13px]"
            aria-hidden="true"
          >
            <span className="bg-hairline h-px flex-1" />
            or
            <span className="bg-hairline h-px flex-1" />
          </div>
          <button type="button" className="btn-ghost w-full" onClick={google}>
            Continue with Google
          </button>
          <p className="mt-6 text-center text-[15px]">
            {mode === 'signin' ? 'New here? ' : 'Already have an account? '}
            <button
              type="button"
              className="min-h-11 font-medium underline underline-offset-4"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setToken(null);
                setError(null);
                setMessage(null);
              }}
            >
              {mode === 'signin' ? 'Make an account' : 'Sign in'}
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

export default AuthScreen;
