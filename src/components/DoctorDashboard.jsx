import React, { useState, useEffect } from 'react';
import '../css/DoctorDashboard.css';
import DashboardStats from './DashboardStats';
import PatientList from './PatientList';
import { fetchDashboardData } from '../services/dashboardApi.js';

const DoctorDashboard = ({ doctorId, clinicId }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [currentTime, setCurrentTime]     = useState(new Date());

  // Live clock — ticks every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (doctorId && clinicId) loadDashboard(doctorId, clinicId);
  }, [doctorId, clinicId]);

  const loadDashboard = async (doctorId, clinicId) => {
    if (!doctorId || !clinicId) return;
    try {
      setLoading(true);
      const data = await fetchDashboardData(doctorId, clinicId);
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
      )
    }));
  };

  const handlePatientSelect = (patient) => {
    console.log('Selected patient:', patient);
  };

  // ── Header derived values ───────────────────────────────────────────────────
  const todayTotal    = dashboardData?.todayPatients?.length         || 0;
  const completed     = dashboardData?.completedAppointments?.length || 0;
  const completionPct = todayTotal > 0 ? Math.round((completed / todayTotal) * 100) : 0;

  const hour      = currentTime.getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr   = currentTime.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
  const timeStr   = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });

  // ── Loading ─────────────────────────────────────────────────────────────────
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

          {/* Right: date/time + live badge */}
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
          </div>

        </div>

        {/* Progress bar — visible once at least one appointment exists today */}
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
              patients={dashboardData?.allAppointments             || []}
              todayPatients={dashboardData?.todayPatients          || []}
              activePatients={dashboardData?.activeAppointments    || []}
              completedPatients={dashboardData?.completedAppointments || []}
              onPatientSelect={handlePatientSelect}
              onRefreshAppointments={() => loadDashboard(doctorId, clinicId)}
              updatePatientStatus={updatePatientStatus}
              doctorId={doctorId}
              clinicId={clinicId}
              doctorsInfo={dashboardData?.doctor}
            />
          </>
        )}
      </main>

    </div>
  );
};

export default DoctorDashboard;