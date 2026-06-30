import { Navigate } from 'react-router-dom';

export const getRoleBasedHome = (role) => {
  switch(role) {
    case 'admin':
      return '/';
    case 'staff':
      return '/operations';
    case 'driver':
      return '/driver';
    case 'client':
      return '/clients';
    default:
      return '/login';
  }
};

export const RoleBasedHomeRedirect = ({ role }) => {
  const path = getRoleBasedHome(role);
  return <Navigate to={path} replace />;
};