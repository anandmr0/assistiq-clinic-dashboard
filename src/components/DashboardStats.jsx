import React from 'react';
import '../css/DashboardStats.css';

const DashboardStats = ({ data }) => {
  const todayTotal  = data?.todayPatients?.length          || 0;
  const completed   = data?.completedAppointments?.length  || 0;
  const active      = data?.activeAppointments?.length     || 0;
  const registered  = data?.totalPatients                  || 0;
  const remaining   = active;
  const completionPct = todayTotal > 0 ? Math.round((completed / todayTotal) * 100) : 0;

  const stats = [
    {
      label: 'Registered Patients',
      value: registered,
      color: 'blue',
      hint: 'All-time patient base',
      icon: (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M17 21V19C17 16.7909 15.2091 15 13 15H5C2.79086 15 1 16.7909 1 19V21"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
          <path d="M23 21V19C23 17.1571 21.7252 15.5694 20 15.126"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M16 3.12598C17.7252 3.56983 19 5.15715 19 7.00002C19 8.84289 17.7252 10.4302 16 10.874"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      label: 'Today Scheduled',
      value: todayTotal,
      color: 'teal',
      hint: "Today's appointments",
      icon: (
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2"
            stroke="currentColor" strokeWidth="2"/>
          <path d="M16 2V6M8 2V6M3 10H21"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="16" r="2" fill="currentColor"/>
        </svg>
      )
    },
    {
      label: 'Completed Today',
      value: completed,
      color: 'green',
      hint: 'Consultations done',
      icon: (
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 12L11 15L16 9"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      label: 'Remaining',
      value: remaining,
      color: 'amber',
      hint: 'Still to be seen',
      icon: (
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 6V12L16 14"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    }
  ];

  return (
    <div className="dashboard-stats">

      {/* ── Section label ── */}
      <div className="stats-section-label">
        <span className="stats-label-text">Practice Overview</span>
        <span className="stats-label-line" />
        <span className="stats-label-date">
          {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* ── Stat cards ── */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div className={`stat-card stat-${stat.color}`} key={index}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-content">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-hint">{stat.hint}</div>
            </div>
            <div className="stat-decoration" />
          </div>
        ))}
      </div>

      {/* ── Today at a Glance chips ── */}
      {todayTotal > 0 && (
        <>
          <div className="glance-label">Today at a Glance</div>
          <div className="glance-row">

            <div className="glance-chip glance-chip--active">
              <span className="glance-num">{completionPct}%</span>
              <span className="glance-lbl">Completion</span>
            </div>

            <div className="glance-chip">
              <span className="glance-num">{completed}</span>
              <span className="glance-lbl">Seen today</span>
            </div>

            <div className="glance-chip">
              <span className="glance-num">{remaining}</span>
              <span className="glance-lbl">Waiting</span>
            </div>

            <div className="glance-chip">
              <span className="glance-num">{todayTotal}</span>
              <span className="glance-lbl">Total today</span>
            </div>

          </div>

          {/* ── Progress bar ── */}
          <div className="today-progress">
            <div className="today-progress-header">
              <span className="today-progress-label">Today's Progress</span>
              <span className="today-progress-value">{completed} / {todayTotal} completed</span>
            </div>
            <div className="today-progress-track">
              <div
                className="today-progress-fill"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default DashboardStats;