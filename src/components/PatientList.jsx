import React, { useState,useEffect,useMemo   } from 'react';
import '../css/PatientList.css';
import AddWalkInModal from './AddWalkInModal';
import PrescriptionPad, { buildPrescriptionHtml, getPrescriptionPageCss } from './PrescriptionPad';
import CanvasNoteModal from './CanvasNoteModal';
import PatientHistoryPanel from './PatientHistoryPanel';
import { apiFetch } from "../services/apiConfig";
import { generatePrescriptionPdfBase64 } from './PrescriptionPdfGenerator';
import MedicineAutocomplete from './MedicineAutocomplete';
import QuickTemplates       from './QuickTemplates';
import { LANGUAGES, translateField } from './prescriptionTranslations';

const ChiefComplaintSection = ({ patient, data, handleInputChange, isLocked }) => (
  <div className="consultation-section">
    <h4 className="section-heading">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5" 
          stroke="currentColor" strokeWidth="2"/>
      </svg>
      Chief Complaint
      <span className="field-hint-inline">Main problem in brief</span>
    </h4>
    <input
      type="text"
      className="chief-complaint-input"
      placeholder="E.g., Fever and headache for 3 days"
      value={data.chiefComplaint || ''}
      onChange={(e) => handleInputChange(patient.appointmentId, 'chiefComplaint', e.target.value)}
      disabled={isLocked}
    />
  </div>
);
// Vital Signs Section
const VitalSignsSection = ({ patient, data, handleInputChange, isLocked }) => {
  const handleVitalChange = (field, value) => {
    const vitalSigns = data.vitalSigns || {};
    handleInputChange(patient.appointmentId, 'vitalSigns', {
      ...vitalSigns,
      [field]: value
    });
  };

  const vitals = data.vitalSigns || {};

  return (
    <div className="consultation-section">
      <h4 className="section-heading">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M22 12H18L15 21L9 3L6 12H2" 
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Vital Signs
      </h4>
      <div className="vitals-grid">
        <div className="vital-field">
          <label>
            Blood Pressure
            <span className="field-hint">mmHg</span>
          </label>
          <div className="bp-input-group">
            <input
              type="number"
              placeholder="120"
              value={vitals.systolic || ''}
              onChange={(e) => handleVitalChange('systolic', e.target.value)}
              disabled={isLocked}
              min="0"
              max="250"
            />
            <span className="bp-separator">/</span>
            <input
              type="number"
              placeholder="80"
              value={vitals.diastolic || ''}
              onChange={(e) => handleVitalChange('diastolic', e.target.value)}
              disabled={isLocked}
              min="0"
              max="150"
            />
          </div>
        </div>

        <div className="vital-field">
          <label>
            Pulse Rate
            <span className="field-hint">bpm</span>
          </label>
          <input
            type="number"
            placeholder="72"
            value={vitals.pulse || ''}
            onChange={(e) => handleVitalChange('pulse', e.target.value)}
            disabled={isLocked}
            min="0"
            max="200"
          />
        </div>

        <div className="vital-field">
          <label>
            Temperature
            <span className="field-hint">°F</span>
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="98.6"
            value={vitals.temperature || ''}
            onChange={(e) => handleVitalChange('temperature', e.target.value)}
            disabled={isLocked}
            min="95"
            max="110"
          />
        </div>

        <div className="vital-field">
          <label>
            Weight
            <span className="field-hint">kg</span>
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="70"
            value={vitals.weight || ''}
            onChange={(e) => handleVitalChange('weight', e.target.value)}
            disabled={isLocked}
            min="0"
            max="300"
          />
        </div>

        <div className="vital-field">
          <label>
            Height
            <span className="field-hint">cm</span>
          </label>
          <input
            type="number"
            placeholder="170"
            value={vitals.height || ''}
            onChange={(e) => handleVitalChange('height', e.target.value)}
            disabled={isLocked}
            min="0"
            max="250"
          />
        </div>

        <div className="vital-field">
          <label>
            SpO2
            <span className="field-hint">%</span>
          </label>
          <input
            type="number"
            placeholder="98"
            value={vitals.spo2 || ''}
            onChange={(e) => handleVitalChange('spo2', e.target.value)}
            disabled={isLocked}
            min="0"
            max="100"
          />
        </div>
      </div>
    </div>
  );
};
// Examination Findings Section
const ExaminationFindingsSection = ({ patient, data, handleInputChange, isLocked }) => (
  <div className="consultation-section">
    <h4 className="section-heading">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" 
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Examination Findings
      <span className="field-hint-inline">Physical examination results</span>
    </h4>
    <textarea
      className="consultation-textarea"
      placeholder="E.g., General: Patient alert and oriented. Respiratory: Clear breath sounds bilaterally..."
      rows="3"
      value={data.examinationFindings || ''}
      onChange={(e) => handleInputChange(patient.appointmentId, 'examinationFindings', e.target.value)}
      disabled={isLocked}
    />
  </div>
);
// Treatment Advice Section
const TreatmentAdviceSection = ({ patient, data, handleInputChange, isLocked }) => (
  <div className="consultation-section">
    <h4 className="section-heading">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
          stroke="currentColor" strokeWidth="2"/>
      </svg>
      Treatment Advice & Instructions
    </h4>
    <div className="advice-grid">
      <div className="advice-field">
        <label>Dietary Instructions</label>
        <textarea
          className="advice-textarea"
          placeholder="E.g., Avoid oily and spicy food, drink plenty of water..."
          rows="2"
          value={data.dietaryAdvice || ''}
          onChange={(e) => handleInputChange(patient.appointmentId, 'dietaryAdvice', e.target.value)}
          disabled={isLocked}
        />
      </div>

      <div className="advice-field">
        <label>Lifestyle Modifications</label>
        <textarea
          className="advice-textarea"
          placeholder="E.g., Rest for 2-3 days, avoid strenuous activity..."
          rows="2"
          value={data.lifestyleAdvice || ''}
          onChange={(e) => handleInputChange(patient.appointmentId, 'lifestyleAdvice', e.target.value)}
          disabled={isLocked}
        />
      </div>

      <div className="advice-field">
        <label>General Instructions</label>
        <textarea
          className="advice-textarea"
          placeholder="E.g., Complete full course of medication, maintain proper hygiene..."
          rows="2"
          value={data.generalAdvice || ''}
          onChange={(e) => handleInputChange(patient.appointmentId, 'generalAdvice', e.target.value)}
          disabled={isLocked}
        />
      </div>

      <div className="advice-field">
        <label>Warning Signs (When to Return)</label>
        <textarea
          className="advice-textarea"
          placeholder="E.g., Return immediately if fever exceeds 103°F, difficulty breathing..."
          rows="2"
          value={data.warningAdvice || ''}
          onChange={(e) => handleInputChange(patient.appointmentId, 'warningAdvice', e.target.value)}
          disabled={isLocked}
        />
      </div>
    </div>
  </div>
);
// Internal Notes Section
const InternalNotesSection = ({ patient, data, handleInputChange, isLocked }) => (
  <div className="consultation-section internal-notes-section">
    <h4 className="section-heading">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V5C20 3.89543 19.1046 3 18 3H6C4.89543 3 4 3.89543 4 5V19C4 20.1046 4.89543 21 6 21Z" 
          stroke="currentColor" strokeWidth="2"/>
        <path d="M8 7H16M8 11H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      Internal Notes
      <span className="private-badge">🔒 Private</span>
      <span className="field-hint-inline">Not shared with patient</span>
    </h4>
    <textarea
      className="consultation-textarea internal-notes-textarea"
      placeholder="Private notes for doctor's reference only (not shared with patient)..."
      rows="3"
      value={data.internalNotes || ''}
      onChange={(e) => handleInputChange(patient.appointmentId, 'internalNotes', e.target.value)}
      disabled={isLocked}
    />
  </div>
);
const PatientList = ({ todayPatients, activePatients, completedPatients, onPatientSelect, onRefreshAppointments,
  updatePatientStatus, doctorId, clinicId, doctors = [], doctorsInfo, fetchAllAppointments }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('confirmed');
  const [expandedAppointment, setExpandedAppointment] = useState(null);
  const [patientData, setPatientData] = useState({});
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInInitData, setWalkInInitData] = useState(null);
  const [savingAppointmentId, setSavingAppointmentId] = useState(null);
  const [loadingWalkIn, setLoadingWalkIn] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
   // New state for lab tests collapse and pagination
  const [labTestsExpanded, setLabTestsExpanded] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const testsPerPage = 6;
    const [showPrescriptionPad, setShowPrescriptionPad] = useState(null);
  const [showCanvasNote,      setShowCanvasNote]       = useState(null);
  const [toast, setToast] = useState(null);
 // Pagination state for Active/Completed tabs (frontend)
  const [patientCurrentPage, setPatientCurrentPage] = useState(1);
  const patientsPerPage = 10;
 
  // ── All tab — backend-paginated ──────────────────────────────
  const [allTabData,       setAllTabData]       = useState([]);
  const [allTabPage,       setAllTabPage]       = useState(0);   // 0-based (Spring)
  const [allTabTotalPages, setAllTabTotalPages] = useState(0);
  const [allTabLoading,    setAllTabLoading]    = useState(false);

  const showToast = (type, title, message, duration = 4500) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), duration);
  };

  useEffect(() => {
    setExpandedAppointment(null);
    setPatientCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // ── Seed patientData from today's lists (active + completed) ──
  useEffect(() => {
    const allToday = [...(activePatients || []), ...(completedPatients || [])];
    if (!allToday.length) return;
    setPatientData(prev => {
      const updated = { ...prev };
      allToday.forEach(patient => {
        if (!patient.patientId) return;
        const existing = updated[patient.appointmentId] || {};
        updated[patient.appointmentId] = {
          ...existing,
          selectedTests: Array.isArray(patient.selectedTests)
            ? patient.selectedTests
            : existing.selectedTests || [],
        };
      });
      return updated;
    });
  }, [activePatients, completedPatients]);

  // ── Load All tab on first open ──
  useEffect(() => {
    if (filterStatus === 'all' && allTabData.length === 0 && !allTabLoading) {
      loadAllTab(0, '');
    }
  }, [filterStatus]);

  // ── Debounced backend search for All tab ──
  useEffect(() => {
    if (filterStatus !== 'all') return;
    const timer = setTimeout(() => {
      loadAllTab(0, searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, filterStatus]);

  const loadAllTab = async (page, search) => {
    if (!fetchAllAppointments) return;
    setAllTabLoading(true);
    try {
      const result = await fetchAllAppointments(page, search);
      setAllTabData(result.appointments);
      setAllTabTotalPages(result.totalPages);
      setAllTabPage(result.currentPage);
      setExpandedAppointment(null);
    } catch (err) {
      console.error('Failed to load all appointments:', err);
      showToast('error', 'Load Failed', 'Could not load appointments. Try again.');
    } finally {
      setAllTabLoading(false);
    }
  };
  
  
  const getEmptyPrescription = () => ({
    medicineName: '',
    dosage: '',
    frequency: 'once_daily',
    duration: '',
    timing: 'after_food',
    notes: '',
    dispensed: false,
  });
  const getBasePatients = () => {
    if (filterStatus === 'confirmed') return activePatients   || [];
    if (filterStatus === 'completed') return completedPatients || [];
    if (filterStatus === 'all')       return allTabData;        // ✅ backend-paginated
    return [];
  };

  // For Active/Completed tabs — filter client-side
  // For All tab — backend already filtered/searched, just display
  const filteredPatients = filterStatus === 'all'
    ? allTabData
    : getBasePatients().filter(patient => {
        const name  = patient.name?.toLowerCase() || "";
        const phone = (patient.phoneNumber || "").toString();
        const term  = searchTerm.toLowerCase().trim();
        const matchesSearch = name.includes(term) || phone.includes(term);

        let matchesStatus = true;
        if (filterStatus === 'confirmed') {
          matchesStatus = ['CONFIRMED', 'SCHEDULED'].includes(patient.status);
        } else if (filterStatus === 'completed') {
          matchesStatus = patient.status === 'COMPLETED';
        }
        return matchesSearch && matchesStatus;
      });

  // ── Frontend pagination (Active / Completed tabs only) ──
  const totalPages         = Math.ceil(filteredPatients.length / patientsPerPage);
  const startIndex         = (patientCurrentPage - 1) * patientsPerPage;
  const endIndex           = startIndex + patientsPerPage;
  // All tab: data is already one page from backend, no need to slice
  const paginatedPatients  = filterStatus === 'all'
    ? filteredPatients
    : filteredPatients.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (pageNumber) => {
    setPatientCurrentPage(pageNumber);
    setExpandedAppointment(null); // Close any expanded patient when changing pages
  };

  const nextPage = () => {
    if (patientCurrentPage < totalPages) {
      goToPage(patientCurrentPage + 1);
    }
  };

  const prevPage = () => {
    if (patientCurrentPage > 1) {
      goToPage(patientCurrentPage - 1);
    }
  };
  const openWalkInModal = async () => {
    setLoadingWalkIn(true);
    setShowWalkInModal(true); // open modal immediately with loader
  
    try {
     // const clinicId = 1; // later dynamic
      const data = await apiFetch(`/dashboard/walkin/init?clinicId=${clinicId}`);
      console.log(data);
     // const data = await res.json();
      console.log(data);
      setWalkInInitData(data);
    } catch (err) {
      console.log(err);
      showToast('error', 'Load Failed', 'Failed to load doctors. Please refresh.');
      setShowWalkInModal(false);
    } finally {
      setLoadingWalkIn(false);
    }
  };
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshAppointments();
    } catch (error) {
      console.error('Error refreshing:', error);
      showToast('error', 'Refresh Failed', 'Failed to refresh appointments. Try again.');
    } finally {
      setIsRefreshing(false);
    }
  };
    const handleToggleExpand = (patient, e) => {
    e.stopPropagation();
    const isOpening = expandedAppointment !== patient.appointmentId;
    setExpandedAppointment(isOpening ? patient.appointmentId : null);
    console.log("Patient Data:", patient);
    if (isOpening) {
      // Auto-populate data from database
      setPatientData(prev => ({
        ...prev,
        [patient.appointmentId]: {
          symptoms: patient.symptoms || "",
          diagnosis: patient.diagnosis || "",
          nextVisitDate: patient.nextVisitDate || "",
          nextVisitNotes: patient.nextVisitNotes || "",
          prescriptions: patient.prescriptions?.length
            ? patient.prescriptions
            : [getEmptyPrescription()],
          // Auto-select tests from DB
          selectedTests: patient.selectedTests || [],
          // Auto-populate reports from DB
          reports: patient.reports || [],
       sendPrescriptionToPatient: patient.prescriptionSent !== false,
       prescriptionLanguage: patient.prescriptionLanguage || 'en',
          // ── Clinical ──────────────────────────────────────────────────────
          chiefComplaint:      patient.chiefComplaint      || "",
          symptoms:            patient.symptoms            || "",
          diagnosis:           patient.diagnosis           || "",
          examinationFindings: patient.examinationFindings  || "",
          internalNotes:       patient.internalNotes        || "",
           // ── Vital signs — kept as nested object (matches VitalSignsSection) ──
           
          vitalSigns: {
            systolic:    patient.systolic    ?? null,
            diastolic:   patient.diastolic   ?? null,
            pulse:       patient.pulse       ?? null,
            temperature: patient.temperature ?? null,
            weight:      patient.weight      ?? null,
            height:      patient.height      ?? null,
            spo2:        patient.spo2        ?? null,
          },
           // ── Treatment Advice ───────────────────────────────────────────────
          dietaryAdvice:   patient.dietaryAdvice   || "",
          lifestyleAdvice: patient.lifestyleAdvice || "",
          generalAdvice:   patient.generalAdvice   || "",
          warningAdvice:   patient.warningAdvice   || "",
           prescriptions: patient.prescriptions?.length
            ? patient.prescriptions
            : [getEmptyPrescription()],
            // ── Tests / Reports ────────────────────────────────────────────────
          selectedTests: patient.selectedTests || [],
          reports:       patient.reports       || [],
              canvasNotes: patient.canvasNotes || [],

          // canvasNote (current session) starts null — only set when doctor
          // draws a NEW note in this session via onSaveNote callback.
          canvasNote: null,
          notes:patient.notes,
        }
      }));
      
      // Reset pagination when opening
      setCurrentPage(1);
    }
  };

  const PRESCRIPTION_FIELDS = new Set([
    'chiefComplaint', 'diagnosis', 'symptoms',
    'dietaryAdvice', 'lifestyleAdvice', 'generalAdvice', 'warningAdvice',
    'examinationFindings',
  ]);

  const handleInputChange = (patientId, field, value) => {
    setPatientData(prev => ({
      ...prev,
      [patientId]: {
        ...prev[patientId],
        [field]: value,
        // ✅ auto-check WhatsApp if doctor fills any prescription-related field
        ...(PRESCRIPTION_FIELDS.has(field) && value?.trim?.()
          ? { sendPrescriptionToPatient: true }
          : {}),
      }
    }));
  };

  const handlePrescriptionChange = (patientId, index, field, value) => {
    setPatientData(prev => {
      const patientInfo = prev[patientId] || {};
      const prescriptions = patientInfo.prescriptions || [getEmptyPrescription()];
      const updatedPrescriptions = [...prescriptions];
      updatedPrescriptions[index] = { ...updatedPrescriptions[index], [field]: value };
      
      // Auto-enable WhatsApp send only when a text field has content AND
      // at least one medicine in the updated list is NOT dispensed from clinic.
      const hasPharmacyMed = updatedPrescriptions.some(p => !p.dispensed && p.medicineName?.trim());
      return {
        ...prev,
        [patientId]: {
          ...patientInfo,
          prescriptions: updatedPrescriptions,
          // ✅ auto-check WhatsApp only when there's a pharmacy (non-dispensed) medicine
          ...(value?.trim?.() && hasPharmacyMed ? { sendPrescriptionToPatient: true } : {}),
        }
      };
    });
  };



  const addPrescription = (patientId) => {
    setPatientData(prev => {
      const patientInfo = prev[patientId] || {};
      const prescriptions = patientInfo.prescriptions || [];
      
      return {
        ...prev,
        [patientId]: {
          ...patientInfo,
          prescriptions: [...prescriptions, getEmptyPrescription()]
        }
      };
    });
  };

  const removePrescription = (patientId, index) => {
    setPatientData(prev => {
      const patientInfo = prev[patientId] || {};
      const prescriptions = patientInfo.prescriptions || [];
      const updatedPrescriptions = prescriptions.filter((_, i) => i !== index);
      
      return {
        ...prev,
        [patientId]: {
          ...patientInfo,
          prescriptions: updatedPrescriptions.length > 0 ? updatedPrescriptions : [getEmptyPrescription()]
        }
      };
    });
  };

  // Handle report file upload
  // Handle report file upload with base64 conversion
 const handleReportUpload = async (patientId, file) => {
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showToast('error', 'File Too Large', 'Upload a file smaller than 5MB.');
      return;
    }

    if (file.type !== 'application/pdf') {
      showToast('error', 'Invalid File', 'Only PDF files are allowed.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', patientId);

      // Store locally with base64 for now
      const reader = new FileReader();
      reader.onload = (e) => {
        setPatientData(prev => {
          const patientInfo = prev[patientId] || {};
          const reports = patientInfo.reports || [];

          return {
            ...prev,
            [patientId]: {
              ...patientInfo,
              reports: [
                ...reports,
                {
                  id: Date.now(),
                  name: file.name,
                  size: file.size,
                  uploadDate: new Date().toISOString(),
                  url: e.target.result
                }
              ],
              sendPrescriptionToPatient: true, // ✅ auto-check when report uploaded
            }
          };
        });
      };
      reader.readAsDataURL(file);

      showToast('success', 'Report Uploaded', 'Report uploaded successfully.');
    } catch (error) {
      console.error('Error uploading report:', error);
      showToast('error', 'Upload Failed', 'Failed to upload. Try again.');
    }
  };
  const handleRemoveReport = async (patientId, reportId) => {
    try {
      // Local-only reports have a numeric timestamp as ID (from Date.now())
      // They haven't been saved to DB yet, so skip the API call
      const isLocalOnly = typeof reportId === 'number' && reportId > 1000000000000;

      if (!isLocalOnly) {
        await apiFetch(`/dashboard/reports/${reportId}`, {
          method: 'DELETE'
        });
      }

      // Always update local state
      setPatientData(prev => {
        const patientInfo = prev[patientId] || {};
        const reports = (patientInfo.reports || []).filter(r => r.id !== reportId);

        return {
          ...prev,
          [patientId]: {
            ...patientInfo,
            reports
          }
        };
      });

      showToast('success', 'Report Deleted', 'Report removed.');
    } catch (error) {
      console.error('Error deleting report:', error);
      showToast('error', 'Delete Failed', 'Failed to delete. Try again.');
    }
  };
  // Handle test selection
  // Handle test selection
  const handleTestToggle = (patientId, testName) => {
    setPatientData(prev => {
      const patientInfo = prev[patientId] || {};
      const selectedTests = patientInfo.selectedTests || [];

      const isSelected = selectedTests.includes(testName);
      const updatedTests = isSelected
        ? selectedTests.filter(t => t !== testName)
        : [...selectedTests, testName];

      return {
        ...prev,
        [patientId]: {
          ...patientInfo,
          selectedTests: updatedTests,
          // ✅ auto-check when a test is selected (not when deselected)
          ...(!isSelected ? { sendPrescriptionToPatient: true } : {}),
        }
      };
    });
  };
  // const loadAppointments = async () => {
  //   const data = await fetchDashboardData(doctorId, clinicId);
  //   setPatients(data.todayPatients);
  // };
  
  // useEffect(() => {
  //   loadAppointments();
  // }, []);

    // Toggle lab tests section
  const toggleLabTests = (patientId) => {
    setLabTestsExpanded(prev => ({
      ...prev,
      [patientId]: !prev[patientId]
    }));
    setCurrentPage(1); // Reset to first page when toggling
  };
  const handleMarkComplete = async (patient) => {
    const data = patientData[patient.appointmentId] || {};
    setSavingAppointmentId(patient.appointmentId);
    console.log('Marking complete for:', patient.name);
    console.log('Data:', data);
    const cleanPrescriptions = (data.prescriptions || []).filter(
      (p) =>
        p.medicineName && p.dosage && p.frequency && p.duration && p.timing
    );
  let prescriptionPdfBase64 = null;
  let prescriptionHtml      = null;

    const hasPrescription = cleanPrescriptions.length > 0;
  if (hasPrescription) {
  try {
    prescriptionPdfBase64 = await generatePrescriptionPdfBase64(
      patient, data,
      {
        name:          doctorsInfo?.name          || '',
        qualification: doctorsInfo?.qualification || '',
        specialization: doctorsInfo?.specialization || '',
        regNo:         doctorsInfo?.regNo          || '',
        clinicName:    doctorsInfo?.clinicName     || '',
        address:       doctorsInfo?.address        || '',
        phoneNumber:   doctorsInfo?.phoneNumber    || '',
        clinicNumber:  doctorsInfo?.clinicNumber   || '',
      },
      data.prescriptionLanguage || 'en'
    );
  } catch (pdfErr) {
    console.warn('[handleMarkComplete] PDF generation skipped:', pdfErr);
  }

  const prescriptionBodyHtml = buildPrescriptionHtml(patient, data, doctorsInfo);
  prescriptionHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>Prescription — ${patient?.name || 'Patient'}</title>
    <style>${getPrescriptionPageCss()}</style>
  </head>
  <body>${prescriptionBodyHtml}</body>
</html>`;
}
 // ── Canvas / handwritten note ──
    // Structured as a nested object matching CompleteAppointmentRequest.CanvasNoteDto
    const canvasNote = data.canvasNote
      ? {
          imageDataUrl: data.canvasNote.imageDataUrl || null,
          pdfDataUrl:   data.canvasNote.pdfDataUrl   || null,
          createdAt:    data.canvasNote.createdAt     || null,
        }
      : null;

    const payload = {
      appointmentId: patient.appointmentId,

  // Clinical data
  chiefComplaint: data.chiefComplaint || "",
  symptoms: data.symptoms || "",
  diagnosis: data.diagnosis || "",
  examinationFindings: data.examinationFindings || "",

  // ✅ VITAL SIGNS FLATTENED
  systolicBP: data.vitalSigns?.systolic || null,
  diastolicBP: data.vitalSigns?.diastolic || null,
  pulseRate: data.vitalSigns?.pulse || null,
  temperature: data.vitalSigns?.temperature || null,
  weight: data.vitalSigns?.weight || null,
  height: data.vitalSigns?.height || null,
  spo2: data.vitalSigns?.spo2 || null,

  // ✅ INSTRUCTIONS
  dietaryInstructions: data.dietaryAdvice || "",
  lifestyleInstructions: data.lifestyleAdvice || "",
  generalInstructions: data.generalAdvice || "",
  warningSigns: data.warningAdvice || "",

  // Prescription & tests
  prescriptions: cleanPrescriptions,
  reports: data.reports || [],
  selectedTests: data.selectedTests || [],

 
 

  // Next visit
  nextVisitDate: data.nextVisitDate || null,
  nextVisitNotes: data.nextVisitNotes || "",

  // Internal
  internalNotes: data.internalNotes || "",

  // Send prescription to patient only if there is at least one medicine the
  // patient needs to buy from a pharmacy (i.e. NOT dispensed from clinic).
  // If every medicine is dispensed in-clinic, no prescription needs to be sent.
  // Canvas notes still trigger sending regardless.
  sendPrescriptionToPatient: (() => {
    const hasPharmacyMedicine = cleanPrescriptions.some(p => !p.dispensed);
    const hasCanvasNote       = !!data.canvasNote?.imageDataUrl;
    const hasContent          = hasPharmacyMedicine || hasCanvasNote;
    return hasContent && (data.sendPrescriptionToPatient ?? true);
  })(),
  prescriptionLanguage: data.prescriptionLanguage || 'en',

  // Canvas handwritten note
  canvasNoteImageUrl: data.canvasNote?.imageDataUrl || null,
  canvasNotePdfUrl:   data.canvasNote?.pdfDataUrl   || null,
  canvasNoteDate:     data.canvasNote?.createdAt    || null,
   canvasNote,

      // Full self-contained HTML of the prescription pad.
      // Backend converts this to PDF and attaches it to the patient message.
      prescriptionHtml,
      // ── Frontend-generated PDF (base64, no prefix) ────────────────────────
      // When present, backend sends THIS directly to WhatsApp instead of
      // regenerating via PDFBox. Pixel-perfect match to the on-screen layout.
      // null when generation failed — backend falls back to PDFBox.
      prescriptionPdfBase64,
    };
    
    //alert(`Consultation completed for ${patient.name}!\n\nSymptoms: ${data.symptoms || 'N/A'}\nPrescriptions: ${(data.prescriptions || []).length} medicine(s)\nNext Visit: ${data.nextVisitDate || 'Not set'}`);
    try {
        console.log("Request Sent:", payload);
      const res = await apiFetch("/appointments/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
     // if (!res.ok) throw new Error();
      console.log("Request Sent:", payload);
      showToast('success', 'Consultation Completed', `${patient.name}'s consultation saved and prescription dispatched.`, 5000);
      setExpandedAppointment(null);
    //   setPatientData(prev => ({
    //   ...prev,
    //   [patient.patientId]: {}
    // }));
    setPatientData((prev) => {
      const updated = { ...prev };
      delete updated[patient.appointmentId];
      return updated;
    });
    if (onRefreshAppointments) {
      setTimeout(() => onRefreshAppointments(), 1800);
    }
  } catch (err) {
    console.error(err);
    showToast('error', 'Save Failed', 'Failed to save consultation. Check connection and try again.');

  }
  finally {
    setSavingAppointmentId(null); // STOP LOADING
  }
  };

  

  const getStatusColor = (status) => {
    const colors = {
      'SCHEDULED': 'status-scheduled',
      'CONFIRMED': 'status-confirmed',
      'COMPLETED': 'status-completed',
      'CANCELLED': 'status-cancelled'
    };
    return colors[status] || 'status-scheduled';
  };
  
   // Available lab tests - industry standard
   const availableTests = [
    { id: 'cbc', name: 'Complete Blood Count (CBC)', category: 'Blood Test', common: true },
    { id: 'fbs', name: 'Fasting Blood Sugar (FBS)', category: 'Blood Test', common: true },
    { id: 'ppbs', name: 'Post Prandial Blood Sugar (PPBS)', category: 'Blood Test', common: true },
    { id: 'hba1c', name: 'HbA1c (Glycated Hemoglobin)', category: 'Blood Test', common: true },
    { id: 'lipid', name: 'Lipid Profile', category: 'Blood Test', common: true },
    { id: 'thyroid', name: 'Thyroid Profile (T3, T4, TSH)', category: 'Blood Test', common: true },
    { id: 'lft', name: 'Liver Function Test (LFT)', category: 'Blood Test', common: true },
    { id: 'kft', name: 'Kidney Function Test (KFT)', category: 'Blood Test', common: true },
    { id: 'urine', name: 'Urine Routine & Microscopy', category: 'Urine Test', common: true },
    { id: 'xray_chest', name: 'X-Ray Chest', category: 'Imaging', common: false },
    { id: 'ultrasound', name: 'Ultrasound Abdomen', category: 'Imaging', common: false },
    { id: 'ecg', name: 'ECG (Electrocardiogram)', category: 'Cardiac', common: true },
    { id: 'echo', name: '2D Echo', category: 'Cardiac', common: false },
    { id: 'vitamin_d', name: 'Vitamin D', category: 'Blood Test', common: false },
    { id: 'vitamin_b12', name: 'Vitamin B12', category: 'Blood Test', common: false }
  ];

  return (
    <div className="patient-list-container">
      <div className="patient-list-header">
        <h2 className="section-title">Today's Patients</h2>
        <div className="header-actions">
        <button className="add-walkin-btn" onClick={openWalkInModal}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Add Walk-in
          </button>
          <div className="patient-count-mobile">
            {filteredPatients.length} Patients
          </div>
          <button 
            className="refresh-btn" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <svg 
              viewBox="0 0 24 24" 
              fill="none"
              style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}
            >
              <path d="M1 4V10H7M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 9C19.9828 7.56678 19.1209 6.28536 17.9845 5.27542C16.8482 4.26548 15.4745 3.55976 13.9917 3.22426C12.5089 2.88875 10.9652 2.93434 9.50481 3.35677C8.04437 3.77921 6.71475 4.56471 5.64 5.64L1 10M23 14L18.36 18.36C17.2853 19.4353 15.9556 20.2208 14.4952 20.6432C13.0348 21.0657 11.4911 21.1112 10.0083 20.7757C8.52547 20.4402 7.1518 19.7345 6.01547 18.7246C4.87913 17.7146 4.01717 16.4332 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="patient-filters">
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          )}
        </div>

        <div className="filter-tabs">
        <button 
            className={`filter-tab ${filterStatus === 'confirmed' ? 'active' : ''}`}
            onClick={() => setFilterStatus('confirmed')}
          >
            Active
          </button>
          <button 
            className={`filter-tab ${filterStatus === 'completed' ? 'active' : ''}`}
            onClick={() => setFilterStatus('completed')}
          >
            Completed
          </button>
          <button 
            className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All
          </button>
         
          
        </div>
      </div>

      {/* All-tab loading spinner */}
      {filterStatus === 'all' && allTabLoading && (
        <div className="empty-state">
          <div className="loading-spinner" />
          <p>Loading appointments...</p>
        </div>
      )}

      {filteredPatients.length === 0 && !(filterStatus === 'all' && allTabLoading) ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <h3>No patients found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
        <div className="patient-list">
          {paginatedPatients.map((patient, index) => {
            const isExpanded = expandedAppointment === patient.appointmentId;
            const data = patientData[patient.appointmentId] || {};
            const prescriptions = data.prescriptions || [getEmptyPrescription()];
            const isConsultationLocked =
            patient.status === "COMPLETED" || patient.status === "CANCELLED";
            const isLabTestsExpanded = labTestsExpanded[patient.appointmentId] || false;
             // Pagination logic for tests
            const totalPages = Math.ceil(availableTests.length / testsPerPage);
            const startIndex = (currentPage - 1) * testsPerPage;
            const endIndex = startIndex + testsPerPage;
            const paginatedTests = availableTests.slice(startIndex, endIndex);
            return (
              <div 
              key={`${patient.patientId}-${patient.appointmentId || ''}`}
                className={`patient-card-wrapper ${isExpanded ? 'expanded' : ''}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="patient-card">
                  <div className="patient-avatar">
                    <span>{patient.name.charAt(0)?.toUpperCase()|| '?'}</span>
                  </div>
                  
                  <div className="patient-info">
                    <div className="patient-header">
                      <h3 className="patient-name">{patient.name}</h3>
                      <span className={`badge ${getStatusColor(patient.status)}`}>
                        {patient.status}
                      </span>
                    </div>
                    
                    <div className="patient-meta">
                      <div className="meta-item">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <span>{patient.age} yrs</span>
                      </div>
                      
                      <div className="meta-item">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <span>Token: #{patient.tokenNumber}</span>
                      </div>
                      {/* Gender */}
                      {patient.gender && (
                        <div className="meta-item">
                          <svg viewBox="0 0 24 24" fill="none">
                            {(patient.gender === "MALE" || patient.gender === "Male") && (
                              <path
                                d="M16 2H22V8M22 2L13.5 10.5M10 22C13.3137 22 16 19.3137 16 16C16 12.6863 13.3137 10 10 10C6.68629 10 4 12.6863 4 16C4 19.3137 6.68629 22 10 22Z"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                            )}

                            {(patient.gender === "FEMALE" || patient.gender === "Female" ) && (
                              <path
                                d="M12 14C15.3137 14 18 11.3137 18 8C18 4.68629 15.3137 2 12 2C8.68629 2 6 4.68629 6 8C6 11.3137 8.68629 14 12 14ZM12 14V22M9 19H15"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                            )}

                            {(patient.gender === "OTHER" || patient.gender === "Other") && (
                              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                            )}
                          </svg>

                          <span>{patient.gender}</span>
                        </div>
                      )}
                      {/* Phone Number */}
                        {patient.phoneNumber && (
                          <div className="meta-item">
                            <svg viewBox="0 0 24 24" fill="none">
                              <path
                                d="M3 5C3 4.44772 3.44772 4 4 4H7.28C7.7514 4 8.15521 4.33142 8.246 4.794L9.12 9.03C9.20588 9.44768 9.01945 9.8773 8.654 10.095L6.91 11.14C8.05 13.58 10.42 15.95 12.86 17.09L13.905 15.346C14.1227 14.9806 14.5523 14.7941 14.97 14.88L19.206 15.754C19.6686 15.8448 20 16.2486 20 16.72V20C20 20.5523 19.5523 21 19 21C10.716 21 3 13.284 3 5Z"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                            </svg>

                            <span>
                              ****{patient.phoneNumber.slice(-4)}
                            </span>
                          </div>
                        )}
                       <div className="meta-item">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M8 7V3M16 7V3M4 11H20M5 5H19C20.1046 5 21 5.89543 21 7V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V7C3 5.89543 3.89543 5 5 5Z"
                          stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <span>Appointment Date:{patient.appointmentDate}</span>
                    </div>

                    </div>
                   
                    {patient.reason && (
                      <div className="patient-reason">
                        <svg viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <span>{patient.reason}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* ── Only chevron in header ── */}
                  <div className="patient-card-right-actions">
                    <button 
                      className="expand-toggle"
                      onClick={(e) => handleToggleExpand(patient, e)}
                    >
                      <svg 
                        viewBox="0 0 24 24" 
                        fill="none"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="patient-expanded-content">

                    {/* ── Patient Visit History ── */}
                    <PatientHistoryPanel
                      patientId={patient.patientId}
                      currentAppointmentId={patient.appointmentId}
                       doctorId={doctorId}   
                    />

                    {/* ── Action buttons row at top of expanded panel ── */}
                    <div className="consultation-top-actions">
                      <button
                        className={`cta-btn cta-canvas ${data.canvasNote ? 'cta-saved' : ''}`}
                        onClick={() => setShowCanvasNote(patient)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                          <path d="M12 20H21M16.5 3.5C17.33 2.67 18.67 2.67 19.5 3.5C20.33 4.33 20.33 5.67 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {data.canvasNote ? '✓ Prescription Note Saved' : 'Write Prescription'}
                      </button>

                      <button
                        className="cta-btn cta-prescription"
                        onClick={() => setShowPrescriptionPad(patient)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                          <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5" 
                            stroke="currentColor" strokeWidth="2"/>
                          <path d="M9 12H15M9 16H15" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        View Prescription
                      </button>
                    </div>
                        {/* AFTER — add QuickTemplates above */}
                        <QuickTemplates
                         currentData={patientData[patient.appointmentId] || {}}  
                        doctorId={doctorId}
                          onApply={(templateData) => {
                            setPatientData(prev => ({
                              ...prev,
                              [patient.appointmentId]: {
                                ...prev[patient.appointmentId],
                                ...templateData,
                                sendPrescriptionToPatient: true, // ✅ auto-check on template apply
                              }
                            }));
                          }}
                          isLocked={isConsultationLocked}
                        />

                    {/* 1. Chief Complaint */}
                      <ChiefComplaintSection 
                        patient={patient}
                        data={data}
                        handleInputChange={handleInputChange}
                        isLocked={isConsultationLocked}
                      />

                      {/* 2. NEW: Vital Signs */}
                      <VitalSignsSection 
                        patient={patient}
                        data={data}
                        handleInputChange={handleInputChange}
                        isLocked={isConsultationLocked}
                      />
                    {/* Symptoms Section */}
                    <div className="consultation-section">
                      <h4 className="section-heading">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        Symptoms 
                      </h4>
                      <textarea
                      className="consultation-textarea"
                      placeholder="Enter patient symptoms..."
                      rows="2"
                      value={data.symptoms || ''}
                      onChange={(e) => handleInputChange(patient.appointmentId, 'symptoms', e.target.value)}
                    />

                   
                    </div>
                    <div className="consultation-section">
                      <h4 className="section-heading">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                         Diagnosis
                      </h4>
                        <textarea
                      className="consultation-textarea"
                      placeholder="Diagnosis..."
                      rows="2"
                      value={data.diagnosis || ''}
                      onChange={(e) => handleInputChange(patient.appointmentId, 'diagnosis', e.target.value)}
                    />
                     {/* 5. NEW: Examination Findings */}
                      <ExaminationFindingsSection 
                        patient={patient}
                        data={data}
                        handleInputChange={handleInputChange}
                        isLocked={isConsultationLocked}
                      />
                    </div>
                     {/* Lab Tests Section - Collapsible with Pagination */}
                     <div className="consultation-section">
                      <div className="section-heading-with-toggle">
                        <h4 className="section-heading">
                          <svg viewBox="0 0 24 24" fill="none">
                            <path d="M7 21H17M10 21V7L8 2H16L14 7V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M10 11H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          Recommended Lab Tests (Optional)
                          {data.selectedTests && data.selectedTests.length > 0 && (
                            <span className="selected-count">{data.selectedTests.length} selected</span>
                          )}
                        </h4>
                        <button 
                          className="collapse-toggle-btn"
                          onClick={() => toggleLabTests(patient.appointmentId)}
                         
                        >
                          <svg 
                            viewBox="0 0 24 24" 
                            fill="none"
                            style={{ transform: isLabTestsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          >
                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          {isLabTestsExpanded ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                      
                      {isLabTestsExpanded && (
                        <>
                          <div className="tests-grid">
                            {paginatedTests.map(test => (
                              <label key={test.id} className="test-checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={(data.selectedTests || []).includes(test.name)}
                                  onChange={() => handleTestToggle(patient.appointmentId, test.name)}
                                  disabled={isConsultationLocked}
                                />
                                <span className="test-checkbox-text">
                                  <strong>{test.name}</strong>
                                  <small>{test.category}</small>
                                </span>
                              </label>
                            ))}
                          </div>
                          
                          {/* Pagination Controls */}
                          {totalPages > 1 && (
                            <div className="pagination-controls">
                              <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                              >
                                <svg viewBox="0 0 24 24" fill="none">
                                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                                Previous
                              </button>
                              
                              <div className="pagination-info">
                                <span>Page {currentPage} of {totalPages}</span>
                                <small>{startIndex + 1}-{Math.min(endIndex, availableTests.length)} of {availableTests.length} tests</small>
                              </div>
                              
                              <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                              >
                                Next
                                <svg viewBox="0 0 24 24" fill="none">
                                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    

                    </div>
                    {/* Reports Section */}
                     <div className="consultation-section">
                      <h4 className="section-heading">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2"/>
                          <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        Patient Reports (Optional - PDF only, max 5MB)
                      </h4>
                      
                      <div className="reports-section">
                        {!isConsultationLocked && (
                          <div className="upload-area">
                            <input
                              type="file"
                              id={`report-upload-${patient.patientId}`}
                              accept=".pdf"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  handleReportUpload(patient.appointmentId, file);
                                  e.target.value = null;
                                }
                              }}
                              style={{ display: 'none' }}
                            />
                            <label 
                              htmlFor={`report-upload-${patient.patientId}`}
                              className="upload-btn"
                            >
                              <svg viewBox="0 0 24 24" fill="none">
                                <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2"/>
                                <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2"/>
                                <path d="M12 3V15" stroke="currentColor" strokeWidth="2"/>
                              </svg>
                              Upload PDF Report
                            </label>
                          </div>
                        )}

                        {data.reports && data.reports.length > 0 && (
                          <div className="reports-list">
                            {data.reports.map(report => (
                              <div key={report.id} className="report-item">
                                <svg viewBox="0 0 24 24" fill="none" className="report-icon">
                                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2"/>
                                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                                <div className="report-info">
                                  <span className="report-name">{report.name}</span>
                                  <span className="report-size">{(report.size / 1024).toFixed(1)} KB</span>
                                </div>
                                <div className="report-actions">
                                  <a 
                                    href={report.url} 
                                    download={report.name}
                                    className="report-action-btn download-btn"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none">
                                      <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2"/>
                                      <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2"/>
                                      <path d="M12 15V3" stroke="currentColor" strokeWidth="2"/>
                                    </svg>
                                  </a>
                                  {!isConsultationLocked && (
                                    <button
                                      onClick={() => handleRemoveReport(patient.appointmentId, report.id)}
                                      className="report-action-btn delete-btn"
                                    >
                                      <svg viewBox="0 0 24 24" fill="none">
                                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Prescription Section */}
                    <div className="consultation-section">
                      <div className="section-header-with-button">
                        <h4 className="section-heading">
                          <svg viewBox="0 0 24 24" fill="none">
                            <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          Prescription
                        </h4>
                        {/* <button
                          className="add-prescription-btn"
                          onClick={() => addPrescription(patient.appointmentId)}
                        >
                          <svg viewBox="0 0 24 24" fill="none">
                            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          Add Medicine
                        </button> */}
                      </div>
                      
                      <div className="prescription-list">
                        {prescriptions.map((prescription, idx) => (
                          <div key={idx} className="prescription-row">
                            <div className="prescription-row-header">
                              <span className="prescription-number">Medicine {idx + 1}</span>
                              {idx > 0 && (
                                <button
                                  className="remove-prescription-btn"
                                  onClick={() => removePrescription(patient.appointmentId, idx)}
                                >
                                  <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
                                  </svg>
                                </button>
                              )}
                            </div>
                            
                            <div className="prescription-grid">
                              <div className="form-field full-width">
                                <label>Medicine Name *</label>
                                <MedicineAutocomplete
                                  value={prescription.medicineName || ''}
                                  disabled={isConsultationLocked}
                                  onChange={(name, defaults) => {
                                    handlePrescriptionChange(patient.appointmentId, idx, 'medicineName', name);
                                    if (defaults) {
                                      handlePrescriptionChange(patient.appointmentId, idx, 'dosage',    defaults.dosage);
                                      handlePrescriptionChange(patient.appointmentId, idx, 'frequency', defaults.frequency);
                                      handlePrescriptionChange(patient.appointmentId, idx, 'duration',  defaults.duration);
                                      handlePrescriptionChange(patient.appointmentId, idx, 'timing',    defaults.timing);
                                    }
                                  }}
                              />
                              </div>

                              <div className="form-field">
                                <label>Dosage *</label>
                                <input
                                  type="text"
                                  placeholder="e.g., 1 tab, 5ml"
                                  value={prescription.dosage}
                                  onChange={(e) => handlePrescriptionChange(patient.appointmentId, idx, 'dosage', e.target.value)}
                                />
                              </div>

                              <div className="form-field">
                                <label>Frequency *</label>
                                <select
                                  value={prescription.frequency}
                                  onChange={(e) => handlePrescriptionChange(patient.appointmentId, idx, 'frequency', e.target.value)}
                                >
                                  <option value="once_daily">Once daily</option>
                                  <option value="twice_daily">Twice daily</option>
                                  <option value="thrice_daily">Thrice daily</option>
                                  <option value="every_6_hours">Every 6 hours</option>
                                  <option value="every_8_hours">Every 8 hours</option>
                                  <option value="every_12_hours">Every 12 hours</option>
                                  <option value="as_needed">As needed</option>
                                  <option value="custom">Custom</option>
                                </select>
                              </div>

                              <div className="form-field">
                                <label>Duration *</label>
                                <select
                                  value={prescription.duration}
                                  onChange={(e) => handlePrescriptionChange(patient.appointmentId, idx, 'duration', e.target.value)}
                                >
                                  <option value="">Select duration</option>
                                  <option value="1_day">1 day</option>
                                  <option value="3_days">3 days</option>
                                  <option value="5_days">5 days</option>
                                  <option value="7_days">7 days (1 week)</option>
                                  <option value="10_days">10 days</option>
                                  <option value="14_days">14 days (2 weeks)</option>
                                  <option value="21_days">21 days (3 weeks)</option>
                                  <option value="30_days">30 days (1 month)</option>
                                  <option value="ongoing">Ongoing</option>
                                </select>
                              </div>

                              <div className="form-field">
                                <label>Timing *</label>
                                <select
                                  value={prescription.timing}
                                  onChange={(e) => handlePrescriptionChange(patient.appointmentId, idx, 'timing', e.target.value)}
                                >
                                  <option value="before_food">Before food</option>
                                  <option value="after_food">After food</option>
                                  <option value="with_food">With food</option>
                                  <option value="empty_stomach">Empty stomach</option>
                                  <option value="bedtime">At bedtime</option>
                                  <option value="morning">In the morning</option>
                                  <option value="anytime">Anytime</option>
                                </select>
                              </div>

                              <div className="form-field full-width">
                                <label>Notes (Optional)</label>
                                <input
                                  type="text"
                                  placeholder="Special instructions..."
                                  value={prescription.notes}
                                  onChange={(e) => handlePrescriptionChange(patient.appointmentId, idx, 'notes', e.target.value)}
                                />
                              </div>

                              {/* ── Dispense from clinic toggle ── */}
                              <div className="form-field full-width">
                                <label style={{ fontSize: 13, color: '#374151', fontWeight: 500, marginBottom: 6, display: 'block' }}>
                                  Dispense from Clinic
                                </label>
                                <div
                                  onClick={() => { if (!isConsultationLocked) handlePrescriptionChange(patient.appointmentId, idx, 'dispensed', !prescription.dispensed); }}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 10,
                                    cursor: isConsultationLocked ? 'default' : 'pointer',
                                    padding: '8px 14px',
                                    borderRadius: 10,
                                    border: `1.5px solid ${prescription.dispensed ? '#93c5fd' : '#e2e8f0'}`,
                                    background: prescription.dispensed ? '#eff6ff' : '#f8fafc',
                                    transition: 'all 0.18s',
                                    userSelect: 'none',
                                    width: 'fit-content',
                                  }}
                                >
                                  {/* Toggle pill */}
                                  <div style={{
                                    width: 38, height: 20, borderRadius: 10, flexShrink: 0,
                                    background: prescription.dispensed ? '#2563eb' : '#cbd5e1',
                                    position: 'relative', transition: 'background 0.2s',
                                  }}>
                                    <div style={{
                                      position: 'absolute', top: 2,
                                      left: prescription.dispensed ? 20 : 2,
                                      width: 16, height: 16, borderRadius: '50%',
                                      background: '#fff', transition: 'left 0.2s',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                                    }} />
                                  </div>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: prescription.dispensed ? '#1d4ed8' : '#64748b' }}>
                                    {prescription.dispensed ? '✓ Dispensed from clinic' : 'Dispense from clinic'}
                                  </span>
                                  {prescription.dispensed && (
                                    <span style={{
                                      fontSize: 11, background: '#dbeafe', color: '#1e40af',
                                      padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                                    }}>
                                      Clinic stock
                                    </span>
                                  )}
                                </div>
                              </div>

                            </div>
                          </div>
                        ))}
                      </div>

                      {/* ── Bottom Add Medicine button ── */}
                      {!isConsultationLocked && (
                        <button
                          className="add-prescription-btn"
                          onClick={() => addPrescription(patient.appointmentId)}
                          style={{
                            marginTop: 8, width: '100%', justifyContent: 'center',
                            
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                          </svg>
                          Add Medicine
                        </button>
                      )}

                     {/* Send Prescription Checkbox + Language */}
                     {!isConsultationLocked && (() => {
                        // "pharmacy" medicines = medicines the patient must buy (not dispensed from clinic)
                        const hasPharmacyMedicine = (data.prescriptions || []).some(p => p.medicineName?.trim() && !p.dispensed);
                        const allDispensed        = (data.prescriptions || []).some(p => p.medicineName?.trim()) && !hasPharmacyMedicine;
                        const hasCanvasNote       = !!data.canvasNote?.imageDataUrl;
                        const hasReports          = (data.reports || []).length > 0;
                        const hasTests            = (data.selectedTests || []).length > 0;
                        // hasContent = true only when there's something the patient actually needs to receive
                        const hasContent          = hasPharmacyMedicine || hasCanvasNote || hasReports || hasTests;
                        const currentLang         = data.prescriptionLanguage || 'en';
                        return (
                          <div className="send-prescription-section">
                            {/* Show "all dispensed" notice when every medicine comes from clinic */}
                            {allDispensed && !hasCanvasNote && (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 12px', borderRadius: 8, marginBottom: 8,
                                background: '#f0fdf4', border: '1px solid #86efac',
                                fontSize: 12.5, color: '#166534', fontWeight: 500,
                              }}>
                                <span>✅</span>
                                <span>All medicines are dispensed from clinic — no prescription will be sent to patient.</span>
                              </div>
                            )}
                            {/* Language selector — only shown when there's content to send */}
                            {hasContent && (
                              <div className="prescription-language-row">
                                <span className="prescription-language-label">
                                  🌐 WhatsApp language:
                                </span>
                                <div className="prescription-language-pills">
                                  {LANGUAGES.map(lang => (
                                    <button
                                      key={lang.code}
                                      onClick={() => handleInputChange(patient.appointmentId, 'prescriptionLanguage', lang.code)}
                                      className={`lang-pill ${currentLang === lang.code ? 'active' : ''}`}
                                      title={lang.label}
                                    >
                                      {lang.flag} {lang.label}
                                    </button>
                                  ))}
                                </div>
                                {currentLang !== 'en' && (
                                  <div className="lang-preview">
                                    <span>Preview: </span>
                                    <em>
                                      {translateField('timing', 'after_food', currentLang)} &nbsp;·&nbsp;
                                      {translateField('frequency', 'twice_daily', currentLang)} &nbsp;·&nbsp;
                                      {translateField('duration', '7_days', currentLang)}
                                    </em>
                                  </div>
                                )}
                              </div>
                            )}

                            <label
                              className="send-prescription-checkbox"
                              style={{ opacity: hasContent ? 1 : 0.45, cursor: hasContent ? 'pointer' : 'not-allowed' }}
                            >
                              <input
                                type="checkbox"
                                disabled={!hasContent}
                                checked={hasContent && (data.sendPrescriptionToPatient ?? true)}
                                onChange={(e) => handleInputChange(patient.appointmentId, 'sendPrescriptionToPatient', e.target.checked)}
                              />
                              <span className="checkbox-label">
                                <svg viewBox="0 0 24 24" fill="none" className="whatsapp-icon">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="currentColor"/>
                                </svg>
                                <strong>Send prescription to patient via WhatsApp</strong>
                                <small>
                                  {hasContent
                                    ? `Patient will receive prescription in ${LANGUAGES.find(l => l.code === currentLang)?.label || 'English'}`
                                    : allDispensed
                                    ? 'All medicines dispensed from clinic — no send needed'
                                    : 'Add medicines or a handwritten note to enable'}
                                </small>
                              </span>
                            </label>
                          </div>
                        );
                      })()}
                    </div>
                         {/* 9. NEW: Treatment Advice */}
                      <TreatmentAdviceSection 
                        patient={patient}
                        data={data}
                        handleInputChange={handleInputChange}
                        isLocked={isConsultationLocked}
                      />          
                    {/* Next Visit Reminder */}
                    <div className="consultation-section">
                      <h4 className="section-heading">
                        <svg viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                          <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        Next Visit Reminder
                      </h4>
                      <div className="reminder-row">
                        <input
                          type="date"
                          className="reminder-input"
                          value={data.nextVisitDate || ''}
                          onChange={(e) => handleInputChange(patient.appointmentId, 'nextVisitDate', e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                        <textarea
                          className="reminder-notes"
                          placeholder="Notes for next visit..."
                          rows="2"
                          value={data.nextVisitNotes || ''}
                          onChange={(e) => handleInputChange(patient.appointmentId, 'nextVisitNotes', e.target.value)}
                        />
                      </div>
                    </div>
                    {/* Prescription Pad Modal */}
                    {showPrescriptionPad && (
                      <PrescriptionPad
                        patient={showPrescriptionPad}
                        data={patientData[showPrescriptionPad.appointmentId] || {}}
                        isVisible={!!showPrescriptionPad}
                        onClose={() => setShowPrescriptionPad(null)}
                        doctorInfo={{
                          name: doctors?.[0]?.name || "Dr. Name",
                          qualification: doctors?.[0]?.qualification || "MBBS, MD",
                          specialization: doctors?.[0]?.specialization || "General Physician",
                          regNo: doctors?.[0]?.regNo || "XXXXXX",
                          clinicName: doctors?.[0]?.clinicName || "Clinic Name",
                          address: doctors?.[0]?.address || "Clinic Address",
                          phoneNumber: doctors?.[0]?.phoneNumber || "+91 XXXXXXXXXX",
                          clinicNumber: doctors?.[0]?.clinicNumber || "+91 XXXXXXXXXX"
                        }}
                      />
                    )}
{/* 11. NEW: Internal Notes */}
                      <InternalNotesSection 
                        patient={patient}
                        data={data}
                        handleInputChange={handleInputChange}
                        isLocked={isConsultationLocked}
                      />
                    <div className="consultation-actions">
                      <button
                        className="action-btn cancel-btn"
                        onClick={() => setExpandedAppointment(null)}
                      >
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        Cancel
                      </button>
                      <button
                          className="action-btn complete-btn"
                          onClick={() => handleMarkComplete(patient)}
                          disabled={isConsultationLocked || savingAppointmentId === patient.appointmentId}
                          style={{
                            opacity:
                              isConsultationLocked || savingAppointmentId === patient.appointmentId
                                ? 0.6
                                : 1,
                            cursor:
                              isConsultationLocked || savingAppointmentId === patient.appointmentId
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          {savingAppointmentId === patient.appointmentId ? (
    <>
                          <span className="spinner" /> Saving...
                            </>
                          ) : isConsultationLocked ? (
                            "Completed"
                          ) : (
                            "Mark Complete"
                          )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>
      )}

      {/* ── Backend pagination — All tab ── */}
      {filterStatus === 'all' && allTabTotalPages > 1 && (
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => loadAllTab(allTabPage - 1, searchTerm)}
            disabled={allTabPage === 0 || allTabLoading}
          >
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }}>
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Previous
          </button>

          <span style={{ padding: '0 1rem', fontSize: 14, color: '#64748b', alignSelf: 'center' }}>
            Page {allTabPage + 1} of {allTabTotalPages}
          </span>

          <button
            className="pagination-btn"
            onClick={() => loadAllTab(allTabPage + 1, searchTerm)}
            disabled={allTabPage + 1 >= allTabTotalPages || allTabLoading}
          >
            Next
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }}>
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* ── Frontend pagination — Active / Completed tabs ── */}
      {filterStatus !== 'all' && filteredPatients.length > patientsPerPage && (
          <div className="pagination-controls">
            <button 
              className="pagination-btn" 
              onClick={prevPage}
              disabled={patientCurrentPage === 1}
            >
              <svg viewBox="0 0 24 24" fill="none" style={{width: '20px', height: '20px'}}>
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Previous
            </button>
            
            <div className="pagination-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const showPage = 
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= patientCurrentPage - 1 && pageNum <= patientCurrentPage + 1);
                
                const showEllipsis = 
                  (pageNum === 2 && patientCurrentPage > 3) ||
                  (pageNum === totalPages - 1 && patientCurrentPage < totalPages - 2);
                
                if (!showPage && !showEllipsis) return null;
                
                if (showEllipsis) {
                  return <span key={pageNum} className="pagination-ellipsis">...</span>;
                }
                
                return (
                  <button
                    key={pageNum}
                    className={`pagination-number ${patientCurrentPage === pageNum ? 'active' : ''}`}
                    onClick={() => goToPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button 
              className="pagination-btn" 
              onClick={nextPage}
              disabled={patientCurrentPage === totalPages}
            >
              Next
              <svg viewBox="0 0 24 24" fill="none" style={{width: '20px', height: '20px'}}>
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      

      {/* Canvas Note Modal */}
      {showCanvasNote && (
        <CanvasNoteModal
          isVisible={!!showCanvasNote}
          patient={showCanvasNote}
          doctorInfo={{
            name:          doctorsInfo?.name          || 'Dr. Name',
            qualification: doctorsInfo?.qualification || 'MBBS, MD',
            specialization: doctorsInfo?.specialization || 'MBBS, MD',
            regNo:         doctorsInfo?.regNo         || 'XXXXXX',
            clinicName:    doctorsInfo?.clinicName    || 'Clinic Name',
            address:       doctorsInfo?.address       || 'Clinic Address',
            phoneNumber:   doctorsInfo?.phoneNumber   || '+91 XXXXXXXXXX',
            clinicNumber:  doctorsInfo?.clinicNumber   || '+91 XXXXXXXXXX',
          }}
          pastNotes={patientData[showCanvasNote.appointmentId]?.canvasNotes || []}
          savedNote={patientData[showCanvasNote.appointmentId]?.canvasNote  || null}
          onClose={() => setShowCanvasNote(null)}
          onSaveNote={({ imageDataUrl, pdfDataUrl, appointmentId }) => {
            setPatientData(prev => ({
              ...prev,
              [appointmentId]: {
                ...prev[appointmentId],
                canvasNote: {
                  imageDataUrl,
                  pdfDataUrl,
                  createdAt: new Date().toISOString(),
                },
                sendPrescriptionToPatient: true, // ✅ auto-check when canvas note saved
              }
            }));
          }}
        />
      )}

      {/* Walk-in Modal */}
      {showWalkInModal && (
        <AddWalkInModal
          role="DOCTOR"
          lockedDoctorId={doctorId}
          doctorId={doctorId}
          loading={loadingWalkIn}
          initData={walkInInitData}
          onClose={() => setShowWalkInModal(false)}
          onSuccess={onRefreshAppointments}
          todayPatients={todayPatients}
        />
      )}
        {/* Prescription Pad Modal */}
  {showPrescriptionPad && (
    <PrescriptionPad
      patient={showPrescriptionPad}
      data={patientData[showPrescriptionPad.appointmentId] || {}}
      isVisible={!!showPrescriptionPad}
      onClose={() => setShowPrescriptionPad(null)}
      doctorInfo={{
        name: doctorsInfo?.name || "Dr. Name",
        qualification: doctorsInfo?.qualification || "MBBS, MD",
        specialization: doctorsInfo?.specialization || "MBBS, MD",
        regNo: doctorsInfo?.regNo || "XXXXXX",
        clinicName: doctorsInfo?.clinicName || "Clinic Name",
        address: doctorsInfo?.address || "Clinic Address",
        phoneNumber: doctorsInfo?.phoneNumber || "+91 XXXXXXXXXX",
        clinicNumber: doctorsInfo?.clinicNumber || "+91 XXXXXXXXXX"
      }}
    />
  )}

      {toast && (
        <div style={{
          position:'fixed', top:24, left:'50%', transform:'translateX(-50%)',
          zIndex:999999, display:'flex', alignItems:'flex-start', gap:12,
          background:'#fff',
          borderLeft:('4px solid ' + (toast.type==='success'?'#10b981':toast.type==='error'?'#ef4444':'#3b82f6')),
          borderRadius:12, padding:'16px 20px 16px 16px',
          minWidth:320, maxWidth:460,
          boxShadow:'0 12px 40px rgba(0,0,0,0.16)',
          fontFamily:"'Segoe UI',Arial,sans-serif",
          animation:'toastDrop 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <div style={{
            width:38, height:38, borderRadius:'50%', flexShrink:0,
            background:toast.type==='success'?'#f0fdf4':toast.type==='error'?'#fef2f2':'#eff6ff',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:17,
          }}>
            {toast.type==='success' ? '\u2705' : toast.type==='error' ? '\u274c' : '\u2139\ufe0f'}
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontWeight:700, fontSize:14, color:'#0f172a', marginBottom:3}}>{toast.title}</div>
            <div style={{fontSize:13, color:'#64748b', lineHeight:1.5}}>{toast.message}</div>
          </div>
          <button onClick={()=>setToast(null)}
            style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8',
              fontSize:22, padding:'0 0 0 10px', lineHeight:1, flexShrink:0, alignSelf:'flex-start'}}>
            &times;
          </button>
          <style>{`@keyframes toastDrop{from{opacity:0;transform:translateX(-50%) translateY(-20px) scale(0.95)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}`}</style>
        </div>
      )}
    </div>
  );
};

export default PatientList;