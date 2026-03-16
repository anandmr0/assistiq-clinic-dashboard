import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/apiConfig';
import '../css/PatientHistoryPanel.css';

const LIMIT = 5;

const PatientHistoryPanel = ({ patientId, currentAppointmentId,doctorId  }) => {
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [error, setError]       = useState(false);
  const [showAll, setShowAll]   = useState(false);

  useEffect(() => {
    if (!patientId || !doctorId) return;
    setLoading(true);
    setError(false);
    setShowAll(false);
    setExpanded(null);
     apiFetch(`/dashboard/patient/${patientId}/history?doctorId=${doctorId}`)  
      .then(data => {
        console.log("Patient history data:", data);
        const past = (data || []).filter(a => a.id !== currentAppointmentId);
        setHistory(past);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [patientId, currentAppointmentId]);

  // ── Loading ──
  if (loading) return (
    <div className="php-root" onClick={e => e.stopPropagation()}>
      <div className="php-header">
        <span className="php-title-icon">🕐</span>
        <span className="php-title">Previous Visits</span>
      </div>
      <div className="php-loading">
        <div className="php-spinner" />
        <span>Loading history…</span>
      </div>
    </div>
  );

  // ── Error ──
  if (error) return (
    <div className="php-root" onClick={e => e.stopPropagation()}>
      <div className="php-header">
        <span className="php-title-icon">📋</span>
        <span className="php-title">Previous Visits</span>
      </div>
      <div className="php-empty">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
            stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span>Could not load history.</span>
      </div>
    </div>
  );

  // ── First visit ──
  if (history.length === 0) return (
    <div className="php-root" onClick={e => e.stopPropagation()}>
      <div className="php-header">
        <span className="php-title-icon">📋</span>
        <span className="php-title">Previous Visits</span>
        <span className="php-badge php-badge--empty">First visit</span>
      </div>
      <div className="php-empty">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
            stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span>No previous visits found</span>
      </div>
    </div>
  );

  const visibleHistory = showAll ? history : history.slice(0, LIMIT);
  const hiddenCount    = history.length - LIMIT;

  return (
    <div className="php-root" onClick={e => e.stopPropagation()}>

      {/* ── Header ── */}
      <div className="php-header">
        <span className="php-title-icon">📋</span>
        <span className="php-title">Previous Visits</span>
        <span className="php-badge">
          {history.length} visit{history.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Visit list ── */}
      <div className="php-list">
        {visibleHistory.map((visit, idx) => {
          const isOpen        = expanded === idx;
          const hasMeds       = visit.prescriptions?.length > 0;
          const hasTests      = visit.selectedTests?.length > 0;
          const diagnosisText = visit.diagnosis || visit.chiefComplaint || '—';
          const dateStr       = visit.appointmentDate
            ? new Date(visit.appointmentDate).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })
            : '—';

          return (
            <div
              key={visit.id || idx}
              className={`php-visit ${isOpen ? 'php-visit--open' : ''}`}
              style={{ animationDelay: `${idx * 0.04}s` }}
            >
              {/* ── Visit summary row ── */}
              <button
                className="php-visit-row"
                onClick={e => { e.stopPropagation(); setExpanded(isOpen ? null : idx); }}
              >
                {/* Timeline */}
                <div className="php-timeline">
                  <div className={`php-dot php-dot--${getStatusColor(visit.status)}`} />
                  {idx < visibleHistory.length - 1 && <div className="php-line" />}
                </div>

                {/* Main content */}
                <div className="php-visit-main">
                  <div className="php-visit-top">
                    <span className="php-visit-date">{dateStr}</span>
                    <span className={`php-status-chip php-status--${(visit.status || '').toLowerCase()}`}>
                      {visit.status || 'SCHEDULED'}
                    </span>
                    {visit.slot && (
                      <span className="php-slot-chip">
                        {visit.slot === 'MORNING' ? '🌅' : '🌙'} {visit.slot}
                      </span>
                    )}
                  </div>

                  <div className="php-visit-diagnosis">{diagnosisText}</div>

                  <div className="php-visit-pills">
                    {hasMeds && (
                      <span className="php-pill php-pill--med">
                        💊 {visit.prescriptions.length} medicine{visit.prescriptions.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {hasTests && (
                      <span className="php-pill php-pill--test">
                        🧪 {visit.selectedTests.length} test{visit.selectedTests.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {visit.nextVisitDate && (
                      <span className="php-pill php-pill--followup">
                        🗓 Follow-up: {new Date(visit.nextVisitDate).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short',
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Chevron */}
                <svg
                  className={`php-chevron ${isOpen ? 'php-chevron--open' : ''}`}
                  viewBox="0 0 24 24" fill="none"
                >
                  <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>

              {/* ── Expanded detail ── */}
              {isOpen && (
                <div className="php-detail">

                  {/* Vitals */}
                  {hasAnyVital(visit) && (
                    <div className="php-detail-section">
                      <p className="php-detail-label">Vitals</p>
                      <div className="php-vitals-row">
                        {visit.systolicBP && visit.diastolicBP && (
                          <div className="php-vital-chip">
                            <span className="php-vital-val">{visit.systolicBP}/{visit.diastolicBP}</span>
                            <span className="php-vital-unit">mmHg</span>
                          </div>
                        )}
                        {visit.pulseRate && (
                          <div className="php-vital-chip">
                            <span className="php-vital-val">{visit.pulseRate}</span>
                            <span className="php-vital-unit">bpm</span>
                          </div>
                        )}
                        {visit.temperature && (
                          <div className="php-vital-chip">
                            <span className="php-vital-val">{visit.temperature}</span>
                            <span className="php-vital-unit">°F</span>
                          </div>
                        )}
                        {visit.weight && (
                          <div className="php-vital-chip">
                            <span className="php-vital-val">{visit.weight}</span>
                            <span className="php-vital-unit">kg</span>
                          </div>
                        )}
                        {visit.spo2 && (
                          <div className="php-vital-chip">
                            <span className="php-vital-val">{visit.spo2}</span>
                            <span className="php-vital-unit">SpO2%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Symptoms */}
                  {visit.symptoms && (
                    <div className="php-detail-section">
                      <p className="php-detail-label">Symptoms</p>
                      <p className="php-detail-text">{visit.symptoms}</p>
                    </div>
                  )}

                  {/* Diagnosis */}
                  {visit.diagnosis && (
                    <div className="php-detail-section">
                      <p className="php-detail-label">Diagnosis</p>
                      <p className="php-detail-text">{visit.diagnosis}</p>
                    </div>
                  )}

                  {/* Medicines */}
                  {hasMeds && (
                    <div className="php-detail-section">
                      <p className="php-detail-label">Medicines</p>
                      <div className="php-med-list">
                        {visit.prescriptions.map((p, i) => (
                          <div key={i} className="php-med-row">
                            <span className="php-med-name">💊 {p.medicineName}</span>
                            <span className="php-med-detail">
                              {[p.dosage, p.frequency?.replace(/_/g, ' '), p.duration, p.timing?.replace(/_/g, ' ')]
                                .filter(Boolean).join(' · ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tests */}
                  {hasTests && (
                    <div className="php-detail-section">
                      <p className="php-detail-label">Tests Ordered</p>
                      <div className="php-test-list">
                        {visit.selectedTests.map((t, i) => (
                          <span key={i} className="php-test-tag">🧪 {t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {visit.notes && (
                    <div className="php-detail-section">
                      <p className="php-detail-label">Notes</p>
                      <p className="php-detail-text">{visit.notes}</p>
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── View More / Show Less button ── */}
      {history.length > LIMIT && (
        <button
          className="php-view-more"
          onClick={e => {
            e.stopPropagation();
            setShowAll(prev => !prev);
            setExpanded(null);
          }}
        >
          {showAll ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
                <path d="M18 15L12 9L6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Show Less
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              View {hiddenCount} more visit{hiddenCount !== 1 ? 's' : ''}
            </>
          )}
        </button>
      )}

    </div>
  );
};

// ── Helpers ──
const getStatusColor = (status) => {
  const map = { COMPLETED: 'green', CANCELLED: 'red', CONFIRMED: 'teal', SCHEDULED: 'amber' };
  return map[(status || '').toUpperCase()] || 'gray';
};

const hasAnyVital = (v) =>
  v.systolicBP || v.diastolicBP || v.pulseRate || v.temperature || v.weight || v.spo2;

export default PatientHistoryPanel;