import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';

function LogoMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
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

function XIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const id = searchParams.get('id');
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || !token) {
      setError('Invalid or missing verification token.');
      setLoading(false);
      return;
    }

    const verifyEmail = async () => {
      try {
        await api.post('/api/auth/verify-email', { id, token });
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to verify email');
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [id, token, navigate]);

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
        <div className="auth-mini-card animate-in" style={{ textAlign: 'center' }}>
          {loading ? (
            <>
              <div className="spinner" style={{ margin: '0 auto 18px' }}></div>
              <h2>Verifying your email</h2>
              <p>Hang tight while we confirm your email address - this only takes a second.</p>
            </>
          ) : success ? (
            <>
              <div className="auth-mini-icon success" style={{ margin: '0 auto 20px' }}>
                <CheckIcon />
              </div>
              <h2>Email verified</h2>
              <p>
                Your email address is confirmed. We&apos;re redirecting you to sign in...
              </p>
              <Link to="/login" className="btn btn-primary auth-submit" style={{ display: 'block', textAlign: 'center' }}>
                Continue to login
              </Link>
            </>
          ) : (
            <>
              <div className="auth-mini-icon danger" style={{ margin: '0 auto 20px' }}>
                <XIcon />
              </div>
              <h2>Verification failed</h2>
              <p>
                {error} The link might be expired or invalid - please try signing up again or
                contact support.
              </p>
              <Link to="/signup" className="btn btn-primary auth-submit" style={{ display: 'block', textAlign: 'center' }}>
                Go to signup
              </Link>
              <div className="auth-bottom-link">
                Already have an account? <Link to="/login">Sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
