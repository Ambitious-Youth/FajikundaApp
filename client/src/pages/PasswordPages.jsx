import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

// ─── Forgot Password ──────────────────────────────────────────────────────────

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const submit = async (e) => {
    e.preventDefault(); setStatus('submitting');
    try {
      await api.post('/auth/forgot-password', { email });
      setStatus('sent');
    } catch {
      setStatus('sent'); // Always show success to avoid email enumeration
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-hero">
          <span className="hero-globe" style={{ animationDelay: '0s' }}>🌍</span>
          <h1>Fajikunda Society</h1>
          <p>We'll send you a link to reset your password and get you back to the community.</p>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          {status === 'sent' ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📬</div>
              <h2 style={{ fontFamily: 'var(--font-h)', marginBottom: '.75rem', color: 'var(--earth)' }}>Check your email</h2>
              <p style={{ color: 'var(--text2)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
                If <strong>{email}</strong> is registered, you'll receive a reset link within a few minutes.
                Check your spam folder if you don't see it.
              </p>
              <Link to="/login" className="btn-primary" style={{ display: 'inline-flex' }}>← Back to Sign In</Link>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily: 'var(--font-h)', fontSize: '1.8rem', marginBottom: '.5rem', color: 'var(--earth)' }}>
                Forgot password?
              </h2>
              <p style={{ color: 'var(--text2)', marginBottom: '1.5rem', fontSize: '.9rem' }}>
                Enter your email and we'll send you a reset link.
              </p>
              <form onSubmit={submit}>
                <div className="field">
                  <label>Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required autoFocus />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '.88rem', color: 'var(--text3)' }}>
                <Link to="/login">← Back to Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [status, setStatus] = useState('');

  if (!token) return (
    <div className="auth-wrap">
      <div className="auth-right" style={{ width: '100%' }}>
        <div className="auth-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
            <h2 style={{ fontFamily: 'var(--font-h)', color: 'var(--earth)', marginBottom: '.75rem' }}>Invalid link</h2>
            <p style={{ color: 'var(--text2)', marginBottom: '1.5rem' }}>
              This reset link is missing or invalid. Please request a new one.
            </p>
            <Link to="/forgot-password" className="btn-primary">Request New Link</Link>
          </div>
        </div>
      </div>
    </div>
  );

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setStatus('Passwords do not match');
    if (form.password.length < 8) return setStatus('Password must be at least 8 characters');
    setStatus('submitting');
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      setStatus('success');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setStatus(err.response?.data?.message || 'This link has expired. Please request a new one.');
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-hero">
          <span className="hero-globe">🌍</span>
          <h1>Fajikunda Society</h1>
          <p>Choose a strong new password to secure your account.</p>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ fontFamily: 'var(--font-h)', color: 'var(--earth)', marginBottom: '.75rem' }}>Password reset!</h2>
              <p style={{ color: 'var(--text2)', marginBottom: '1.5rem' }}>
                Your password has been updated. Redirecting you to sign in…
              </p>
              <Link to="/login" className="btn-primary" style={{ display: 'inline-flex' }}>Sign In Now</Link>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily: 'var(--font-h)', fontSize: '1.8rem', marginBottom: '.5rem', color: 'var(--earth)' }}>
                Set new password
              </h2>
              <p style={{ color: 'var(--text2)', marginBottom: '1.5rem', fontSize: '.9rem' }}>
                Choose a strong password for your Fajikunda account.
              </p>
              <form onSubmit={submit}>
                <div className="field">
                  <label>New Password</label>
                  <input type="password" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="At least 8 characters" required autoFocus />
                </div>
                <div className="field">
                  <label>Confirm New Password</label>
                  <input type="password" value={form.confirm}
                    onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                    placeholder="Repeat your password" required />
                </div>
                <p className="form-hint">
                  Must be 8+ characters with uppercase, number, and special character (!@#$%…)
                </p>
                {status && status !== 'submitting' && (
                  <p className="form-error">{status}</p>
                )}
                <button type="submit" className="btn-primary" style={{ width: '100%' }}
                  disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Updating…' : 'Reset Password'}
                </button>
              </form>
              <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '.88rem', color: 'var(--text3)' }}>
                <Link to="/login">← Back to Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
