
import { apiFetch } from "./apiConfig";
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "https://assistiq-whatsapp-bot.onrender.com/api";

const mapAppointment = (a) => ({
  patientId:           a.patient?.id,
  appointmentId:       a.id,
  name:                a.patient?.name || "Unknown",
  phoneNumber:         a.patient?.phone || a.patient?.phoneNumber || "",
  tokenNumber:         a.tokenNumber || "",
  status:              a.status || "SCHEDULED",
  age:                 a.patient?.age || "",
  gender:              a.patient?.gender || "",
  reason:              a.notes || "N/A",
  symptoms:            a.symptoms || "",
  diagnosis:           a.diagnosis || "",
  chiefComplaint:      a.chiefComplaint || "",
  examinationFindings: a.examinationFindings || "",
  notes:               a.notes,
  /* Vitals */
  systolic:    a.systolicBP  ?? null,
  diastolic:   a.diastolicBP ?? null,
  pulse:       a.pulseRate   ?? null,
  temperature: a.temperature ?? null,
  weight:      a.weight      ?? null,
  height:      a.height      ?? null,
  spo2:        a.spo2        ?? null,
  /* Treatment advice */
  dietaryAdvice:   a.dietaryInstructions   || "",
  lifestyleAdvice: a.lifestyleInstructions || "",
  generalAdvice:   a.generalInstructions   || "",
  warningAdvice:   a.warningSigns          || "",
  nextVisitDate:   a.nextVisitDate  || "",
  nextVisitNotes:  a.nextVisitNotes || "",
  prescriptionSent: a.prescriptionSent || false,
  internalNotes:    a.internalNotes   || "",
  prescriptions: (a.prescriptions || []).map(p => ({
    id:           p.id,
    medicineName: p.medicineName || "",
    dosage:       p.dosage       || "",
    frequency:    p.frequency    || "once_daily",
    duration:     p.duration     || "",
    timing:       p.timing       || "after_food",
    notes:        p.notes        || "",
  })),
  reports: (a.reports || []).map(r => ({
    id:         r.id,
    name:       r.name,
    size:       r.size,
    uploadDate: r.uploadDate,
    url:        r.url,
  })),
  selectedTests:   a.selectedTests   || [],
  appointmentDate: a.appointmentDate,
  canvasNotes: a.canvasNoteImage
    ? [{
        imageDataUrl: a.canvasNoteImage,
        pdfDataUrl:   null,
        createdAt:    a.canvasNoteCreatedAt || null,
        visitDate:    a.appointmentDate     || a.canvasNoteCreatedAt || null,
      }]
    : [],
});
export const fetchTodayDashboardData = async (doctorId, clinicId) => {
  try {
    const [doctorDetails, activeAppts, completedAppts, stats] = await Promise.all([
      apiFetch(`/doctors/${doctorId}`),
      apiFetch(`/dashboard/appointment/today/active?doctorId=${doctorId}&clinicId=${clinicId}`),
      apiFetch(`/dashboard/appointment/today/completed?doctorId=${doctorId}&clinicId=${clinicId}`),
       apiFetch(`/dashboard/appointment/stats?doctorId=${doctorId}&clinicId=${clinicId}`),
    ]);

    const activeList    = (activeAppts    || []).map(mapAppointment);
    const completedList = (completedAppts || []).map(mapAppointment);
    const todayAll      = [...activeList, ...completedList];

    console.log("TODAY ACTIVE:",    activeList);
    console.log("TODAY COMPLETED:", completedList);
     console.log("doctorDetails:", doctorDetails);

    return {
      doctor:               doctorDetails ?? null,
      todayPatients:        todayAll,
      activeAppointments:   activeList,
      completedAppointments: completedList,
      totalPatients:         stats?.totalPatients || 0,
      
    };
  } catch (error) {
    console.error("Dashboard API error:", error);
    return {
      doctor: null,
      todayPatients:        [],
      activeAppointments:   [],
      completedAppointments: [],
      totalPatients: 0,
    };
  }
};
// ── Fetches all registered patients for a doctor (for walk-in name search) ──
// Uses GET /api/patients/registered/{doctorId} — backed by PatientController
export const fetchRegisteredPatients = async (doctorId) => {
  if (!doctorId) return [];
  try {
    const result = await apiFetch(`/patients/registered/${doctorId}`);
    const list = Array.isArray(result) ? result : (result?.content || []);
    return list.map(p => ({
      patientId:   p.id   || p.patientId,
      name:        p.name || p.patientName || 'Unknown',
      phoneNumber: p.phone || p.phoneNumber || '',
      age:         p.age    ? String(p.age)    : '',
      gender:      p.gender || '',
    }));
  } catch (error) {
    console.error("fetchRegisteredPatients error:", error);
    return [];
  }
};

export const fetchAllAppointments = async (doctorId, clinicId, page = 0, search = "") => {
  try {
    const params = new URLSearchParams({
      doctorId,
      clinicId,
      page,
      size: 10,
      ...(search ? { search } : {}),
    });

    const result = await apiFetch(`/dashboard/appointment/all?${params}`);
    const pageInfo = result?.page ?? result;

    return {
      appointments:  (result?.content || []).map(mapAppointment),
      totalPages:    pageInfo?.totalPages    || 0,
      totalElements: pageInfo?.totalElements || 0,
      currentPage:   pageInfo?.number        || 0,
    };
  } catch (error) {
    console.error("All appointments fetch error:", error);
    return { appointments: [], totalPages: 0, totalElements: 0, currentPage: 0 };
  }
};
export const fetchDashboardData = fetchTodayDashboardData;
const getUniquePatients = (appointments) => {
  const map = new Map();
  appointments.forEach(a => {
    if (a.appointmentId && !map.has(a.appointmentId)) {
      map.set(a.appointmentId, a);
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
