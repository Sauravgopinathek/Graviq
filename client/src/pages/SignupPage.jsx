import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signup, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await signup(email, password);
      if (res?.requiresOtp) {
        navigate('/verify-otp');
        return;
      }

      setMessage(res.message || 'Account created. Check your email to verify your account.');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async (credential) => {
    setError('');
    setMessage('');
    setGoogleLoading(true);

    try {
      await googleLogin(credential);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card card card-glass animate-in">
        <h1>Get Started</h1>
        <p>Create your Graviq account</p>

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

        <GoogleSignInButton
          label="Sign up with Google"
          onCredential={handleGoogleSignup}
          onError={setError}
        />
        {googleLoading ? <div className="auth-google-status">Creating your account with Google...</div> : null}

        <div className="auth-divider">
          <span>or use email</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              id="signup-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="signup-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              id="signup-confirm"
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="********"
              required
              minLength={6}
            />
          </div>
          <button id="signup-submit" type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
