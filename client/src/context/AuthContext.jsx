import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);
const PENDING_AUTH_KEY = 'graviq_pending_auth';

function readPendingAuth() {
  const stored = sessionStorage.getItem(PENDING_AUTH_KEY);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored);
  } catch {
    sessionStorage.removeItem(PENDING_AUTH_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('graviq_token'));
  const [pendingAuth, setPendingAuthState] = useState(readPendingAuth);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/api/auth/me')
        .then((res) => {
          setUser(res.data.user);
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    if (res.data.requiresOtp) {
      setPendingAuth(res.data);
      return res.data;
    }

    const { token: newToken, user: userData } = res.data;
    setAuth({ token: newToken, user: userData });
    return res.data;
  };

  const signup = async (email, password) => {
    const res = await api.post('/api/auth/signup', { email, password });
    if (res.data.requiresOtp) {
      setPendingAuth(res.data);
    }
    return res.data;
  };

  const googleLogin = async (credential) => {
    const res = await api.post('/api/auth/google', { credential });
    const { token: newToken, user: userData } = res.data;
    setAuth({ token: newToken, user: userData });
    return userData;
  };

  const verifyOtp = async (challengeId, otp) => {
    const res = await api.post('/api/auth/verify-otp', { challengeId, otp });
    const { token: newToken, user: userData } = res.data;
    setAuth({ token: newToken, user: userData });
    clearPendingAuth();
    return userData;
  };

  const resendOtp = async (challengeId) => {
    const res = await api.post('/api/auth/resend-otp', { challengeId });
    setPendingAuth((current) => ({
      ...(current || {}),
      challengeId: res.data.challengeId || challengeId,
      expiresAt: res.data.expiresAt,
    }));
    return res.data;
  };

  const deleteAccount = async () => {
    const res = await api.delete('/api/auth/account');
    logout();
    return res.data;
  };

  const setPendingAuth = (dataOrUpdater) => {
    setPendingAuthState((current) => {
      const nextValue =
        typeof dataOrUpdater === 'function' ? dataOrUpdater(current) : dataOrUpdater;

      if (nextValue) {
        sessionStorage.setItem(PENDING_AUTH_KEY, JSON.stringify(nextValue));
      } else {
        sessionStorage.removeItem(PENDING_AUTH_KEY);
      }

      return nextValue;
    });
  };

  const clearPendingAuth = () => {
    setPendingAuth(null);
  };

  const setAuth = ({ token: newToken, user: userData }) => {
    if (newToken && userData) {
      sessionStorage.removeItem(PENDING_AUTH_KEY);
      setPendingAuthState(null);
    }

    if (newToken) {
      localStorage.setItem('graviq_token', newToken);
      setToken(newToken);
    } else {
      localStorage.removeItem('graviq_token');
      setToken(null);
    }

    if (userData) {
      localStorage.setItem('graviq_user', JSON.stringify(userData));
      setUser(userData);
    } else {
      localStorage.removeItem('graviq_user');
      setUser(null);
    }

    return userData;
  };

  const logout = () => {
    clearPendingAuth();
    setAuth({ token: null, user: null });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        pendingAuth,
        loading,
        login,
        signup,
        googleLogin,
        verifyOtp,
        resendOtp,
        deleteAccount,
        logout,
        setAuth,
        clearPendingAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
