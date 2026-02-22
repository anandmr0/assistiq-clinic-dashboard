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
      try {
        // Decode Base64
        const decoded = atob(params.get("clinicDocId"));
        const parts = decoded.split("_");

        if (parts.length === 2) {
          doctor = parts[0];
          clinic = parts[1];
        }
      } catch (err) {
        console.error("Invalid Base64 clinicDocId");
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
