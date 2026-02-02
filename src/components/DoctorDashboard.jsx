import React, { useState, useEffect } from 'react';
import '../css/DoctorDashboard.css';
import DashboardStats from './DashboardStats';
import PatientList from './PatientList';
import { fetchDashboardData } from '../services/dashboardApi.js';

const DoctorDashboard = ({ doctorId, clinicId }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    if (doctorId && clinicId) {
        loadDashboard(doctorId, clinicId);
      }
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
        p.appointmentId === appointmentId
          ? { ...p, status: newStatus }
          : p
      )
    }));
  };
  const handlePatientSelect = (patient) => {
    console.log('Selected patient:', patient);
    alert(`Selected: ${patient.name}`);
  };
 

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="doctor-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="doctor-info">
            <div className="doctor-avatar">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
                <path d="M12 14C6.48 14 2 16.24 2 19V22H22V19C22 16.24 17.52 14 12 14Z" fill="currentColor"/>
              </svg>
            </div>
            <div className="doctor-text">
            <h1>{dashboardData?.doctor?.name || 'Doctor'}</h1>
              <p className="specialization">  {dashboardData?.doctor?.specialization || ''}</p>
              <p className="clinic-name">City Health Clinic</p>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {dashboardData && (
          <>
            <DashboardStats data={dashboardData} />
            <PatientList
               patients={dashboardData?.allAppointments || []}
               onPatientSelect={handlePatientSelect}
               onRefreshAppointments={() => loadDashboard(doctorId, clinicId)}
               updatePatientStatus={updatePatientStatus}
               doctorId={doctorId}
               clinicId={clinicId}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default DoctorDashboard;