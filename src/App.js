import React, { useMemo } from "react";

import { BrowserRouter, Routes, Route, Navigate,useNavigate, useSearchParams} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage             from './components/LoginPage';        // works for both .js and .jsx
import DoctorDashboard       from './components/DoctorDashboard';
import ReceptionistDashboard from './components/ReceptionistDashboard';
import ProtectedRoute        from './components/ProtectedRoute';

// Smart root redirect based on role
const RootRedirect = () => {
  const { auth } = useAuth();
  const [searchParams] = useSearchParams(); // ← add this
  const token = searchParams.get('token');
  if (token) return <Navigate to={`/login?token=${token}`} replace />;
  if (!auth)                       return <Navigate to="/login" replace />;
  if (auth.role === 'DOCTOR')      return <Navigate to="/doctor"      replace />;
  if (auth.role === 'RECEPTIONIST')return <Navigate to="/receptionist" replace />;
  return <Navigate to="/login" replace />;
};
const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Doctor dashboard */}
        <Route path="/doctor" element={
          <ProtectedRoute role="DOCTOR">
            <DoctorWrapper />
          </ProtectedRoute>
        }/>

        {/* Receptionist dashboard */}
        <Route path="/receptionist" element={
          <ProtectedRoute role="RECEPTIONIST">
            <ReceptionistWrapper />
          </ProtectedRoute>
        }/>

        {/* Unauthorized */}
        <Route path="/unauthorized" element={
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
                        height:'100vh', flexDirection:'column', gap:12, fontFamily:'sans-serif' }}>
            <h2>Access Denied</h2>
            <p>You don't have permission to view this page.</p>
          </div>
        }/>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

// Thin wrappers pull IDs from auth context so dashboard components stay clean
const DoctorWrapper = () => {
  const { auth } = useAuth();
  return <DoctorDashboard doctorId={auth.doctorId} clinicId={auth.clinicId} />;
};

const ReceptionistWrapper = () => {
  const { auth } = useAuth();
  return <ReceptionistDashboard clinicId={auth.clinicId} />;
};

export default App;
