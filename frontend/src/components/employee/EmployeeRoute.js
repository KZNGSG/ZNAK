import React from 'react';
import { Navigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';

const EmployeeRoute = ({ children }) => {
  const { isAuthenticated, isEmployee, loading } = useEmployeeAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-700 border-t-blue-500"></div>
          <p className="text-slate-400 text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isEmployee) {
    return <Navigate to="/employee/login" replace />;
  }

  return children;
};

export default EmployeeRoute;
