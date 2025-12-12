import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PartnerAuthContext = createContext(null);

export const usePartnerAuth = () => {
  const context = useContext(PartnerAuthContext);
  if (!context) {
    throw new Error('usePartnerAuth must be used within a PartnerAuthProvider');
  }
  return context;
};

export const PartnerAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [partner, setPartner] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('partner_token'));
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const savedToken = localStorage.getItem('partner_token');
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
        // Проверяем роль: partner
        if (userData.role === 'partner') {
          setUser(userData);
          setToken(savedToken);

          // Получаем данные партнёра
          const partnerResponse = await fetch(`${API_URL}/api/partner/me`, {
            headers: {
              'Authorization': `Bearer ${savedToken}`
            }
          });

          if (partnerResponse.ok) {
            const partnerData = await partnerResponse.json();
            setPartner(partnerData.partner);
          }
        } else {
          localStorage.removeItem('partner_token');
          setToken(null);
          setUser(null);
          setPartner(null);
        }
      } else {
        localStorage.removeItem('partner_token');
        setToken(null);
        setUser(null);
        setPartner(null);
      }
    } catch (error) {
      console.error('Partner auth check failed:', error);
      localStorage.removeItem('partner_token');
      setToken(null);
      setUser(null);
      setPartner(null);
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

    // Проверяем роль
    if (data.user.role !== 'partner') {
      throw new Error('Доступ запрещён. Требуются права партнёра.');
    }

    localStorage.setItem('partner_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);

    // Получаем данные партнёра
    const partnerResponse = await fetch(`${API_URL}/api/partner/me`, {
      headers: {
        'Authorization': `Bearer ${data.access_token}`
      }
    });

    if (partnerResponse.ok) {
      const partnerData = await partnerResponse.json();
      setPartner(partnerData.partner);
    }

    return data;
  };

  const logout = () => {
    localStorage.removeItem('partner_token');
    setToken(null);
    setUser(null);
    setPartner(null);
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
    partner,
    token,
    loading,
    isAuthenticated: !!user,
    isPartner: user?.role === 'partner',
    login,
    logout,
    authFetch,
    refreshPartner: checkAuth
  };

  return (
    <PartnerAuthContext.Provider value={value}>
      {children}
    </PartnerAuthContext.Provider>
  );
};

export default PartnerAuthContext;
