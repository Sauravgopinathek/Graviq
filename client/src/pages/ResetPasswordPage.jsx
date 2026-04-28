import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';

function LogoMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function LockIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
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

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const id = searchParams.get('id');
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const tokenInvalid = !id || !token;

  useEffect(() => {
    if (tokenInvalid) {
      setError('Invalid or missing password reset token.');
    }
  }, [tokenInvalid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/api/auth/reset-password', { id, token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
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
      </div>

      <div className="auth-mini-wrap">
        <div className="auth-mini-card animate-in">
          {success ? (
            <>
              <div className="auth-mini-icon success">
                <CheckIcon />
              </div>
              <h2>Password updated</h2>
              <p>
                Your password has been reset successfully. We&apos;re redirecting you to the login
                page in a few seconds.
              </p>
              <Link to="/login" className="btn btn-primary auth-submit" style={{ display: 'block', textAlign: 'center' }}>
                Continue to login
              </Link>
            </>
          ) : (
            <>
              <div className="auth-mini-icon">
                <ShieldIcon />
              </div>
              <h2>Create a new password</h2>
              <p>
                Choose a strong password with at least 6 characters. You&apos;ll use this to sign
                in from now on.
              </p>

              {error && (
                <div className="auth-error-banner" role="alert">
                  <AlertIcon />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="reset-password">New password</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><LockIcon /></span>
                    <input
                      id="reset-password"
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      minLength={6}
                      required
                      disabled={tokenInvalid}
                    />
                    <button
                      type="button"
                      className="auth-pw-toggle"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary auth-submit"
                  disabled={loading || tokenInvalid}
                >
                  {loading ? 'Resetting...' : 'Reset password'}
                </button>
              </form>

              <div className="auth-bottom-link">
                <Link to="/login">Cancel and return to login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
