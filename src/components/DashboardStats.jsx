import React from 'react';
import '../css/DashboardStats.css';

const DashboardStats = ({ data }) => {
  const stats = [
    {
      label: 'Total Patients',
      value: data?.allAppointments?.length || 0,
      color: 'blue',
      icon: (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M17 21V19C17 16.7909 15.2091 15 13 15H5C2.79086 15 1 16.7909 1 19V21" 
                stroke="currentColor" strokeWidth="2"/>
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )
    },
    {
      label: 'Completed',
      value: data?.completedAppointments?.length || 0,
      color: 'green',
      icon: (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" 
                stroke="currentColor" strokeWidth="2"/>
          <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )
    },
    {
      label: 'Active',
      value: data?.activeAppointments?.length || 0,
      color: 'amber',
      icon: (
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )
    }
  ];

  return (
    <div className="dashboard-stats">
      <h2 className="stats-title">Today's Overview</h2>
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div className={`stat-card stat-${stat.color}`} key={index}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-content">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardStats;