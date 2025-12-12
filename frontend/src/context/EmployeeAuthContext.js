import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeeAuthContext = createContext(null);

export const useEmployeeAuth = () => {
  const context = useContext(EmployeeAuthContext);
  if (!context) {
    throw new Error('useEmployeeAuth must be used within an EmployeeAuthProvider');
  }
  return context;
};

export const EmployeeAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('employee_token'));
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const savedToken = localStorage.getItem('employee_token');
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
        // Проверяем роль: employee или superadmin
        if (['employee', 'superadmin'].includes(userData.role)) {
          setUser(userData);
          setToken(savedToken);
        } else {
          localStorage.removeItem('employee_token');
          setToken(null);
          setUser(null);
        }
      } else {
        localStorage.removeItem('employee_token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Employee auth check failed:', error);
      localStorage.removeItem('employee_token');
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

    // Проверяем роль
    if (!['employee', 'superadmin'].includes(data.user.role)) {
      throw new Error('Доступ запрещён. Требуются права сотрудника.');
    }

    localStorage.setItem('employee_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('employee_token');
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

  const updateProfile = async (name, phone) => {
    const response = await authFetch(`${API_URL}/api/employee/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone })
    });

    if (response.ok) {
      const data = await response.json();
      setUser(prev => ({ ...prev, name: data.name }));
      return data;
    } else {
      const error = await response.json();
      throw new Error(error.detail || 'Ошибка сохранения');
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isEmployee: ['employee', 'superadmin'].includes(user?.role),
    isSuperAdmin: user?.role === 'superadmin',
    needsName: !!user && !user.name,
    login,
    logout,
    authFetch,
    updateProfile
  };

  return (
    <EmployeeAuthContext.Provider value={value}>
      {children}
    </EmployeeAuthContext.Provider>
  );
};

export default EmployeeAuthContext;
