import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps a route so only authenticated users (optionally of a specific role)
 * can access it.
 *
 * Usage:
 *   <ProtectedRoute>            — any logged-in user
 *   <ProtectedRoute role="DOCTOR">  — doctors only
 */
const ProtectedRoute = ({ children, role }) => {
  const { auth } = useAuth();

  if (!auth) return <Navigate to="/login" replace />;
  if (role && auth.role !== role) return <Navigate to="/unauthorized" replace />;

  return children;
};

export default ProtectedRoute;