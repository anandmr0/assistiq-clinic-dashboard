
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const AUTH_KEY = 'assistiq_auth';   // localStorage key

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = (data) => {
    // data = LoginResponse: { token, role, clinicId, doctorId, displayName, clinicName }
    const session = {
      token:       data.token,
      role:        data.role,           // "DOCTOR" | "RECEPTIONIST"
      clinicId:    data.clinicId,
      doctorId:    data.doctorId,       // null for receptionists
      displayName: data.displayName,
      clinicName:  data.clinicName,
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    setAuth(session);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuth(null);
  };

  const isDoctor       = auth?.role === 'DOCTOR';
  const isReceptionist = auth?.role === 'RECEPTIONIST';

  return (
    <AuthContext.Provider value={{ auth, login, logout, isDoctor, isReceptionist }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};


