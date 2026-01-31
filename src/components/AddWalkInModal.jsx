import React, { useState,useEffect  } from 'react';
import '../css/AddWalkInModal.css';
import { apiFetch } from "../services/apiConfig";
const AddWalkInModal = ({ loading, initData = {}, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    doctorId: "",
  appointmentDate: "",
  slot: "",
  patientName: "",
  phoneNumber: "",
  age: "",
  gender: "Male",
  reason: ""
  
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initData?.date) {
        setFormData(prev => ({ ...prev, appointmentDate: initData.date }));
      }
    }, [initData]);
    const doctors = initData?.doctors || [];
  const selectedDoctor = doctors.find(
    d => String(d.doctorId) === String(formData.doctorId)
  );
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Auto-fill doctor name when doctor is selected
    if (field === 'doctorId' && doctors.length > 0) {
      const selectedDoctor = doctors.find(d => String(d.doctorId) === String(value));
      if (selectedDoctor) {
        setFormData(prev => ({ ...prev, doctorName: selectedDoctor.doctorName }));
      }
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.doctorId) {
      newErrors.doctorId = 'Please select a doctor';
    }
    
    if (!formData.patientName.trim()) {
      newErrors.patientName = 'Patient name is required';
    }
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
      newErrors.phoneNumber = 'Invalid phone number';
    }
    
    if (!formData.age || formData.age < 1 || formData.age > 150) {
      newErrors.age = 'Valid age is required';
    }
    
    if (formData.appointmentDate === 'custom' && !formData.customDate) {
      newErrors.customDate = 'Please select a date';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!formData.doctorId || !formData.slot || !formData.patientName) {
      alert("Please fill required fields");
      return;
    }
    const payload = {
        doctorId: Number(formData.doctorId),
        appointmentDate: formData.appointmentDate,
        slot: formData.slot.toUpperCase(),   // 🔥 IMPORTANT
        patientName: formData.patientName,
        phoneNumber: formData.phoneNumber,
        age: Number(formData.age),
        gender: formData.gender,
        reason: formData.reason
      };
    try {
      setSubmitting(true);
      const res = await apiFetch("/appointments/walkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
  
     // if (!res.ok) throw new Error();
  
      alert("Walk-in patient added successfully");
      onSuccess();
    } catch {
      alert("Failed to add walk-in");
    }
    finally {
      setSubmitting(false); // 🔥 STOP LOADING
    }
  };
  
  
//   const handleSubmit = (e) => {
//     e.preventDefault();
    
//     if (validate()) {
//       // Prepare data for submission
//       const submissionData = {
//         ...formData,
//         appointmentDate: formData.appointmentDate === 'custom' 
//           ? formData.customDate 
//           : formData.appointmentDate
//       };
      
//       onSubmit(submissionData);
//     }
//   };

const getAppointmentDateOptions = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    
    return [
      { value: 'today', label: 'Today' },
      { value: 'tomorrow', label: 'Tomorrow' },
      { value: dayAfter.toISOString().split('T')[0], label: 'Day After Tomorrow' },
      { value: 'custom', label: 'Custom Date' }
    ];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Walk-in Patient</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="walkin-form">
          {/* Doctor Selection */}
          <div className="form-group">
            <label className="form-label">
              Doctor *
              <svg viewBox="0 0 24 24" fill="none" className="label-icon">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </label>
            {/* <select
              className={`form-select ${errors.doctorId ? 'error' : ''}`}
              value={formData.doctorId}
              onChange={(e) => handleChange('doctorId', e.target.value)}
            > */}
             <select  className={`form-select ${errors.doctorId ? 'error' : ''}`}
            value={formData.doctorId}
            onChange={e => handleChange("doctorId", e.target.value)}
            >
              <option value="">Select Doctor</option>
              {doctors.map(doc => (
            <option key={doc.doctorId} value={doc.doctorId}>
              {doc.doctorName}
            </option>
          ))}
            </select>
            {errors.doctorId && <span className="error-text">{errors.doctorId}</span>}
          </div>

          {/* Appointment Date */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Appointment Date *
                <svg viewBox="0 0 24 24" fill="none" className="label-icon">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </label>
              <select
                className="form-select"
                value={formData.appointmentDate}
                onChange={(e) => handleChange('appointmentDate', e.target.value)}
              >
                {getAppointmentDateOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.appointmentDate === 'custom' && (
              <div className="form-group">
                <label className="form-label">Select Date *</label>
                <input
                  type="date"
                  className={`form-input ${errors.customDate ? 'error' : ''}`}
                  value={formData.customDate}
                  onChange={(e) => handleChange('customDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.customDate && <span className="error-text">{errors.customDate}</span>}
              </div>
            )}
          </div>

          {/* Slot Selection */}
          <div className="form-group">
            <label className="form-label">
              Slot *
              <svg viewBox="0 0 24 24" fill="none" className="label-icon">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </label>
            <div className="radio-group">
            <label className={`radio-option ${formData.slot === "MORNING" ? "active" : ""} ${!selectedDoctor?.morningAvailable ? "disabled" : ""}`}>
                <input
                type="radio"
                value="MORNING"
                disabled={!selectedDoctor?.morningAvailable}
                checked={formData.slot === "MORNING"}
                onChange={e => handleChange("slot", e.target.value)}
                />
                🌅 Morning  
                {selectedDoctor?.morningAvailable && (
                <span className="radio-time">
                    {selectedDoctor.morningStart} - {selectedDoctor.morningEnd}
                </span>
                )}
            </label>
              <label className={`radio-option ${formData.slot === "EVENING" ? "active" : ""} ${!selectedDoctor?.eveningAvailable ? "disabled" : ""}`}>
                <input
                type="radio"
                value="EVENING"
                disabled={!selectedDoctor?.eveningAvailable}
                checked={formData.slot === "EVENING"}
                onChange={e => handleChange("slot", e.target.value)}
                />
                🌙 Evening  
                {selectedDoctor?.eveningAvailable && (
                <span className="radio-time">
                    {selectedDoctor.eveningStart} - {selectedDoctor.eveningEnd}
                </span>
                )}
            </label>
            </div>
          </div>

          {/* Patient Details */}
          <div className="form-divider">
            <span>Patient Details</span>
          </div>

          <div className="form-group">
            <label className="form-label">
              Patient Name *
              <svg viewBox="0 0 24 24" fill="none" className="label-icon">
                <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </label>
            <input
              type="text"
              className={`form-input ${errors.patientName ? 'error' : ''}`}
              placeholder="Enter patient full name"
              value={formData.patientName}
              onChange={e => setFormData({ ...formData, patientName: e.target.value })}
            />
            {errors.patientName && <span className="error-text">{errors.patientName}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Phone Number *
                <svg viewBox="0 0 24 24" fill="none" className="label-icon">
                  <path d="M22 16.92V19.92C22.0011 20.1985 21.9441 20.4742 21.8325 20.7293C21.7209 20.9845 21.5573 21.2136 21.3521 21.4019C21.1469 21.5901 20.9046 21.7335 20.6407 21.8227C20.3769 21.9119 20.0974 21.9451 19.82 21.92C16.7428 21.5856 13.787 20.5341 11.19 18.85C8.77382 17.3147 6.72533 15.2662 5.18999 12.85C3.49997 10.2412 2.44824 7.27099 2.11999 4.18C2.095 3.90347 2.12787 3.62476 2.21649 3.36162C2.30512 3.09849 2.44756 2.85669 2.63476 2.65162C2.82196 2.44655 3.0498 2.28271 3.30379 2.17052C3.55777 2.05833 3.83233 2.00026 4.10999 2H7.10999C7.5953 1.99522 8.06579 2.16708 8.43376 2.48353C8.80173 2.79999 9.04207 3.23945 9.10999 3.72C9.23662 4.68007 9.47144 5.62273 9.80999 6.53C9.94454 6.88792 9.97366 7.27691 9.8939 7.65088C9.81415 8.02485 9.62886 8.36811 9.35999 8.64L8.08999 9.91C9.51355 12.4135 11.5864 14.4864 14.09 15.91L15.36 14.64C15.6319 14.3711 15.9751 14.1858 16.3491 14.1061C16.7231 14.0263 17.1121 14.0555 17.47 14.19C18.3773 14.5286 19.3199 14.7634 20.28 14.89C20.7658 14.9585 21.2094 15.2032 21.5265 15.5775C21.8437 15.9518 22.0122 16.4296 22 16.92Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </label>
              <input
                type="tel"
                className={`form-input ${errors.phoneNumber ? 'error' : ''}`}
                placeholder="+91 98765 43210"
                value={formData.phoneNumber}
                onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
              {errors.phoneNumber && <span className="error-text">{errors.phoneNumber}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Age *</label>
              <input
                type="number"
                className={`form-input ${errors.age ? 'error' : ''}`}
                placeholder="Age"
                min="1"
                max="150"
                value={formData.age}
                onChange={e => setFormData({ ...formData, age: e.target.value })}
              />
              {errors.age && <span className="error-text">{errors.age}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Gender *</label>
              <select
                className="form-select"
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Reason for Visit
              <svg viewBox="0 0 24 24" fill="none" className="label-icon">
                <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </label>
            <textarea
              className="form-textarea"
              placeholder="Consulting for fever, checkup, etc..."
              rows="3"
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
            />
          </div>

          {/* Submit Buttons */}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                style={{
                  opacity: submitting ? 0.7 : 1,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
             {submitting ? (
                <>
                  <span className="spinner" /> Adding...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  Add Patient
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddWalkInModal;
