import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminAuthContext = createContext(null);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const savedToken = localStorage.getItem('admin_token');
    if (!savedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        if (userData.role === 'admin' || userData.role === 'superadmin') {
          setUser(userData);
          setToken(savedToken);
        } else {
          localStorage.removeItem('admin_token');
          setToken(null);
          setUser(null);
        }
      } else {
        localStorage.removeItem('admin_token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Admin auth check failed:', error);
      localStorage.removeItem('admin_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Ошибка входа');
    }

    if (data.user.role !== 'admin' && data.user.role !== 'superadmin') {
      throw new Error('Доступ запрещён. Требуются права администратора.');
    }

    localStorage.setItem('admin_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    setUser(null);
  };

  const authFetch = async (url, options = {}) => {
    const headers = {
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, { ...options, headers });
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    isSuperAdmin: user?.role === 'superadmin',
    login,
    logout,
    authFetch
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export default AdminAuthContext;
