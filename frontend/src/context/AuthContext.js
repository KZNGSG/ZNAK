import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  // Проверка токена при загрузке
  const checkAuth = useCallback(async () => {
    const savedToken = localStorage.getItem('auth_token');
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
        setUser(userData);
        setToken(savedToken);
      } else {
        // Токен невалидный - очищаем
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Регистрация
  const register = async (email, password) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Ошибка регистрации');
    }

    localStorage.setItem('auth_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  // Вход
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

    localStorage.setItem('auth_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  // Выход
  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  // Повторная отправка письма подтверждения
  const resendVerification = async () => {
    if (!token) {
      throw new Error('Требуется авторизация');
    }

    const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Ошибка отправки письма');
    }

    return data;
  };

  // Обновить статус верификации email
  const setEmailVerified = (verified) => {
    if (user) {
      setUser({ ...user, email_verified: verified });
    }
  };

  // Fetch с авторизацией
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
    emailVerified: user?.email_verified || false,
    register,
    login,
    logout,
    resendVerification,
    setEmailVerified,
    authFetch
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
