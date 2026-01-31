
import { apiFetch } from "./apiConfig";
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http:localhost:8080/api';

export const fetchDashboardData = async (doctorId, clinicId) => {
  try {
    const appointments = await apiFetch(
      `/dashboard/appointment?doctorId=${doctorId}&clinicId=${clinicId}`
    );
   // console.log(response);
    

     //const appointments = await response.json();
     console.log("appointments"+appointments)
     const today = new Date().toISOString().split('T')[0];

    const todayAppointments = appointments.filter(
      (a) => a.appointmentDate === today
    );
 const doctorInfo =
      appointments.length > 0 ? appointments[0].doctor : null;
    return {
        doctor:doctorInfo,   
        totalPatients: appointments.length,
        completedToday: appointments.filter(a => a.status === 'COMPLETED').length,
        pendingToday: appointments.filter(a =>
          ['SCHEDULED', 'CONFIRMED'].includes(a.status)
        ).length,
        todayPatients: appointments.map(a => ({
          patientId: a.patient.id,
          appointmentId: a.id,
          name: a.patient.name,
          phoneNumber: a.patient.phone,
          tokenNumber: a.tokenNumber,
          status: a.status,
          age:a.patient.age,
          reason: a.notes || 'N/A',
          symptoms: a.symptoms || "",
          diagnosis: a.diagnosis || "",
          nextVisitDate: a.nextVisitDate || "",
          nextVisitNotes: a.nextVisitNotes || "",
          prescriptions: a.prescriptions || [],
      })),
    };
  } catch (error) {
    console.error('Dashboard API error:', error);
    return { totalPatients: 0, completedToday: 0, pendingToday: 0, todayPatients: [] };
  }
};

export const fetchPatientDetails = async (patientId) => {
  const response = await apiFetch(`/patients/${patientId}`);
  if (!response.ok) throw new Error('Failed to fetch patient');
  return await response.json();
};

export const savePrescription = async (data) => {
  const response = await apiFetch('/prescriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Failed to save prescription');
  return await response.json();
};
