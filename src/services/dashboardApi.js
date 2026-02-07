
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
     const normalizeStatus = (s) => (s || "").toUpperCase();
     console.log("appointments"+appointments)
     const todayStr = new Date().toISOString().split("T")[0];
      const isToday = (dateStr) => {
        if (!dateStr) return false;
        return new Date(dateStr).toISOString().split("T")[0] === todayStr;
      };
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
       prescriptionSent: a.prescriptionSent || false,
        // Prescriptions - map from backend
      prescriptions: (a.prescriptions || []).map(p => ({
        id: p.id,
        medicineName: p.medicineName || "",
        dosage: p.dosage || "",
        frequency: p.frequency || "once_daily",
        duration: p.duration || "",
        timing: p.timing || "after_food",
        notes: p.notes || ""
      })),
       // Reports - map from backend with proper URL
      reports: (a.reports || []).map(r => ({
        id: r.id,
        name: r.name,
        size: r.size,
        uploadDate: r.uploadDate,
        url: r.url  // Backend should provide download URL
      })),
        selectedTests: a.selectedTests || [],
       appointmentDate: a.appointmentDate
     }));
        const todayAppointments = mappedAppointments.filter(a => isToday(a.appointmentDate));

      // 🔹 Today's ACTIVE (not completed or cancelled)
      const todayActiveAppointments = todayAppointments.filter(a => {
        const status = normalizeStatus(a.status);
        return status !== "COMPLETED" && status !== "CANCELLED";
      });

      // 🔹 Today's COMPLETED
      const todayCompletedAppointments = todayAppointments.filter(a =>
        normalizeStatus(a.status) === "COMPLETED"
      );

      console.log("TODAY:", todayStr);
      console.log("TODAY APPOINTMENTS:", todayAppointments);
      console.log("TODAY ACTIVE:", todayActiveAppointments);

     return {
        doctor: doctorInfo,

  // ✅ UNIQUE PATIENT COUNTS
  todayPatients: getUniquePatients(todayAppointments),
  activeAppointments: getUniquePatients(todayActiveAppointments),
  completedAppointments: getUniquePatients(todayCompletedAppointments),

  // Full lists still available if needed
  allAppointments: mappedAppointments,

  totalPatients: getUniquePatients(mappedAppointments).length
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
const getUniquePatients = (appointments) => {
  const map = new Map();
  appointments.forEach(a => {
    if (a.patientId && !map.has(a.patientId)) {
      map.set(a.patientId, a);
    }
  });
  return Array.from(map.values());
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
