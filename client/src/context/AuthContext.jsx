import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('graviq_token'));
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
    const { token: newToken, user: userData } = res.data;
    setAuth({ token: newToken, user: userData });
    return userData;
  };

  const signup = async (email, password) => {
    const res = await api.post('/api/auth/signup', { email, password });
    return res.data;
  };

  const setAuth = ({ token: newToken, user: userData }) => {
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
    setAuth({ token: null, user: null });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, setAuth }}>
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
