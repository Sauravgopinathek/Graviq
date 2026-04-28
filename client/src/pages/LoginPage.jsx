import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useAuth } from '../context/AuthContext';

function LogoMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
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

function BotAvatarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="3" />
      <path d="M12 7V3" />
      <circle cx="12" cy="3" r="1" />
      <path d="M8 13h.01M16 13h.01" />
      <path d="M9 17h6" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result?.requiresOtp) {
        navigate('/verify-otp');
        return;
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (credential) => {
    setError('');
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
    <div className="auth-shell">
      <div className="lp-orb lp-orb-1" aria-hidden="true" />
      <div className="lp-orb lp-orb-2" aria-hidden="true" />

      <div className="auth-grid">
        {/* === Form side === */}
        <div className="auth-form-side">
          <div className="auth-topbar">
            <Link to="/" className="auth-logo">
              <span className="auth-logo-mark">
                <LogoMark />
              </span>
              <span className="auth-logo-text">Graviq</span>
            </Link>
            <Link to="/" className="auth-topbar-link">
              <ArrowLeftIcon />
              Back home
            </Link>
          </div>

          <div className="auth-form-wrap">
            <div className="auth-form-inner animate-in">
              <span className="auth-pill">Welcome back</span>
              <h1>Sign in to your dashboard</h1>
              <p className="auth-lede">
                Manage bots, track conversion funnels, and dive into qualified lead conversations.
              </p>

              {error && (
                <div className="auth-error-banner" role="alert">
                  <AlertIcon />
                  <span>{error}</span>
                </div>
              )}

              <GoogleSignInButton
                label="Continue with Google"
                onCredential={handleGoogleLogin}
                onError={setError}
              />
              {googleLoading ? (
                <div className="auth-google-status-inline">Signing in with Google...</div>
              ) : null}

              <div className="auth-divider-clean">
                <span>or use email</span>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="login-email">Email</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><MailIcon /></span>
                    <input
                      id="login-email"
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

                <div className="form-group">
                  <div className="auth-form-row">
                    <label className="form-label" htmlFor="login-password">Password</label>
                    <Link to="/forgot-password" className="auth-forgot-link">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><LockIcon /></span>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      minLength={6}
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
                  id="login-submit"
                  type="submit"
                  className="btn btn-primary auth-submit"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <div className="auth-bottom-link">
                Don&apos;t have an account? <Link to="/signup">Create one for free</Link>
              </div>
            </div>
          </div>

          <div className="auth-form-footer">
            &copy; {new Date().getFullYear()} Graviq. All rights reserved.
          </div>
        </div>

        {/* === Showcase side === */}
        <aside className="auth-showcase-side" aria-hidden="true">
          <div className="auth-showcase-glow" />

          <div className="auth-showcase-content">
            <span className="lp-eyebrow">Live preview</span>
            <h2>Conversations that turn visitors into qualified leads.</h2>
            <p>
              Your AI bot greets every visitor, asks the right questions, and drops scored leads
              straight into your dashboard while you sleep.
            </p>

            <div className="auth-chat-preview">
              <div className="lp-chat-header">
                <div className="lp-chat-avatar">
                  <BotAvatarIcon />
                </div>
                <div className="lp-chat-header-text">
                  <h4>Graviq Assistant</h4>
                  <span className="lp-chat-status">
                    <span className="lp-chat-dot" />
                    Online now
                  </span>
                </div>
              </div>
              <div className="lp-chat-body">
                <div className="lp-bubble bot" style={{ animationDelay: '0.1s' }}>
                  Hey! I&apos;m here to help you find the right plan. What brings you in today?
                </div>
                <div className="lp-bubble user" style={{ animationDelay: '0.3s' }}>
                  Looking for a CRM for my sales team
                </div>
                <div className="lp-quiz-card" style={{ animationDelay: '0.5s' }}>
                  <div className="lp-quiz-card-header">
                    <span>Quick question - 2 of 3</span>
                  </div>
                  <div className="lp-quiz-progress">
                    <div className="lp-quiz-progress-bar" />
                  </div>
                  <div style={{ fontSize: 12.5, marginBottom: 10, color: 'var(--text-primary)' }}>
                    How big is your team?
                  </div>
                  <div className="lp-quiz-options">
                    <div className="lp-quiz-option">1-10 reps</div>
                    <div className="lp-quiz-option">11-50 reps</div>
                    <div className="lp-quiz-option">50+ reps</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-showcase-stats">
            <div className="auth-showcase-stat">
              <div className="auth-showcase-stat-value">3.4x</div>
              <div className="auth-showcase-stat-label">Higher fill rate</div>
            </div>
            <div className="auth-showcase-stat">
              <div className="auth-showcase-stat-value">47s</div>
              <div className="auth-showcase-stat-label">To first lead</div>
            </div>
            <div className="auth-showcase-stat">
              <div className="auth-showcase-stat-value">92%</div>
              <div className="auth-showcase-stat-label">Lead quality</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
