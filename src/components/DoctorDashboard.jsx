import React, { useState, useEffect } from 'react';
import '../css/DoctorDashboard.css';
import DashboardStats from './DashboardStats';
import PatientList from './PatientList';
import ChangePasswordModal from './ChangePasswordModal';
import { fetchTodayDashboardData, fetchAllAppointments } from '../services/dashboardApi.js';
import { useAuth } from '../context/AuthContext';
import QuickSendPanel from './QuickSendPanel';

const DoctorDashboard = ({ doctorId, clinicId }) => {
  const { logout }                                    = useAuth();
  const [dashboardData, setDashboardData]             = useState(null);
  const [loading, setLoading]                         = useState(true);
  const [currentTime, setCurrentTime]                 = useState(new Date());
  const [showLogout, setShowLogout]                   = useState(false);
  const [showChangePassword, setShowChangePassword]   = useState(false);
const [showQuickSend, setShowQuickSend] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (doctorId && clinicId) loadDashboard(doctorId, clinicId);
  }, [doctorId, clinicId]);

  // ── Only fetches today's active + completed — fast ──
  const loadDashboard = async (doctorId, clinicId) => {
    if (!doctorId || !clinicId) return;
    try {
      setLoading(true);
      const data = await fetchTodayDashboardData(doctorId, clinicId);
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePatientStatus = (appointmentId, newStatus) => {
    setDashboardData(prev => ({
      ...prev,
      todayPatients: prev.todayPatients.map(p =>
        p.appointmentId === appointmentId ? { ...p, status: newStatus } : p
      ),
      activeAppointments: prev.activeAppointments.map(p =>
        p.appointmentId === appointmentId ? { ...p, status: newStatus } : p
      ),
    }));
  };

  const handlePatientSelect = (patient) => {
    console.log('Selected patient:', patient);
  };

  const todayTotal    = dashboardData?.todayPatients?.length          || 0;
  const completed     = dashboardData?.completedAppointments?.length  || 0;
  const completionPct = todayTotal > 0 ? Math.round((completed / todayTotal) * 100) : 0;

  const hour     = currentTime.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr  = currentTime.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
  const timeStr  = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="doctor-dashboard">

      {/* ── HEADER ── */}
      <header className="dashboard-header">
        <div className="header-content">

          {/* Left: doctor identity */}
          <div className="doctor-info">
            <div className="doctor-avatar">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
                <path d="M12 14C6.48 14 2 16.24 2 19V22H22V19C22 16.24 17.52 14 12 14Z" fill="currentColor"/>
              </svg>
            </div>
            <div className="doctor-text">
              <p className="doctor-greeting">{greeting} 👋</p>
              <h1>{dashboardData?.doctor?.name || 'Doctor'}</h1>
              <p className="specialization">{dashboardData?.doctor?.specialization || ''}</p>
              <p className="clinic-name">{dashboardData?.doctor?.clinicName || ''}</p>
            </div>
          </div>

          {/* Right: date/time + live badge + actions */}
          <div className="header-right">
            <div className="header-date-badge">
              <svg viewBox="0 0 24 24" fill="none" width="14" height="14" style={{ flexShrink: 0 }}>
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {dateStr}&nbsp;&nbsp;·&nbsp;&nbsp;{timeStr}
            </div>
            <div className="header-live-badge">
              <span className="live-pulse-dot" />
              LIVE
            </div>

            <button
              className="header-logout-btn"
              onClick={() => setShowChangePassword(true)}
              title="Change password"
              style={{ opacity: 0.85 }}
            >
              <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M7 11V7C7 4.24 9.24 2 12 2C14.76 2 17 4.24 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
              </svg>
              Password
            </button>

            <button className="header-logout-btn" onClick={() => setShowLogout(true)} title="Sign out">
              <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                <path d="M9 21H5C4.47 21 3.96 20.79 3.59 20.41C3.21 20.04 3 19.53 3 19V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M16 17L21 12L16 7M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sign Out
            </button>
            <button className="header-logout-btn" onClick={() => setShowQuickSend(true)}>
        ⚡ Quick Send
        </button>
          </div>

        </div>

        {todayTotal > 0 && (
          <div className="header-progress-track">
            <div
              className="header-progress-fill"
              style={{ width: `${completionPct}%` }}
              title={`${completed} of ${todayTotal} patients completed`}
            />
          </div>
        )}
      </header>

      {/* ── MAIN ── */}
      <main className="dashboard-main">
        {dashboardData && (
          <>
            <DashboardStats data={dashboardData} />
            <PatientList
              todayPatients={dashboardData?.todayPatients              || []}
              activePatients={dashboardData?.activeAppointments        || []}
              completedPatients={dashboardData?.completedAppointments  || []}
              onPatientSelect={handlePatientSelect}
              onRefreshAppointments={() => loadDashboard(doctorId, clinicId)}
              updatePatientStatus={updatePatientStatus}
              doctorId={doctorId}
              clinicId={clinicId}
              doctorsInfo={dashboardData?.doctor}
              // ✅ Pass paginated All-tab fetcher down
              fetchAllAppointments={(page, search) =>
                fetchAllAppointments(doctorId, clinicId, page, search)
              }
            />
          </>
        )}
      </main>

      {/* ── Logout modal ── */}
      {showLogout && (
        <div className="logout-overlay" onClick={() => setShowLogout(false)}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <h3>Sign out?</h3>
            <p>You will be returned to the login page.</p>
            <div className="logout-modal-actions">
              <button className="logout-cancel" onClick={() => setShowLogout(false)}>Cancel</button>
              <button className="logout-confirm" onClick={logout}>Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password modal ── */}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    {showQuickSend && (
      <QuickSendPanel
        todayPatients={dashboardData?.todayPatients || []}
        clinicId={clinicId}
        doctorId={doctorId}
        onClose={() => setShowQuickSend(false)}
      />
    )}
    </div>
  );
};

export default DoctorDashboard;