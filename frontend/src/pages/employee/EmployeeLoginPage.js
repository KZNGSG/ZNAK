import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Редирект на единую страницу входа
// Все пользователи (клиенты и сотрудники) входят через /login
const EmployeeLoginPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Перенаправляем на главную страницу входа
    navigate('/login', { replace: true });
  }, [navigate]);

  return null;
};

export default EmployeeLoginPage;
