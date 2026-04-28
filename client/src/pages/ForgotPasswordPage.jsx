import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

function LogoMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function MailIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function MailOpenIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21 8-9 6-9-6" />
      <path d="M3 8a2 2 0 0 1 1.06-1.76l8-4.5a2 2 0 0 1 1.88 0l8 4.5A2 2 0 0 1 23 8v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/api/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="lp-orb lp-orb-1" aria-hidden="true" />
      <div className="lp-orb lp-orb-2" aria-hidden="true" />

      <div className="auth-mini-topbar">
        <Link to="/" className="auth-logo">
          <span className="auth-logo-mark">
            <LogoMark />
          </span>
          <span className="auth-logo-text">Graviq</span>
        </Link>
        <Link to="/login" className="auth-topbar-link">
          <ArrowLeftIcon />
          Back to login
        </Link>
      </div>

      <div className="auth-mini-wrap">
        <div className="auth-mini-card animate-in">
          {success ? (
            <>
              <div className="auth-mini-icon success">
                <MailOpenIcon />
              </div>
              <h2>Check your email</h2>
              <p>
                If an account exists for <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>,
                we&apos;ve sent instructions to reset your password. The link expires in 30 minutes.
              </p>
              <Link to="/login" className="btn btn-primary auth-submit" style={{ display: 'block', textAlign: 'center' }}>
                Back to login
              </Link>
              <button
                type="button"
                className="auth-text-button"
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                }}
                style={{ marginTop: 14, display: 'block', width: '100%', textAlign: 'center' }}
              >
                Use a different email
              </button>
            </>
          ) : (
            <>
              <div className="auth-mini-icon">
                <MailOpenIcon />
              </div>
              <h2>Reset your password</h2>
              <p>
                Enter the email associated with your account and we&apos;ll send you a secure link
                to set a new password.
              </p>

              {error && (
                <div className="auth-error-banner" role="alert">
                  <AlertIcon />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="forgot-email">Email address</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><MailIcon /></span>
                    <input
                      id="forgot-email"
                      type="email"
                      className="auth-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>

              <div className="auth-bottom-link">
                Remembered your password? <Link to="/login">Back to login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
