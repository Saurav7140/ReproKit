import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './hosted-client';

export function useHostedAuth() {
  const [session,setSession] = useState<Session | null>(null);
  const [ready,setReady] = useState(!supabase);
  const [recovery,setRecovery] = useState(new URLSearchParams(location.search).get('recovery') === '1');
  const [linkError,setLinkError] = useState('');
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((event,next) => { if (active) { setSession(next); setReady(true); if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') setLinkError(''); if (event === 'PASSWORD_RECOVERY') setRecovery(true); } });
    const linkFailed = () => { if (active) { setReady(true); setRecovery(false); setLinkError('The authentication link could not be completed. Request a new confirmation or reset email.'); history.replaceState(null,'','/?view=hosted'); } };
    void (async () => {
      const initialized = await supabase!.auth.initialize();
      const { data,error } = await supabase!.auth.getSession();
      if (active) { setSession(data.session); setReady(true); if (initialized.error || error) linkFailed(); }
    })().catch(linkFailed);
    return () => { active = false; data.subscription.unsubscribe(); };
  },[]);
  return { session,ready,recovery,setRecovery,linkError };
}

export function Auth({ session,recovery,onRecovered }: { session: Session | null; recovery: boolean; onRecovered: () => void }) {
  const [mode,setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email,setEmail] = useState(''); const [password,setPassword] = useState(''); const [confirmation,setConfirmation] = useState('');
  const [busy,setBusy] = useState(false); const [message,setMessage] = useState(''); const [error,setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setMessage(''); setError('');
    try {
      let result;
      if (session && recovery) {
        if (password !== confirmation) throw new Error('password_match');
        result = await supabase.auth.updateUser({ password });
        if (!result.error) { setPassword(''); setConfirmation(''); onRecovered(); setMessage('Password updated.'); }
      } else if (mode === 'signin') result = await supabase.auth.signInWithPassword({ email,password });
      else if (mode === 'signup') {
        result = await supabase.auth.signUp({ email,password,options: { emailRedirectTo: `${location.origin}/?view=hosted` } });
        if (!result.error) setMessage(result.data.session ? 'Account created. You are signed in.' : 'Check your inbox for a confirmation link. After confirming, return here to sign in.');
      } else {
        result = await supabase.auth.resetPasswordForEmail(email,{ redirectTo: `${location.origin}/?view=hosted&recovery=1` });
        if (!result.error) setMessage('If that account exists, a reset link has been requested. Check your inbox.');
      }
      if (result.error) throw result.error;
      setPassword('');
    } catch (failure) {
      const code = (failure as { code?: string; message?: string }).code ?? (failure as Error).message;
      setError(code === 'password_match' ? 'The passwords do not match.' : code === 'invalid_credentials' ? 'Email or password is incorrect.' : code === 'email_not_confirmed' ? 'Confirm your email before signing in.' : code === 'over_email_send_rate_limit' ? 'Email rate limit reached. Wait before requesting another link.' : 'Authentication could not finish. Check your details and project email/redirect setup, then try again.');
    } finally { setBusy(false); }
  }
  async function signOut() {
    setBusy(true); setError('');
    try { const result = await supabase!.auth.signOut(); if (result.error) throw result.error; }
    catch { setError('Sign-out failed. Retry.'); }
    finally { setBusy(false); }
  }
  async function resend() {
    setBusy(true); setError('');
    try { const result = await supabase!.auth.resend({ type: 'signup',email, options: { emailRedirectTo: `${location.origin}/?view=hosted` } }); if (result.error) throw result.error; setMessage('Confirmation email requested if the account is eligible.'); }
    catch { setError('Confirmation could not be requested. Check the address and retry later.'); }
    finally { setBusy(false); }
  }
  if (session && !recovery) return <div className="account-row"><span>Signed in as {session.user.email}</span><button className="button" disabled={busy} onClick={() => void signOut()}>Sign out</button>{message && <p role="status" className="operation-status">{message}</p>}{error && <p role="alert" className="error">{error}</p>}</div>;
  return <section className="auth-panel"><h2>{session && recovery ? 'Choose a new password' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create an account' : 'Reset your password'}</h2>
    <p>Local report import, replay and export stay available without an account.</p>
    <form onSubmit={(event) => void submit(event)}>
      {!session && <><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></>}
      {(session || mode !== 'reset') && <><label htmlFor="auth-password">{recovery ? 'New password' : 'Password'}</label><input id="auth-password" type="password" minLength={mode === 'signup' || recovery ? 12 : 1} autoComplete={mode === 'signin' && !recovery ? 'current-password' : 'new-password'} required value={password} onChange={(event) => setPassword(event.target.value)} /></>}
      {session && recovery && <><label htmlFor="auth-confirm">Confirm new password</label><input id="auth-confirm" type="password" minLength={12} autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></>}
      <button className="button primary" disabled={busy}>{busy ? 'Working…' : session && recovery ? 'Update password' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}</button>
    </form>
    {!session && <div className="capture-actions">{(['signin','signup','reset'] as const).filter((item) => item !== mode).map((item) => <button className="button" key={item} disabled={busy} onClick={() => { setMode(item); setPassword(''); setError(''); setMessage(''); }}>{item === 'signin' ? 'Back to sign in' : item === 'signup' ? 'Create an account' : 'Forgot password?'}</button>)}<button className="button" disabled={busy || !email} onClick={() => void resend()}>Resend confirmation</button></div>}
    {message && <p role="status" className="operation-status">{message}</p>}{error && <p role="alert" className="error">{error}</p>}
  </section>;
}
