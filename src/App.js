import React, { useMemo } from "react";
import DoctorDashboard from "./components/DoctorDashboard";

function App() {
  const { doctorId, clinicId } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);

    // Try separate params first
    let doctor = params.get("doctorId");
    let clinic = params.get("clinicId");

    // Fallback to combined param if needed
    if ((!doctor || !clinic) && params.get("clinicDocId")) {
      const parts = params.get("clinicDocId").split("_");
      if (parts.length === 2) {
        doctor = parts[0];
        clinic = parts[1];
      }
    }

    // Convert to numbers
    const doctorNum = doctor ? Number(doctor) : null;
    const clinicNum = clinic ? Number(clinic) : null;

    return { doctorId: doctorNum, clinicId: clinicNum };
  }, []);

  return <DoctorDashboard doctorId={doctorId} clinicId={clinicId} />;
}

export default App;
