
import { apiFetch } from "./apiConfig";
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "https://assistiq-whatsapp-bot.onrender.com/api";

export const fetchDashboardData = async (doctorId, clinicId) => {
  try {
    const appointments = await apiFetch(
      `/dashboard/appointment?doctorId=${doctorId}&clinicId=${clinicId}`
    );
   // console.log(response);
    

     //const appointments = await response.json();
     console.log("appointments"+appointments)
     const todayStr = new Date().toISOString().split("T")[0];

     // Doctor Info
     const doctorInfo = appointments?.length ? appointments[0].doctor : null;
 
     // Map ALL appointments to UI-safe structure
     const mappedAppointments = (appointments || []).map(a => ({
       patientId: a.patient?.id,
       appointmentId: a.id,
       name: a.patient?.name || "Unknown",
       phoneNumber: a.patient?.phone || "",
       tokenNumber: a.tokenNumber || "",
       status: a.status || "SCHEDULED",
       age: a.patient?.age || "",
       reason: a.notes || "N/A",
       symptoms: a.symptoms || "",
       diagnosis: a.diagnosis || "",
       nextVisitDate: a.nextVisitDate || "",
       nextVisitNotes: a.nextVisitNotes || "",
       prescriptions: a.prescriptions || [],
       appointmentDate: a.appointmentDate
     }));
 
     return {
       doctor: doctorInfo,
 
       // TOP CARDS (today only)
       todayPatients: mappedAppointments.filter(a => a.appointmentDate === todayStr),
 
       // TABS (ALL DATES)
       activeAppointments: mappedAppointments.filter(a => a.status !== "COMPLETED"),
       completedAppointments: mappedAppointments.filter(a => a.status === "COMPLETED"),
       allAppointments: mappedAppointments,
 
       totalPatients: mappedAppointments.length
     };
   } catch (error) {
     console.error("Dashboard API error:", error);
     return {
       doctor: null,
       todayPatients: [],
       activeAppointments: [],
       completedAppointments: [],
       allAppointments: [],
       totalPatients: 0
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
