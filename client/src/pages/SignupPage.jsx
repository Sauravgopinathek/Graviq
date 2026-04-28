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

/* Password strength helper */
function getStrength(pw) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['#ff5252', '#ff9e52', '#ffb74d', '#7ed957', '#00e676'];

function StrengthMeter({ value }) {
  if (!value) return null;
  const score = getStrength(value);
  return (
    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, display: 'flex', gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 999,
              background: i < score ? STRENGTH_COLORS[score] : 'rgba(255,255,255,0.08)',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 56, textAlign: 'right' }}>
        {STRENGTH_LABELS[score]}
      </span>
    </div>
  );
}

const BENEFITS = [
  {
    title: 'AI-powered conversations',
    desc: 'LLaMA 3.1 70B pre-trained on lead-gen patterns adapts to every visitor in real time.',
  },
  {
    title: 'Embed in one line',
    desc: 'Drop a single script tag onto any site - widget loads in under 100ms with zero config.',
  },
  {
    title: 'Gamified lead capture',
    desc: 'Quizzes, sliders, and reveal cards lift form-fill rates by an average of 3.4x.',
  },
  {
    title: 'Real-time analytics & replay',
    desc: 'See every conversation, drop-off point, and qualified lead the moment it lands.',
  },
];

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      setError(
        err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Signup failed',
      );
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
              <span className="auth-pill">Free 14-day trial</span>
              <h1>Create your Graviq account</h1>
              <p className="auth-lede">
                Build your first AI lead-capture bot in minutes. No credit card required.
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

              <GoogleSignInButton
                label="Sign up with Google"
                onCredential={handleGoogleSignup}
                onError={setError}
              />
              {googleLoading ? (
                <div className="auth-google-status-inline">Creating your account with Google...</div>
              ) : null}

              <div className="auth-divider-clean">
                <span>or use email</span>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="signup-email">Work email</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><MailIcon /></span>
                    <input
                      id="signup-email"
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
                  <label className="form-label" htmlFor="signup-password">Password</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><LockIcon /></span>
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
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
                  <StrengthMeter value={password} />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="signup-confirm">Confirm password</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><LockIcon /></span>
                    <input
                      id="signup-confirm"
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  id="signup-submit"
                  type="submit"
                  className="btn btn-primary auth-submit"
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : 'Create free account'}
                </button>

                <p className="auth-tos">
                  By creating an account you agree to our{' '}
                  <a href="#terms">Terms of Service</a> and{' '}
                  <a href="#privacy">Privacy Policy</a>.
                </p>
              </form>

              <div className="auth-bottom-link">
                Already have an account? <Link to="/login">Sign in</Link>
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
            <span className="lp-eyebrow">What you get</span>
            <h2>Everything you need to turn traffic into qualified pipeline.</h2>
            <p>
              From the first hello to the closed deal - Graviq handles the conversation, the data
              capture, and the routing to your CRM.
            </p>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
              {BENEFITS.map((b) => (
                <li key={b.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: 'rgba(0, 230, 118, 0.12)',
                      border: '1px solid rgba(0, 230, 118, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--success)',
                      flexShrink: 0,
                    }}
                  >
                    <CheckIcon />
                  </span>
                  <div>
                    <h4 style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 3, color: 'var(--text-primary)' }}>
                      {b.title}
                    </h4>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                      {b.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              background: 'rgba(10, 10, 26, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: 14,
              padding: 18,
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <div>
              <p style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-primary)', margin: 0, marginBottom: 8 }}>
                &ldquo;Graviq replaced our static contact form. Within two weeks our qualified
                lead volume tripled and our SDRs finally have context before the first call.&rdquo;
              </p>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Priya Menon</strong> &middot; Head of Growth, Northstack
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
