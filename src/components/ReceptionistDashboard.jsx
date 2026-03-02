// ─────────────────────────────────────────────────────────────────────────────
// ReceptionistDashboard.jsx
// src/components/ReceptionistDashboard.jsx
//
// What a receptionist can do (mirrors real clinic software like Practo/Clinicx):
//   ✅ View today's appointment queue with token numbers
//   ✅ Mark patients as Arrived / Called / No-show
//   ✅ Add walk-in patients
//   ✅ Search patients by name / phone
//   ✅ See stats: total scheduled, arrived, waiting, no-show
//   ✅ Logout
//
// What a receptionist CANNOT do:
//   ❌ View prescription details or clinical notes
//   ❌ Complete consultations
//   ❌ Access the canvas/prescription pad
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/apiConfig';
import AddWalkInModal from './AddWalkInModal';
import '../css/ReceptionistDashboard.css';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  SCHEDULED:  { label: 'Scheduled',  color: '#6366f1', bg: '#eef2ff' },
  CONFIRMED:  { label: 'Confirmed',  color: '#0891b2', bg: '#e0f2fe' },
  ARRIVED:    { label: 'Arrived',    color: '#0f766e', bg: '#f0fdf4' },
  IN_CONSULT: { label: 'In Consult', color: '#f59e0b', bg: '#fffbeb' },
  COMPLETED:  { label: 'Completed',  color: '#10b981', bg: '#d1fae5' },
  NO_SHOW:    { label: 'No Show',    color: '#ef4444', bg: '#fee2e2' },
  CANCELLED:  { label: 'Cancelled',  color: '#94a3b8', bg: '#f1f5f9' },
};

const getStatusStyle = (status) =>
  STATUS_CONFIG[status?.toUpperCase()] || STATUS_CONFIG.SCHEDULED;

// ── Avatar initial color ──────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#0f766e,#0891b2)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#10b981,#0891b2)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#3b82f6,#6366f1)',
];
const avatarColor = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ─────────────────────────────────────────────────────────────────────────────
const ReceptionistDashboard = ({ clinicId }) => {
  const { auth, logout }             = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filter, setFilter]             = useState('ALL');   // ALL | WAITING | ARRIVED | COMPLETED
  const [currentTime, setCurrentTime]   = useState(new Date());
  const [showWalkIn, setShowWalkIn]     = useState(false);
  const [updatingId, setUpdatingId]     = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
 const [walkInInitData, setWalkInInitData] = useState(null);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
    const [loadingWalkIn, setLoadingWalkIn] = useState(false);
  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (clinicId) load();
  }, [clinicId]);
   const openWalkInModal = async () => {
      setLoadingWalkIn(true);
    setShowWalkIn(true); // open modal immediately with loader
  
    try {
     // const clinicId = 1; // later dynamic
      const data = await apiFetch(`/dashboard/walkin/init?clinicId=${clinicId}`);
      console.log(data);
     // const data = await res.json();
      console.log(data);
      setWalkInInitData(data);
    } catch (err) {
      console.log(err);
      alert("Failed to load doctors");
      setShowWalkIn(false);
    } finally {
         setLoadingWalkIn(false);
    }
  };
  const load = async () => {
    try {
      setLoading(true);
      // Receptionists see ALL doctors' appointments for their clinic (no doctorId filter)
      const data = await apiFetch(`/dashboard/appointments?clinicId=${clinicId}`);
      const todayStr = new Date().toISOString().split('T')[0];
      const today = (data || []).filter(a => {
        const d = a.appointmentDate;
        return d && new Date(d).toISOString().split('T')[0] === todayStr;
      });
      setAppointments(today.map(a => ({
        appointmentId: a.id,
        name:          a.patient?.name         || 'Unknown',
        phone:         a.patient?.phone        || a.patient?.phoneNumber || '',
        age:           a.patient?.age          || '',
        gender:        a.patient?.gender       || '',
        token:         a.tokenNumber           || '',
        status:        a.status                || 'SCHEDULED',
        reason:        a.notes                 || '',
        appointmentDate: a.appointmentDate,
        doctorName:    a.doctor?.name          || '',
        doctorSpec:    a.doctor?.specialization || '',
        slot:          a.slot                  || '',
        startTime:     a.startTime             || '',
      })));
    } catch (e) {
      console.error('Failed to load appointments:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Status change ───────────────────────────────────────────────────────────
  const handleStatusChange = async (appointmentId, newStatus) => {
    setUpdatingId(appointmentId);
    console.log('Updating status for appointment:', appointmentId, 'to:', newStatus);
    try {
      await apiFetch(`/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setAppointments(prev =>
        prev.map(a => a.appointmentId === appointmentId ? { ...a, status: newStatus } : a)
      );
    } catch (e) {
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Derived stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total     = appointments.length;
    const arrived   = appointments.filter(a => ['ARRIVED','IN_CONSULT'].includes(a.status?.toUpperCase())).length;
    const completed = appointments.filter(a => a.status?.toUpperCase() === 'COMPLETED').length;
    const waiting   = appointments.filter(a => ['SCHEDULED','CONFIRMED'].includes(a.status?.toUpperCase())).length;
    const noShow    = appointments.filter(a => a.status?.toUpperCase() === 'NO_SHOW').length;
    return { total, arrived, completed, waiting, noShow };
  }, [appointments]);

  // ── Filtered + searched list ────────────────────────────────────────────────
  const visible = useMemo(() => {
    let list = [...appointments].sort((a, b) => {
      const oa = parseInt(a.token?.replace('#','')) || 999;
      const ob = parseInt(b.token?.replace('#','')) || 999;
      return oa - ob;
    });

    if (filter === 'WAITING')   list = list.filter(a => ['SCHEDULED','CONFIRMED'].includes(a.status?.toUpperCase()));
    if (filter === 'ARRIVED')   list = list.filter(a => ['ARRIVED','IN_CONSULT'].includes(a.status?.toUpperCase()));
    if (filter === 'COMPLETED') list = list.filter(a => a.status?.toUpperCase() === 'COMPLETED');

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.phone?.includes(q) ||
        a.token?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [appointments, filter, search]);

  // ── Time helpers ────────────────────────────────────────────────────────────
  const hour     = currentTime.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr  = currentTime.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  const timeStr  = currentTime.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });

  // ── Next actions available per status ──────────────────────────────────────
  const nextActions = (status) => {
    const s = status?.toUpperCase();
    if (s === 'SCHEDULED' || s === 'CONFIRMED') return [{ label: '✓ Mark Arrived',  value: 'ARRIVED'   }, { label: '✗ No Show', value: 'NO_SHOW' }];
    if (s === 'ARRIVED')                         return [{ label: '→ In Consult',   value: 'IN_CONSULT' }];
    if (s === 'IN_CONSULT')                      return [];  // doctor completes this
    return [];
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="recep-loading">
        <div className="recep-spinner" />
        <p>Loading appointments…</p>
      </div>
    );
  }

  return (
    <div className="recep-root">

      {/* ── HEADER ── */}
      <header className="recep-header">
        <div className="recep-header-inner">

          <div className="recep-header-left">
            {/* Role badge */}
            <div className="recep-role-badge">
              <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 9H15M9 13H15M9 17H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Receptionist
            </div>
            <div className="recep-header-text">
              <p className="recep-greeting">{greeting} 👋</p>
              <h1 className="recep-name">{auth?.displayName || 'Receptionist'}</h1>
              <p className="recep-clinic">{auth?.clinicName || ''}</p>
            </div>
          </div>

          <div className="recep-header-right">
            <div className="recep-date-badge">
              <svg viewBox="0 0 24 24" fill="none" width="13" height="13" style={{flexShrink:0}}>
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {dateStr} · {timeStr}
            </div>
            <button
              className="recep-logout-btn"
              onClick={() => setShowLogoutConfirm(true)}
              title="Sign out"
            >
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M16 17L21 12L16 7M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sign Out
            </button>
          </div>

        </div>

        {/* Stats strip */}
        <div className="recep-stats-strip">
          <div className="recep-stat">
            <span className="recep-stat-num">{stats.total}</span>
            <span className="recep-stat-lbl">Total</span>
          </div>
          <div className="recep-stat-divider" />
          <div className="recep-stat">
            <span className="recep-stat-num recep-stat-num--waiting">{stats.waiting}</span>
            <span className="recep-stat-lbl">Waiting</span>
          </div>
          <div className="recep-stat-divider" />
          <div className="recep-stat">
            <span className="recep-stat-num recep-stat-num--arrived">{stats.arrived}</span>
            <span className="recep-stat-lbl">In Clinic</span>
          </div>
          <div className="recep-stat-divider" />
          <div className="recep-stat">
            <span className="recep-stat-num recep-stat-num--done">{stats.completed}</span>
            <span className="recep-stat-lbl">Done</span>
          </div>
          <div className="recep-stat-divider" />
          <div className="recep-stat">
            <span className="recep-stat-num recep-stat-num--noshow">{stats.noShow}</span>
            <span className="recep-stat-lbl">No Show</span>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="recep-main">

        {/* Toolbar */}
        <div className="recep-toolbar">
          <div className="recep-toolbar-left">
            <div className="recep-title-wrap">
              <span className="recep-section-title">Today's Queue</span>
              <span className="recep-count-badge">{visible.length} shown</span>
            </div>
          </div>
          <div className="recep-toolbar-right">
            <button className="recep-walkin-btn" onClick={openWalkInModal}>
              <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Add Walk-in
            </button>
            <button className="recep-refresh-btn" onClick={load}>
              <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                <path d="M1 4V10H7M23 20V14H17M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="recep-controls">
          <div className="recep-search-wrap">
            <svg className="recep-search-icon" viewBox="0 0 24 24" fill="none" width="16" height="16">
              <circle cx="11" cy="11" r="8" stroke="#94a3b8" strokeWidth="2"/>
              <path d="M21 21L16.65 16.65" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              className="recep-search"
              placeholder="Search by name, phone or token…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="recep-filter-tabs">
            {[
              { key:'ALL',       label:'All' },
              { key:'WAITING',   label:'Waiting' },
              { key:'ARRIVED',   label:'In Clinic' },
              { key:'COMPLETED', label:'Done' },
            ].map(f => (
              <button
                key={f.key}
                className={`recep-filter-tab ${filter === f.key ? 'recep-filter-tab--active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Queue cards */}
        {visible.length === 0 ? (
          <div className="recep-empty">
            <div className="recep-empty-icon">📋</div>
            <p>No appointments found</p>
            <small>Try a different filter or add a walk-in</small>
          </div>
        ) : (
          <div className="recep-queue">
            {visible.map((appt) => {
              const s       = getStatusStyle(appt.status);
              const actions = nextActions(appt.status);
              const isUpdating = updatingId === appt.appointmentId;
              return (
                <div className="recep-card" key={appt.appointmentId}>

                  {/* Token */}
                  <div className="recep-token">
                    <span className="recep-token-num">{appt.token || '—'}</span>
                    <span className="recep-token-lbl">Token</span>
                  </div>

                  {/* Avatar */}
                  <div
                    className="recep-avatar"
                    style={{ background: avatarColor(appt.name) }}
                  >
                    {appt.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  {/* Patient info */}
                  <div className="recep-card-body">
                    <div className="recep-card-top">
                      <span className="recep-patient-name">{appt.name}</span>
                      <span
                        className="recep-status-badge"
                        style={{ color: s.color, background: s.bg }}
                      >
                        {s.label}
                      </span>
                    </div>
                    <div className="recep-card-meta">
                      {appt.age && <span>{appt.age} yrs</span>}
                      {appt.gender && <span>·  {appt.gender}</span>}
                      {appt.phone && (
                        <span>
                          <svg viewBox="0 0 24 24" fill="none" width="11" height="11" style={{marginRight:3}}>
                            <path d="M22 16.92V19.92A2 2 0 0 1 20.46 21.87C17.39 21.55 14.44 20.5 11.86 18.83C9.47 17.31 7.43 15.27 5.92 12.88C4.24 10.29 3.19 7.32 2.88 4.24A2 2 0 0 1 4.82 2H7.82A2 2 0 0 1 9.82 3.72C10.06 5.01 10.44 6.26 10.97 7.44A2 2 0 0 1 10.52 9.42L9.3 10.64C10.74 13.18 12.82 15.26 15.36 16.7L16.58 15.48A2 2 0 0 1 18.56 15.03C19.74 15.56 20.99 15.94 22.28 16.18A2 2 0 0 1 22 16.92Z" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          ****{appt.phone.slice(-4)}
                        </span>
                      )}
                      {appt.doctorName && (
                        <span className="recep-doctor-pill">
                          🩺 {appt.doctorName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  {/*  <div className="recep-actions">
                    {actions.map(action => (
                      <button
                        key={action.value}
                        className={`recep-action-btn ${action.value === 'NO_SHOW' ? 'recep-action-btn--danger' : 'recep-action-btn--primary'}`}
                        onClick={() => handleStatusChange(appt.appointmentId, action.value)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <span className="recep-btn-spinner" /> : action.label}
                      </button>
                    ))}
                  </div>*/}

                </div>
              );
            })}
          </div>
        )}
      </main>

      
   {showWalkIn && (
  <AddWalkInModal
    loading={loadingWalkIn}
    initData={walkInInitData}
    onClose={() => setShowWalkIn(false)}
    onSuccess={() => {
      setShowWalkIn(false);
      load();
    }}
    clinicId={clinicId}
  />
)}
      {/* ── Logout confirm ── */}
      {showLogoutConfirm && (
        <div className="recep-modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="recep-modal" onClick={e => e.stopPropagation()}>
            <h3>Sign out?</h3>
            <p>You'll need to sign in again to access the receptionist portal.</p>
            <div className="recep-modal-actions">
              <button className="recep-modal-cancel" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="recep-modal-confirm" onClick={logout}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReceptionistDashboard;