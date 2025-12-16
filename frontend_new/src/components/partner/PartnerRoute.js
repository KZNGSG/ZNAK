import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePartnerAuth } from '../../context/PartnerAuthContext';

const PartnerRoute = ({ children }) => {
  const { isAuthenticated, isPartner, loading } = usePartnerAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-amber-200 border-t-amber-500"></div>
          <p className="text-amber-700 text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isPartner) {
    return <Navigate to="/partner/login" replace />;
  }

  return children;
};

export default PartnerRoute;
