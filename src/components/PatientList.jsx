import React, { useState,useEffect,useMemo   } from 'react';
import '../css/PatientList.css';
import AddWalkInModal from './AddWalkInModal';
import { apiFetch } from "../services/apiConfig";
const PatientList = ({ patients, onPatientSelect,  onRefreshAppointments,
  updatePatientStatus,doctorId,clinicId,doctors = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('confirmed');
  const [expandedAppointment, setExpandedAppointment] = useState(null);
  const [patientData, setPatientData] = useState({});
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInInitData, setWalkInInitData] = useState(null);
  const [savingAppointmentId, setSavingAppointmentId] = useState(null);
  const [loadingWalkIn, setLoadingWalkIn] = useState(false);


  useEffect(() => {
    setExpandedAppointment(null);
  }, [searchTerm, filterStatus]);
  const getEmptyPrescription = () => ({
    medicineName: '',
    dosage: '',
    frequency: 'once_daily',
    duration: '',
    timing: 'after_food',
    notes: ''
  });
  const filteredPatients = patients.filter(patient => {
    const name = patient.name?.toLowerCase() || "";
    const phone = (patient.phoneNumber || "").toString();
  const term = searchTerm.toLowerCase().trim();

  const matchesSearch = name.includes(term) || phone.includes(term);
    let matchesStatus = true;
  
    if (filterStatus === 'confirmed') {
      // Confirmed tab shows CONFIRMED + SCHEDULED
      matchesStatus = ['CONFIRMED', 'SCHEDULED'].includes(patient.status);
    } else if (filterStatus === 'scheduled') {
      matchesStatus = patient.status === 'SCHEDULED';
    } else if(filterStatus === 'completed')
    {
      matchesStatus = patient.status === 'COMPLETED';
    }
    else if (filterStatus === 'all') {
      matchesStatus = true;
    }
  
    return matchesSearch && matchesStatus;
  });
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
      alert("Failed to load doctors");
      setShowWalkInModal(false);
    } finally {
      setLoadingWalkIn(false);
    }
  };
  
  const handleToggleExpand = (patient, e) => {
    e.stopPropagation();
    const isOpening = expandedAppointment !== patient.appointmentId;
    setExpandedAppointment(isOpening ? patient.appointmentId : null);
   
    if (isOpening) {
      setPatientData(prev => ({
        ...prev,
        [patient.patientId]: {
          symptoms: patient.symptoms || "",
          diagnosis: patient.diagnosis || "",
          nextVisitDate: patient.nextVisitDate || "",
          nextVisitNotes: patient.nextVisitNotes || "",
          prescriptions: patient.prescriptions?.length
            ? patient.prescriptions
            : [getEmptyPrescription()]
        }
      }));
    }
  };

  const handleInputChange = (patientId, field, value) => {
    setPatientData(prev => ({
      ...prev,
      [patientId]: {
        ...prev[patientId],
        [field]: value
      }
    }));
    
  };

  const handlePrescriptionChange = (patientId, index, field, value) => {
    setPatientData(prev => {
      const patientInfo = prev[patientId] || {};
      const prescriptions = patientInfo.prescriptions || [getEmptyPrescription()];
      const updatedPrescriptions = [...prescriptions];
      updatedPrescriptions[index] = { ...updatedPrescriptions[index], [field]: value };
      
      return {
        ...prev,
        [patientId]: {
          ...patientInfo,
          prescriptions: updatedPrescriptions
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
  // const loadAppointments = async () => {
  //   const data = await fetchDashboardData(doctorId, clinicId);
  //   setPatients(data.todayPatients);
  // };
  
  // useEffect(() => {
  //   loadAppointments();
  // }, []);
  const handleMarkComplete = async (patient) => {
    const data = patientData[patient.patientId] || {};
    setSavingAppointmentId(patient.appointmentId);
    console.log('Marking complete for:', patient.name);
    console.log('Data:', data);
    const cleanPrescriptions = (data.prescriptions || []).filter(
      (p) =>
        p.medicineName && p.dosage && p.frequency && p.duration && p.timing
    );
    const payload = {
      appointmentId: patient.appointmentId,
      symptoms: data.symptoms || "",
      diagnosis: data.diagnosis || "",
      nextVisitDate: data.nextVisitDate || null,
      nextVisitNotes: data.nextVisitNotes || "",
      prescriptions: cleanPrescriptions,
    };
    
    //alert(`Consultation completed for ${patient.name}!\n\nSymptoms: ${data.symptoms || 'N/A'}\nPrescriptions: ${(data.prescriptions || []).length} medicine(s)\nNext Visit: ${data.nextVisitDate || 'Not set'}`);
    try {
      const res = await apiFetch("/appointments/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
     // if (!res.ok) throw new Error();

      alert("Consultation saved & appointment completed");
      setExpandedAppointment(null);
      setPatientData(prev => ({
      ...prev,
      [patient.patientId]: {}
    }));
    await onRefreshAppointments();
  } catch (err) {
    alert("Failed to save consultation");

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
          <div className="patient-count">
            {filteredPatients.length} Patients
          </div>
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

      {filteredPatients.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <h3>No patients found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="patient-list">
          {filteredPatients.map((patient, index) => {
            const isExpanded = expandedAppointment === patient.appointmentId;
            const data = patientData[patient.patientId] || {};
            const prescriptions = data.prescriptions || [getEmptyPrescription()];
            const isConsultationLocked =
            patient.status === "COMPLETED" || patient.status === "CANCELLED";
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
                    </div>
                    <div className="meta-item">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M8 7V3M16 7V3M4 11H20M5 5H19C20.1046 5 21 5.89543 21 7V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V7C3 5.89543 3.89543 5 5 5Z"
                          stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <span>Appointment Date:{patient.appointmentDate}</span>
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

                {isExpanded && (
                  <div className="patient-expanded-content">
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
                      onChange={(e) => handleInputChange(patient.patientId, 'symptoms', e.target.value)}
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
                      onChange={(e) => handleInputChange(patient.patientId, 'diagnosis', e.target.value)}
                    />
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
                        <button
                          className="add-prescription-btn"
                          onClick={() => addPrescription(patient.patientId)}
                        >
                          <svg viewBox="0 0 24 24" fill="none">
                            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          Add Medicine
                        </button>
                      </div>
                      
                      <div className="prescription-list">
                        {prescriptions.map((prescription, idx) => (
                          <div key={idx} className="prescription-row">
                            <div className="prescription-row-header">
                              <span className="prescription-number">Medicine {idx + 1}</span>
                              {idx > 0 && (
                                <button
                                  className="remove-prescription-btn"
                                  onClick={() => removePrescription(patient.patientId, idx)}
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
                                <input
                                  type="text"
                                  placeholder="e.g., Paracetamol"
                                  value={prescription.medicineName}
                                  onChange={(e) => handlePrescriptionChange(patient.patientId, idx, 'medicineName', e.target.value)}
                                />
                              </div>

                              <div className="form-field">
                                <label>Dosage *</label>
                                <input
                                  type="text"
                                  placeholder="e.g., 1 tab, 5ml"
                                  value={prescription.dosage}
                                  onChange={(e) => handlePrescriptionChange(patient.patientId, idx, 'dosage', e.target.value)}
                                />
                              </div>

                              <div className="form-field">
                                <label>Frequency *</label>
                                <select
                                  value={prescription.frequency}
                                  onChange={(e) => handlePrescriptionChange(patient.patientId, idx, 'frequency', e.target.value)}
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
                                  onChange={(e) => handlePrescriptionChange(patient.patientId, idx, 'duration', e.target.value)}
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
                                  onChange={(e) => handlePrescriptionChange(patient.patientId, idx, 'timing', e.target.value)}
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
                                  onChange={(e) => handlePrescriptionChange(patient.patientId, idx, 'notes', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

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
                          onChange={(e) => handleInputChange(patient.patientId, 'nextVisitDate', e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                        <textarea
                          className="reminder-notes"
                          placeholder="Notes for next visit..."
                          rows="2"
                          value={data.nextVisitNotes || ''}
                          onChange={(e) => handleInputChange(patient.patientId, 'nextVisitNotes', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
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
      )}

      {/* Walk-in Modal */}
      {showWalkInModal && (
        <AddWalkInModal
        loading={loadingWalkIn}
        initData={walkInInitData}
        onClose={() => setShowWalkInModal(false)}
        onSuccess={onRefreshAppointments}
        />
      )}
    </div>
  );
};

export default PatientList;
