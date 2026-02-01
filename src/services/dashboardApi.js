
import { apiFetch } from "./apiConfig";
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";

export const fetchDashboardData = async (doctorId, clinicId) => {
  try {
    const appointments = await apiFetch(
      `/dashboard/appointment?doctorId=${doctorId}&clinicId=${clinicId}`
    );
   // console.log(response);
    

     //const appointments = await response.json();
     console.log("appointments"+appointments)
     const todayStr = new Date().toISOString().split('T')[0];

     // Appointments for today or future
     const upcomingAppointments = appointments.filter(
       (a) => a.appointmentDate >= todayStr
     );
 
     const doctorInfo = upcomingAppointments.length > 0 ? upcomingAppointments[0].doctor : null;
 
     return {
       doctor: doctorInfo,
       totalPatients: upcomingAppointments.length,
 
       // Today appointments only
       activeAppointments: upcomingAppointments.filter(
         (a) => a.appointmentDate === todayStr && a.status !== 'COMPLETED'
       ),
 
       // Completed today or future
       completedAppointments: upcomingAppointments.filter(
         (a) => a.status === 'COMPLETED'
       ),
 
       // All today or future
       allAppointments: upcomingAppointments,
 
       // Optional: today-only mapping for UI
       todayPatients: upcomingAppointments
         .filter((a) => a.appointmentDate === todayStr)
         .map((a) => ({
           patientId: a.patient.id,
           appointmentId: a.id,
           name: a.patient.name,
           phoneNumber: a.patient.phone,
           tokenNumber: a.tokenNumber,
           status: a.status,
           age: a.patient.age,
           reason: a.notes || 'N/A',
           symptoms: a.symptoms || '',
           diagnosis: a.diagnosis || '',
           nextVisitDate: a.nextVisitDate || '',
           nextVisitNotes: a.nextVisitNotes || '',
           prescriptions: a.prescriptions || [],
         }))
     };
   } catch (error) {
     console.error('Dashboard API error:', error);
     return {
       doctor: null,
       totalPatients: 0,
       activeAppointments: [],
       completedAppointments: [],
       allAppointments: [],
       todayPatients: []
     };
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
