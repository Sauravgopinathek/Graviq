import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LogoMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function ShieldKeyIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <circle cx="12" cy="11" r="2" />
      <path d="M12 13v3" />
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

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
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

function formatExpiry(expiresAt) {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function OtpVerificationPage() {
  const navigate = useNavigate();
  const { user, pendingAuth, verifyOtp, resendOtp, clearPendingAuth } = useAuth();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const expiryLabel = formatExpiry(pendingAuth?.expiresAt);
  const isSignupFlow = pendingAuth?.purpose === 'signup';

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!pendingAuth?.challengeId) {
    return (
      <div className="auth-shell">
        <div className="lp-orb lp-orb-1" aria-hidden="true" />
        <div className="lp-orb lp-orb-2" aria-hidden="true" />

        <div className="auth-mini-topbar">
          <Link to="/" className="auth-logo">
            <span className="auth-logo-mark"><LogoMark /></span>
            <span className="auth-logo-text">Graviq</span>
          </Link>
        </div>

        <div className="auth-mini-wrap">
          <div className="auth-mini-card animate-in">
            <div className="auth-mini-icon">
              <ShieldKeyIcon />
            </div>
            <h2>Verification required</h2>
            <p>Start from sign up or login so we can send a fresh verification code to your inbox.</p>
            <Link to="/login" className="btn btn-primary auth-submit" style={{ display: 'block', textAlign: 'center' }}>
              Go to login
            </Link>
            <div className="auth-bottom-link">
              Need an account? <Link to="/signup">Create one</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      await verifyOtp(pendingAuth.challengeId, otp);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    setResending(true);

    try {
      const res = await resendOtp(pendingAuth.challengeId);
      setMessage(res.message || 'A new verification code has been sent.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  const handleCancel = () => {
    clearPendingAuth();
    navigate(isSignupFlow ? '/signup' : '/login');
  };

  return (
    <div className="auth-shell">
      <div className="lp-orb lp-orb-1" aria-hidden="true" />
      <div className="lp-orb lp-orb-2" aria-hidden="true" />

      <div className="auth-mini-topbar">
        <Link to="/" className="auth-logo">
          <span className="auth-logo-mark"><LogoMark /></span>
          <span className="auth-logo-text">Graviq</span>
        </Link>
        <button
          type="button"
          onClick={handleCancel}
          className="auth-topbar-link"
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
        >
          <ArrowLeftIcon />
          Use a different email
        </button>
      </div>

      <div className="auth-mini-wrap">
        <div className="auth-mini-card animate-in">
          <div className="auth-mini-icon">
            <ShieldKeyIcon />
          </div>
          <h2>{isSignupFlow ? 'Verify your account' : 'Verify your sign-in'}</h2>
          <p>
            We sent a 6-digit code to{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{pendingAuth.email}</strong>
            {expiryLabel ? ` - it expires at ${expiryLabel}.` : '.'}
          </p>

          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertIcon />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="auth-success-banner" role="status">
              <CheckIcon />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="otp-code">Verification code</label>
              <div className="auth-input-wrap">
                <input
                  id="otp-code"
                  type="text"
                  className="auth-input auth-otp-input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="------"
                  required
                  maxLength={6}
                />
              </div>
            </div>

            <div className="auth-mini-actions">
              <button
                type="submit"
                className="btn btn-primary auth-submit"
                disabled={submitting || otp.length !== 6}
              >
                {submitting ? 'Verifying...' : isSignupFlow ? 'Activate account' : 'Complete sign in'}
              </button>

              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Didn&apos;t get the code?{' '}
                <button
                  type="button"
                  className="auth-text-button"
                  onClick={handleResend}
                  disabled={resending}
                >
                  {resending ? 'Sending...' : 'Resend code'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
