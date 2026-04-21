import { useEffect, useRef, useState } from 'react';

const GOOGLE_SCRIPT_ID = 'google-identity-services';
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function loadGoogleScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
}

export default function GoogleSignInButton({ onCredential, onError, label = 'Continue with Google' }) {
  const buttonRef = useRef(null);
  const [loading, setLoading] = useState(Boolean(googleClientId));

  useEffect(() => {
    if (!googleClientId || !buttonRef.current) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: ({ credential }) => {
            if (!credential) {
              onError?.('Google sign-in did not return a credential.');
              return;
            }

            onCredential?.(credential);
          },
        });

        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: label === 'Sign up with Google' ? 'signup_with' : 'signin_with',
          width: 340,
          shape: 'pill',
        });

        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          onError?.('Failed to load Google sign-in.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [label, onCredential, onError]);

  if (!googleClientId) {
    return (
      <button type="button" className="btn btn-secondary auth-google-fallback" disabled>
        Google sign-in unavailable
      </button>
    );
  }

  return (
    <div className="auth-google-wrap">
      {loading ? <div className="auth-google-loading">Loading Google sign-in...</div> : null}
      <div ref={buttonRef} className="auth-google-button" />
    </div>
  );
}
