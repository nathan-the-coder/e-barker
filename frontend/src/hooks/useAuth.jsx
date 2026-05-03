import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await authAPI.getCurrentUser();
      if (data.user) {
        setUser(data.user);
      } else {
        sessionStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      sessionStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (userData, token) => {
    sessionStorage.setItem('auth_token', token);
    setUser(userData);
    
    // Redirect based on role
    if (userData.role === 'admin') {
      navigate('/admin');
    } else if (userData.role === 'dispatcher') {
      navigate('/dashboard');
    } else {
      navigate('/driver');
    }
  }, [navigate]);

  const logout = useCallback(() => {
    sessionStorage.removeItem('auth_token');
    setUser(null);
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
