// ─────────────────────────────────────────────────────────────────────────────
// QuickTemplates.jsx  (v3 — full DB-backed custom templates)
//
// USAGE in PatientList.jsx:
//
//   import QuickTemplates from './QuickTemplates';
//
//   <QuickTemplates
//     currentData={data}
//     doctorId={doctorId}
//     onApply={(templateData) => {
//       setPatientData(prev => ({
//         ...prev,
//         [patient.appointmentId]: {
//           ...prev[patient.appointmentId],
//           ...templateData,
//         }
//       }));
//     }}
//     isLocked={isConsultationLocked}
//   />
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/apiConfig';

// ─── Built-in templates (hardcoded, never go to DB) ──────────────────────────
const BUILTIN_TEMPLATES = [
  {
    id: 'fever', label: 'Fever', emoji: '🌡️', color: '#ef4444', builtin: true,
    data: {
      chiefComplaint: 'Fever', diagnosis: 'Viral fever',
      dietaryAdvice: 'Light diet, plenty of fluids, avoid oily/spicy food',
      lifestyleAdvice: 'Rest for 3-5 days, avoid strenuous activity',
      generalAdvice: 'Monitor temperature every 4-6 hours. Return if fever >103°F or lasts more than 5 days.',
      prescriptions: [
        { medicineName: 'Paracetamol 650mg', dosage: '1 tab', frequency: 'thrice_daily', duration: '5_days', timing: 'after_food', notes: 'Only when temp >100°F' },
        { medicineName: 'Cetirizine 10mg',   dosage: '1 tab', frequency: 'once_daily',   duration: '5_days', timing: 'after_food', notes: '' },
        { medicineName: 'Vitamin C 500mg',   dosage: '1 tab', frequency: 'once_daily',   duration: '7_days', timing: 'after_food', notes: '' },
      ],
    },
  },
  {
    id: 'cold_cough', label: 'Cold & Cough', emoji: '🤧', color: '#3b82f6', builtin: true,
    data: {
      chiefComplaint: 'Cold, cough and runny nose', diagnosis: 'URTI',
      dietaryAdvice: 'Warm fluids, honey + ginger tea, avoid cold drinks',
      lifestyleAdvice: 'Steam inhalation twice daily, adequate rest',
      generalAdvice: 'Gargle with warm salt water. Return if breathlessness.',
      prescriptions: [
        { medicineName: 'Paracetamol 500mg',      dosage: '1 tab', frequency: 'thrice_daily', duration: '5_days', timing: 'after_food', notes: '' },
        { medicineName: 'Levocetirizine 5mg',      dosage: '1 tab', frequency: 'once_daily',   duration: '7_days', timing: 'after_food', notes: '' },
        { medicineName: 'Ambroxol 30mg',           dosage: '1 tab', frequency: 'thrice_daily', duration: '5_days', timing: 'after_food', notes: '' },
        { medicineName: 'Dextromethorphan Syrup',  dosage: '10ml',  frequency: 'thrice_daily', duration: '5_days', timing: 'after_food', notes: 'At bedtime' },
      ],
    },
  },
  {
    id: 'throat', label: 'Sore Throat', emoji: '😮', color: '#f97316', builtin: true,
    data: {
      chiefComplaint: 'Sore throat and difficulty swallowing', diagnosis: 'Acute pharyngitis / Tonsillitis',
      dietaryAdvice: 'Warm liquids, soft food, avoid cold drinks',
      lifestyleAdvice: 'Gargle with warm salt water 3x daily',
      generalAdvice: 'Complete full course of antibiotics.',
      prescriptions: [
        { medicineName: 'Amoxicillin 500mg',  dosage: '1 cap', frequency: 'thrice_daily', duration: '7_days', timing: 'after_food', notes: '' },
        { medicineName: 'Paracetamol 650mg',  dosage: '1 tab', frequency: 'thrice_daily', duration: '5_days', timing: 'after_food', notes: '' },
        { medicineName: 'Levocetirizine 5mg', dosage: '1 tab', frequency: 'once_daily',   duration: '5_days', timing: 'after_food', notes: '' },
      ],
    },
  },
  {
    id: 'gastritis', label: 'Gastritis', emoji: '🔥', color: '#f59e0b', builtin: true,
    data: {
      chiefComplaint: 'Acidity, heartburn and stomach pain', diagnosis: 'Acute gastritis / GERD',
      dietaryAdvice: 'Avoid spicy, oily food. Eat small frequent meals.',
      lifestyleAdvice: 'Elevate head of bed. Avoid lying down after eating.',
      generalAdvice: 'Take antacid 30 min before meals. Avoid NSAIDs.',
      prescriptions: [
        { medicineName: 'Pantoprazole 40mg', dosage: '1 tab', frequency: 'once_daily',   duration: '14_days', timing: 'before_food', notes: '30 min before breakfast' },
        { medicineName: 'Domperidone 10mg',  dosage: '1 tab', frequency: 'thrice_daily', duration: '7_days',  timing: 'before_food', notes: '' },
        { medicineName: 'Antacid Syrup',     dosage: '2 tsp', frequency: 'thrice_daily', duration: '7_days',  timing: 'after_food',  notes: 'After meals and at bedtime' },
      ],
    },
  },
  {
    id: 'diarrhea', label: 'Diarrhoea', emoji: '💧', color: '#06b6d4', builtin: true,
    data: {
      chiefComplaint: 'Loose stools and stomach cramps', diagnosis: 'Acute gastroenteritis',
      dietaryAdvice: 'ORS frequently. BRAT diet. Avoid dairy and spicy food.',
      lifestyleAdvice: 'Rest. Wash hands frequently.',
      generalAdvice: 'Return if blood in stool, high fever, or unable to keep fluids down.',
      prescriptions: [
        { medicineName: 'ORS Sachet',          dosage: '1 sachet in 200ml', frequency: 'four_times',   duration: '3_days', timing: 'after_food',  notes: 'After each loose stool' },
        { medicineName: 'Metronidazole 400mg', dosage: '1 tab',             frequency: 'thrice_daily', duration: '5_days', timing: 'after_food',  notes: '' },
        { medicineName: 'Ondansetron 4mg',     dosage: '1 tab',             frequency: 'twice_daily',  duration: '3_days', timing: 'before_food', notes: 'For nausea' },
      ],
    },
  },
  {
    id: 'uti', label: 'UTI', emoji: '🏥', color: '#8b5cf6', builtin: true,
    data: {
      chiefComplaint: 'Burning urination and increased frequency', diagnosis: 'Urinary Tract Infection (UTI)',
      dietaryAdvice: 'Drink 2-3 litres of water daily.',
      lifestyleAdvice: 'Void completely when urinating.',
      generalAdvice: 'Complete full antibiotic course. Return if fever or no improvement in 48 hours.',
      prescriptions: [
        { medicineName: 'Nitrofurantoin 100mg', dosage: '1 cap', frequency: 'twice_daily', duration: '7_days', timing: 'after_food', notes: '' },
        { medicineName: 'Levocetirizine 5mg',   dosage: '1 tab', frequency: 'once_daily',  duration: '5_days', timing: 'after_food', notes: '' },
      ],
    },
  },
  {
    id: 'hypertension', label: 'Hypertension', emoji: '❤️', color: '#dc2626', builtin: true,
    data: {
      chiefComplaint: 'High blood pressure', diagnosis: 'Essential hypertension',
      dietaryAdvice: 'Low salt diet (<5g/day). Reduce processed foods.',
      lifestyleAdvice: '30 min exercise daily. Weight management.',
      generalAdvice: 'Monitor BP daily. Do not stop medicines. Follow up in 4 weeks.',
      prescriptions: [
        { medicineName: 'Amlodipine 5mg',   dosage: '1 tab', frequency: 'once_daily', duration: '30_days', timing: 'after_food', notes: '' },
        { medicineName: 'Telmisartan 40mg', dosage: '1 tab', frequency: 'once_daily', duration: '30_days', timing: 'after_food', notes: '' },
      ],
    },
  },
  {
    id: 'diabetes_fu', label: 'Diabetes F/U', emoji: '🩸', color: '#14b8a6', builtin: true,
    data: {
      chiefComplaint: 'Diabetes follow-up', diagnosis: 'Type 2 Diabetes Mellitus - follow up',
      dietaryAdvice: 'Low glycemic diet. Avoid sugar, white rice, maida.',
      lifestyleAdvice: '45 min brisk walk daily. Monitor blood sugar.',
      generalAdvice: 'HbA1c target <7%. Annual eye and foot exam.',
      prescriptions: [
        { medicineName: 'Metformin 500mg', dosage: '1 tab', frequency: 'twice_daily',  duration: '30_days', timing: 'after_food',  notes: '' },
        { medicineName: 'Glimepiride 1mg', dosage: '1 tab', frequency: 'once_daily',   duration: '30_days', timing: 'before_food', notes: 'Before breakfast' },
      ],
    },
  },
  {
    id: 'back_pain', label: 'Back Pain', emoji: '🦴', color: '#78716c', builtin: true,
    data: {
      chiefComplaint: 'Lower back pain', diagnosis: 'Lumbar spondylosis / Mechanical back pain',
      dietaryAdvice: 'Adequate calcium and Vitamin D intake',
      lifestyleAdvice: 'Avoid heavy weights. Hot fomentation twice daily.',
      generalAdvice: 'Avoid bed rest >2 days. Return if leg weakness or numbness.',
      prescriptions: [
        { medicineName: 'Aceclofenac 100mg',   dosage: '1 tab', frequency: 'twice_daily',  duration: '5_days', timing: 'after_food', notes: '' },
        { medicineName: 'Paracetamol 500mg',   dosage: '1 tab', frequency: 'thrice_daily', duration: '5_days', timing: 'after_food', notes: '' },
        { medicineName: 'Vitamin D3 60000 IU', dosage: '1 cap', frequency: 'once_daily',   duration: '7_days', timing: 'after_food', notes: 'Once weekly' },
      ],
    },
  },
  {
    id: 'allergy', label: 'Skin Allergy', emoji: '🌿', color: '#d946ef', builtin: true,
    data: {
      chiefComplaint: 'Skin rash, itching and redness', diagnosis: 'Allergic dermatitis / Urticaria',
      dietaryAdvice: 'Identify and avoid trigger foods.',
      lifestyleAdvice: 'Use mild soap. Wear loose cotton clothing.',
      generalAdvice: 'Avoid scratching. Return if rash spreads or difficulty breathing.',
      prescriptions: [
        { medicineName: 'Levocetirizine 5mg',  dosage: '1 tab',            frequency: 'once_daily',  duration: '14_days', timing: 'after_food', notes: '' },
        { medicineName: 'Montelukast 10mg',    dosage: '1 tab',            frequency: 'once_daily',  duration: '14_days', timing: 'after_food', notes: '' },
        { medicineName: 'Betamethasone Cream', dosage: 'Apply thin layer', frequency: 'twice_daily', duration: '7_days',  timing: 'after_food', notes: 'Affected area only' },
      ],
    },
  },
  {
    id: 'thyroid', label: 'Hypothyroid', emoji: '🦋', color: '#fb923c', builtin: true,
    data: {
      chiefComplaint: 'Fatigue, weight gain, feeling cold', diagnosis: 'Hypothyroidism',
      dietaryAdvice: 'Avoid excess soy products. Iodized salt.',
      lifestyleAdvice: 'Regular exercise. Adequate sleep.',
      generalAdvice: 'Take on empty stomach, 30 min before food. TSH recheck after 6-8 weeks.',
      prescriptions: [
        { medicineName: 'Levothyroxine 50mcg', dosage: '1 tab', frequency: 'once_daily', duration: '30_days', timing: 'empty_stomach', notes: '30 min before breakfast' },
      ],
    },
  },
  {
    id: 'anemia', label: 'Anaemia', emoji: '💊', color: '#a3e635', builtin: true,
    data: {
      chiefComplaint: 'Fatigue, weakness and pallor', diagnosis: 'Iron deficiency anaemia',
      dietaryAdvice: 'Iron-rich foods: leafy vegetables, dates, jaggery. Eat with Vitamin C.',
      lifestyleAdvice: 'Adequate rest.',
      generalAdvice: 'Dark stools are a harmless side effect. Recheck CBC after 8 weeks.',
      prescriptions: [
        { medicineName: 'Iron + Folic Acid',  dosage: '1 tab', frequency: 'once_daily', duration: '30_days', timing: 'after_food', notes: 'With orange juice' },
        { medicineName: 'Vitamin B12 500mcg', dosage: '1 tab', frequency: 'once_daily', duration: '30_days', timing: 'after_food', notes: '' },
      ],
    },
  },
];

// ─── Emoji / colour pickers ───────────────────────────────────────────────────
const EMOJI_OPTIONS = ['💊','🩺','🏥','❤️','🌡️','💉','🩸','🧬','🦷','🦴','👁️','🫁','🫀','🧠','🤒','🤧','😮','🔬','📋','🌿','💧','🔥','⚡','✨','🎯'];
const COLOR_OPTIONS = ['#ef4444','#f97316','#f59e0b','#84cc16','#10b981','#06b6d4','#3b82f6','#8b5cf6','#d946ef','#ec4899','#14b8a6','#78716c','#dc2626','#6366f1'];

// ─── API helpers ──────────────────────────────────────────────────────────────
const api = {
  getAll: (doctorId) =>
    apiFetch(`/doctors/${doctorId}/templates`),

  create: (doctorId, tpl) =>
    apiFetch(`/doctors/${doctorId}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: tpl.label,
        emoji: tpl.emoji,
        color: tpl.color,
        data:  JSON.stringify(tpl.data),
      }),
    }),

  update: (doctorId, id, tpl) =>
    apiFetch(`/doctors/${doctorId}/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: tpl.label,
        emoji: tpl.emoji,
        color: tpl.color,
        data:  JSON.stringify(tpl.data),
      }),
    }),

  delete: (doctorId, id) =>
    apiFetch(`/doctors/${doctorId}/templates/${id}`, { method: 'DELETE' }),
};

// Convert raw DB response → component shape
const fromDb = (dbRow) => ({
  id:      dbRow.id,
  label:   dbRow.label,
  emoji:   dbRow.emoji  || '💊',
  color:   dbRow.color  || '#3b82f6',
  builtin: false,
  data:    typeof dbRow.data === 'string' ? JSON.parse(dbRow.data) : dbRow.data,
});

// ─── Save / Edit Modal ────────────────────────────────────────────────────────
const SaveTemplateModal = ({ currentData, editingTemplate, onSave, onClose }) => {
  const [label,   setLabel]   = useState(editingTemplate?.label || '');
  const [emoji,   setEmoji]   = useState(editingTemplate?.emoji || '💊');
  const [color,   setColor]   = useState(editingTemplate?.color || '#3b82f6');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const prx = (currentData?.prescriptions || []).filter(p => p.medicineName?.trim());

  const handleSave = async () => {
    if (!label.trim())     { setError('Please enter a template name'); return; }
    if (prx.length === 0)  { setError('Add at least one medicine before saving'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        id:    editingTemplate?.id || null,
        label: label.trim(),
        emoji, color,
        data: {
          chiefComplaint:  currentData?.chiefComplaint  || '',
          diagnosis:       currentData?.diagnosis       || '',
          dietaryAdvice:   currentData?.dietaryAdvice   || '',
          lifestyleAdvice: currentData?.lifestyleAdvice || '',
          generalAdvice:   currentData?.generalAdvice   || '',
          warningAdvice:   currentData?.warningAdvice   || '',
          prescriptions:   prx,
        },
      });
    } catch (e) {
      setError(e.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:16, padding:28, width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.22)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <h2 style={{ fontSize:17, fontWeight:700, color:'#1e293b', margin:0 }}>
              {editingTemplate ? '✏️ Edit Template' : '💾 Save as Template'}
            </h2>
            <p style={{ fontSize:12, color:'#94a3b8', margin:'3px 0 0' }}>
              Saved to your account · available on all devices
            </p>
          </div>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', fontSize:22, color:'#94a3b8', padding:'0 4px' }}>×</button>
        </div>

        {/* Name */}
        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>Template Name *</label>
          <input
            autoFocus type="text"
            placeholder="e.g., My Migraine Protocol, Post-surgery Care..."
            value={label}
            onChange={e => { setLabel(e.target.value); setError(''); }}
            style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box' }}
          />
        </div>

        {/* Emoji + Color row */}
        <div style={{ display:'flex', gap:16, marginBottom:16 }}>
          <div style={{ flex:1 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>Icon</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              {EMOJI_OPTIONS.map(e => (
                <button key={e} onClick={() => setEmoji(e)} style={{ width:32, height:32, borderRadius:7, border:('2px solid ' + (emoji===e ? '#6366f1' : '#e2e8f0')), background: emoji===e ? '#eef2ff' : '#fff', cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>{e}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>Colour</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, maxWidth:130 }}>
              {COLOR_OPTIONS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{ width:26, height:26, borderRadius:'50%', background:c, border:('3px solid ' + (color===c ? '#1e293b' : 'transparent')), cursor:'pointer', outline: color===c ? ('2px solid ' + c) : 'none', outlineOffset:2 }} />
              ))}
            </div>
          </div>
        </div>

        {/* Live preview chip */}
        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>Preview</label>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20, border:('1.5px solid ' + color + '40'), background:(color + '12'), color, fontSize:13, fontWeight:600 }}>
            {emoji} {label || 'Template Name'}
          </span>
        </div>

        {/* Medicines snapshot */}
        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>
            Medicines that will be saved ({prx.length})
          </label>
          {prx.length === 0 ? (
            <div style={{ padding:12, background:'#fef9c3', borderRadius:8, fontSize:12, color:'#92400e' }}>
              ⚠️ No medicines in the current form. Add medicines first, then save as template.
            </div>
          ) : (
            <div style={{ background:'#f8fafc', borderRadius:10, padding:'10px 14px' }}>
              {prx.map((p, i) => (
                <div key={i} style={{ fontSize:12, color:'#475569', padding:'4px 0', borderBottom: i < prx.length-1 ? '1px solid #e2e8f0' : 'none' }}>
                  <strong>{i+1}. {p.medicineName}</strong>
                  <span style={{ color:'#94a3b8' }}> · {p.dosage} · {(p.frequency||'').replace(/_/g,' ')} · {(p.duration||'').replace(/_/g,' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Also saves info */}
        {(currentData?.diagnosis || currentData?.chiefComplaint || currentData?.dietaryAdvice) && (
          <div style={{ marginBottom:16, padding:'10px 14px', background:'#f0fdf4', borderRadius:10, fontSize:12, color:'#166534' }}>
            ✓ Also saving: {[
              currentData?.chiefComplaint && 'Chief Complaint',
              currentData?.diagnosis && 'Diagnosis',
              (currentData?.dietaryAdvice || currentData?.generalAdvice) && 'Advice',
            ].filter(Boolean).join(' · ')}
          </div>
        )}

        {error && (
          <div style={{ marginBottom:12, padding:'8px 12px', background:'#fef2f2', borderRadius:8, fontSize:12, color:'#dc2626' }}>
            ❌ {error}
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} disabled={saving} style={{ flex:1, padding:11, borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', color:'#64748b', fontWeight:600, cursor:'pointer', fontSize:13 }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || prx.length === 0} style={{ flex:2, padding:11, borderRadius:8, border:'none', background: (saving || prx.length===0) ? '#94a3b8' : color, color:'#fff', fontWeight:700, cursor: (saving || prx.length===0) ? 'not-allowed' : 'pointer', fontSize:13 }}>
            {saving ? '⏳ Saving...' : '💾 Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main QuickTemplates Component ───────────────────────────────────────────
const QuickTemplates = ({ onApply, isLocked, currentData, doctorId }) => {
  const [customTemplates, setCustomTemplates] = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [expanded,        setExpanded]        = useState(false);
  const [activeTab,       setActiveTab]       = useState('builtin');
  const [confirmTemplate, setConfirmTemplate] = useState(null);
  const [appliedId,       setAppliedId]       = useState(null);
  const [showSaveModal,   setShowSaveModal]   = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteLoading,   setDeleteLoading]   = useState(false);
  const [toast,           setToast]           = useState(null);

  // ── Load custom templates from DB on mount ──────────────────────────────────
  useEffect(() => {
    if (!doctorId) return;
    setLoading(true);
    api.getAll(doctorId)
      .then(rows => setCustomTemplates((rows || []).map(fromDb)))
      .catch(err => console.error('Failed to load templates:', err))
      .finally(() => setLoading(false));
  }, [doctorId]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Apply template ──────────────────────────────────────────────────────────
  const handleApplyConfirm = () => {
    if (!confirmTemplate) return;
    onApply({ ...confirmTemplate.data });
    setAppliedId(confirmTemplate.id);
    setTimeout(() => setAppliedId(null), 2500);
    setConfirmTemplate(null);
  };

  // ── Save / update template to DB ────────────────────────────────────────────
  const handleSaveTemplate = useCallback(async (tpl) => {
    let saved;
    if (tpl.id) {
      // UPDATE existing
      const dbRow = await api.update(doctorId, tpl.id, tpl);
      saved = fromDb(dbRow);
      setCustomTemplates(prev => prev.map(t => t.id === saved.id ? saved : t));
      showToast('Template updated ✓');
    } else {
      // CREATE new
      const dbRow = await api.create(doctorId, tpl);
      saved = fromDb(dbRow);
      setCustomTemplates(prev => [saved, ...prev]);
      showToast('Template saved ✓');
    }
    setShowSaveModal(false);
    setEditingTemplate(null);
    setActiveTab('custom');
  }, [doctorId]);

  // ── Delete template from DB ─────────────────────────────────────────────────
  const handleDelete = useCallback(async (id) => {
    setDeleteLoading(true);
    try {
      await api.delete(doctorId, id);
      setCustomTemplates(prev => prev.filter(t => t.id !== id));
      setDeleteConfirmId(null);
      showToast('Template deleted');
    } catch (e) {
      showToast('Failed to delete template', 'error');
    } finally {
      setDeleteLoading(false);
    }
  }, [doctorId]);

  const list    = activeTab === 'builtin' ? BUILTIN_TEMPLATES : customTemplates;
  const visible = expanded ? list : list.slice(0, 6);

  return (
    <>
      <div style={{ background:'linear-gradient(135deg,#f0f9ff 0%,#fdf4ff 100%)', border:'1.5px dashed #c7d2fe', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M13 10V3L4 14H11V21L20 10H13Z" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontWeight:700, fontSize:13, color:'#4338ca' }}>Quick Templates</span>
            <span style={{ fontSize:10, fontWeight:600, background:'#e0e7ff', color:'#6366f1', padding:'2px 7px', borderRadius:20 }}>
              {BUILTIN_TEMPLATES.length} built-in · {customTemplates.length} custom
            </span>
          </div>

          {/* Save as Template button */}
          {!isLocked && (
            <button
              onClick={() => { setEditingTemplate(null); setShowSaveModal(true); }}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:20, border:'1.5px solid #6366f1', background:'#eef2ff', color:'#4338ca', fontSize:12, fontWeight:700, cursor:'pointer' }}
            >
              <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
                <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16L21 8V19C21 20.1046 20.1046 21 19 21Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M17 21V13H7V21M7 3V8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Save as Template
            </button>
          )}
        </div>

        {/* ── Tab switcher ── */}
        <div style={{ display:'flex', gap:0, marginBottom:12, background:'#e0e7ff', borderRadius:8, padding:3 }}>
          {[
            { key:'builtin', label:'📋 Built-in (' + BUILTIN_TEMPLATES.length + ')' },
            { key:'custom',  label:'⭐ My Templates (' + customTemplates.length + ')' },
          ].map(tab => (
            <button key={tab.key}
              onClick={() => { setActiveTab(tab.key); setExpanded(false); }}
              style={{ flex:1, padding:'7px 10px', borderRadius:6, border:'none', background: activeTab===tab.key ? '#fff' : 'transparent', color: activeTab===tab.key ? '#4338ca' : '#6366f1', fontWeight: activeTab===tab.key ? 700 : 500, fontSize:12, cursor:'pointer', boxShadow: activeTab===tab.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition:'all 0.15s' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Loading state ── */}
        {activeTab === 'custom' && loading && (
          <div style={{ textAlign:'center', padding:'16px 0', color:'#94a3b8', fontSize:13 }}>
            ⏳ Loading your templates...
          </div>
        )}

        {/* ── Empty custom state ── */}
        {activeTab === 'custom' && !loading && customTemplates.length === 0 && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>⭐</div>
            <p style={{ fontSize:13, fontWeight:600, color:'#64748b', margin:'0 0 4px' }}>No custom templates yet</p>
            <p style={{ fontSize:12, color:'#94a3b8', margin:0 }}>
              Fill a patient form and click <strong>"Save as Template"</strong>
            </p>
          </div>
        )}

        {/* ── Template chips ── */}
        {!loading && (activeTab === 'builtin' || customTemplates.length > 0) && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {visible.map(tpl => {
              const isApplied = appliedId === tpl.id;
              return (
                <div key={tpl.id} style={{ display:'inline-flex', alignItems:'center', gap:2 }}>
                  {/* Main chip */}
                  <button
                    onClick={() => !isLocked && setConfirmTemplate(tpl)}
                    disabled={isLocked}
                    title={tpl.data.prescriptions.length + ' medicine(s)'}
                    style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:20, border:('1.5px solid ' + (isApplied ? '#10b981' : tpl.color+'40')), background: isApplied ? '#d1fae5' : (tpl.color+'12'), color: isApplied ? '#065f46' : tpl.color, fontSize:12, fontWeight:600, cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked ? 0.5 : 1, transition:'all 0.15s' }}
                    onMouseEnter={e => { if(!isLocked) e.currentTarget.style.transform='translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform=''; }}
                  >
                    {tpl.emoji} {isApplied ? '✓ Applied!' : tpl.label}
                  </button>

                  {/* Edit + Delete — custom only */}
                  {!tpl.builtin && !isLocked && (
                    <>
                      <button
                        onClick={() => { setEditingTemplate(tpl); setShowSaveModal(true); }}
                        title="Edit template"
                        style={{ width:22, height:22, borderRadius:'50%', border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" width="11" height="11">
                          <path d="M11 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H19C19.5523 21 20 20.5523 20 19V12M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(tpl.id)}
                        title="Delete template"
                        style={{ width:22, height:22, borderRadius:'50%', border:'1px solid #fecaca', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" width="11" height="11">
                          <path d="M3 6H21M8 6V4H16V6M19 6L18 20H6L5 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              );
            })}

            {/* Show more / less */}
            {list.length > 6 && (
              <button onClick={() => setExpanded(e => !e)} style={{ padding:'5px 12px', borderRadius:20, border:'1.5px dashed #cbd5e1', background:'transparent', color:'#94a3b8', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                {expanded ? '↑ Show less' : ('+' + (list.length - 6) + ' more')}
              </button>
            )}
          </div>
        )}

        <p style={{ fontSize:11, color:'#94a3b8', marginTop:10, marginBottom:0 }}>
          {activeTab === 'builtin' ? 'Fills entire prescription in 1 tap · Everything editable after' : 'Your saved prescriptions · Synced to your account · Available on all devices'}
        </p>
      </div>

      {/* ── Apply confirm modal ── */}
      {confirmTemplate && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={() => setConfirmTemplate(null)}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, maxWidth:420, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:32, textAlign:'center', marginBottom:8 }}>{confirmTemplate.emoji}</div>
            <h3 style={{ textAlign:'center', fontSize:16, fontWeight:700, color:'#1e293b', marginBottom:6 }}>
              Apply "{confirmTemplate.label}"?
            </h3>
            <p style={{ textAlign:'center', fontSize:13, color:'#64748b', marginBottom:16 }}>
              Fills <strong>{confirmTemplate.data.prescriptions.length} medicine(s)</strong>
              {confirmTemplate.data.diagnosis ? ', diagnosis' : ''}
              {confirmTemplate.data.dietaryAdvice ? ', advice' : ''}.
              <br/>Everything is editable after applying.
            </p>
            <div style={{ background:'#f8fafc', borderRadius:10, padding:'10px 14px', marginBottom:18 }}>
              {confirmTemplate.data.prescriptions.map((p, i) => (
                <div key={i} style={{ fontSize:12, color:'#475569', padding:'3px 0', borderBottom: i < confirmTemplate.data.prescriptions.length-1 ? '1px solid #e2e8f0' : 'none' }}>
                  <strong>{i+1}. {p.medicineName}</strong> — {p.dosage} · {(p.frequency||'').replace(/_/g,' ')} · {(p.duration||'').replace(/_/g,' ')}
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmTemplate(null)} style={{ flex:1, padding:10, borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', color:'#64748b', fontWeight:600, cursor:'pointer', fontSize:13 }}>Cancel</button>
              <button onClick={handleApplyConfirm} style={{ flex:2, padding:10, borderRadius:8, border:'none', background:confirmTemplate.color, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:13 }}>✓ Apply Template</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteConfirmId && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => !deleteLoading && setDeleteConfirmId(null)}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, maxWidth:340, width:'90%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize:16, fontWeight:700, color:'#1e293b', marginBottom:8 }}>Delete Template?</h3>
            <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>This will permanently remove it from your account.</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setDeleteConfirmId(null)} disabled={deleteLoading} style={{ flex:1, padding:10, borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', color:'#64748b', fontWeight:600, cursor:'pointer', fontSize:13 }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirmId)} disabled={deleteLoading} style={{ flex:1, padding:10, borderRadius:8, border:'none', background:'#ef4444', color:'#fff', fontWeight:700, cursor: deleteLoading ? 'wait' : 'pointer', fontSize:13 }}>
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Save / Edit modal ── */}
      {showSaveModal && (
        <SaveTemplateModal
          currentData={currentData}
          editingTemplate={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => { setShowSaveModal(false); setEditingTemplate(null); }}
        />
      )}

      {/* ── Toast notification ── */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:10001, padding:'12px 20px', borderRadius:10, background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4', border:('1.5px solid ' + (toast.type === 'error' ? '#fca5a5' : '#86efac')), color: toast.type === 'error' ? '#dc2626' : '#166534', fontWeight:600, fontSize:13, boxShadow:'0 4px 16px rgba(0,0,0,0.12)' }}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}
    </>
  );
};

export default QuickTemplates;
export { BUILTIN_TEMPLATES };