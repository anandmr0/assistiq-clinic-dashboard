import React from 'react';
import DoctorDashboard from './components/DoctorDashboard';

function App() {
  const params = new URLSearchParams(window.location.search);
  const doctorId = params.get("doctorId");
  const clinicId = params.get("clinicId");

  return <DoctorDashboard doctorId={doctorId} clinicId={clinicId} />;
}

export default App;