import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  
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
        const res = await api.post('/api/auth/verify-email', { id, token });
        if (res.data.token && res.data.user) {
          // Auto login after verification
          setAuth({ token: res.data.token, user: res.data.user });
        }
        setSuccess(true);
        setTimeout(() => navigate('/dashboard'), 3000);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to verify email');
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [id, token, navigate, setAuth]);

  return (
    <div className="auth-container animate-in">
      <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        {loading ? (
          <>
            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
            <h2>Verifying email...</h2>
            <p style={{ color: 'var(--text-muted)' }}>Please wait while we confirm your email address.</p>
          </>
        ) : success ? (
          <>
            <div className="empty-state-icon" style={{ marginBottom: 16 }}>✅</div>
            <h2 style={{ marginBottom: 12 }}>Email Verified!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
              Your account is now fully active. Redirecting to your dashboard...
            </p>
            <Link to="/dashboard" className="btn btn-primary" style={{ display: 'block' }}>
              Go to Dashboard Now
            </Link>
          </>
        ) : (
          <>
            <div className="empty-state-icon" style={{ marginBottom: 16 }}>❌</div>
            <h2 style={{ marginBottom: 12 }}>Verification Failed</h2>
            <div className="auth-error" style={{ marginBottom: 24 }}>{error}</div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
              The link might be expired or invalid. Please try signing up again or contact support.
            </p>
            <Link to="/signup" className="btn btn-primary" style={{ display: 'block' }}>
              Go to Signup
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
