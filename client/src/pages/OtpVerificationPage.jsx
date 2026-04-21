import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function formatExpiry(expiresAt) {
  if (!expiresAt) {
    return null;
  }

  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
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
      <div className="auth-container">
        <div className="auth-card card card-glass animate-in">
          <h1>Verification Required</h1>
          <p>Start from sign up or login so we can send a fresh verification code.</p>
          <Link to="/login" className="btn btn-primary">
            Go to Login
          </Link>
          <div className="auth-link">
            Need an account? <Link to="/signup">Create one</Link>
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
    <div className="auth-container">
      <div className="auth-card card card-glass animate-in">
        <h1>{isSignupFlow ? 'Verify Your Account' : 'Verify Sign-In'}</h1>
        <p>
          Enter the 6-digit code sent to <strong>{pendingAuth.email}</strong>
          {expiryLabel ? ` before ${expiryLabel}` : ''}.
        </p>

        {error && <div className="auth-error">{error}</div>}
        {message && (
          <div
            className="card"
            style={{
              marginBottom: 16,
              padding: 14,
              background: 'rgba(0, 230, 118, 0.08)',
              borderColor: 'rgba(0, 230, 118, 0.25)',
              color: 'var(--text-primary)',
            }}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Verification Code</label>
            <input
              id="otp-code"
              type="text"
              className="form-input"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              required
              maxLength={6}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting || otp.length !== 6}>
            {submitting ? 'Verifying...' : isSignupFlow ? 'Activate Account' : 'Complete Sign In'}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleResend}
          disabled={resending}
          style={{ marginTop: 12 }}
        >
          {resending ? 'Sending New Code...' : 'Resend Code'}
        </button>

        <div className="auth-link">
          Wrong email or need to restart?{' '}
          <button
            type="button"
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-light)',
              cursor: 'pointer',
              font: 'inherit',
              padding: 0,
            }}
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
