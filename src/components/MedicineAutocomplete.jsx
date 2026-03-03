// ─────────────────────────────────────────────────────────────────────────────
// MedicineAutocomplete.jsx
//
// Drop-in replacement for the plain <input> used for medicineName in your
// PrescriptionPad / PatientList form.
//
// USAGE (inside your existing PrescriptionSection):
//
//   import MedicineAutocomplete from './MedicineAutocomplete';
//
//   <MedicineAutocomplete
//     value={med.medicineName}
//     onChange={(name, defaults) => {
//       handlePrescriptionChange(patientId, index, 'medicineName', name);
//       if (defaults) {
//         handlePrescriptionChange(patientId, index, 'dosage',     defaults.dosage);
//         handlePrescriptionChange(patientId, index, 'frequency',  defaults.frequency);
//         handlePrescriptionChange(patientId, index, 'duration',   defaults.duration);
//         handlePrescriptionChange(patientId, index, 'timing',     defaults.timing);
//       }
//     }}
//     disabled={isLocked}
//   />
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── Medicine database ────────────────────────────────────────────────────────
// Each entry: { name, category, defaults: { dosage, frequency, duration, timing } }
// frequency/timing values must match your existing dropdown option values.
const MEDICINE_DB = [
  // ── Analgesics / Antipyretics ──────────────────────────────────────────────
  { name: 'Paracetamol 500mg',      category: 'Analgesic',    defaults: { dosage: '1 tab',  frequency: 'thrice_daily', duration: '5_days',  timing: 'after_food' } },
  { name: 'Paracetamol 650mg',      category: 'Analgesic',    defaults: { dosage: '1 tab',  frequency: 'thrice_daily', duration: '5_days',  timing: 'after_food' } },
  { name: 'Ibuprofen 400mg',        category: 'NSAID',        defaults: { dosage: '1 tab',  frequency: 'thrice_daily', duration: '5_days',  timing: 'after_food' } },
  { name: 'Ibuprofen 600mg',        category: 'NSAID',        defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '5_days',  timing: 'after_food' } },
  { name: 'Diclofenac 50mg',        category: 'NSAID',        defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '5_days',  timing: 'after_food' } },
  { name: 'Mefenamic Acid 500mg',   category: 'NSAID',        defaults: { dosage: '1 cap',  frequency: 'thrice_daily', duration: '3_days',  timing: 'after_food' } },
  { name: 'Aceclofenac 100mg',      category: 'NSAID',        defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '5_days',  timing: 'after_food' } },
  { name: 'Nimesulide 100mg',       category: 'NSAID',        defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '3_days',  timing: 'after_food' } },
  { name: 'Tramadol 50mg',          category: 'Opioid',       defaults: { dosage: '1 cap',  frequency: 'twice_daily',  duration: '3_days',  timing: 'after_food' } },

  // ── Antibiotics ────────────────────────────────────────────────────────────
  { name: 'Amoxicillin 500mg',         category: 'Antibiotic', defaults: { dosage: '1 cap',  frequency: 'thrice_daily', duration: '7_days',  timing: 'after_food' } },
  { name: 'Amoxicillin-Clavulanate 625mg', category: 'Antibiotic', defaults: { dosage: '1 tab', frequency: 'twice_daily', duration: '7_days', timing: 'after_food' } },
  { name: 'Azithromycin 500mg',        category: 'Antibiotic', defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '3_days',  timing: 'after_food' } },
  { name: 'Ciprofloxacin 500mg',       category: 'Antibiotic', defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '7_days',  timing: 'after_food' } },
  { name: 'Doxycycline 100mg',         category: 'Antibiotic', defaults: { dosage: '1 cap',  frequency: 'twice_daily',  duration: '7_days',  timing: 'after_food' } },
  { name: 'Metronidazole 400mg',       category: 'Antibiotic', defaults: { dosage: '1 tab',  frequency: 'thrice_daily', duration: '7_days',  timing: 'after_food' } },
  { name: 'Cephalexin 500mg',          category: 'Antibiotic', defaults: { dosage: '1 cap',  frequency: 'thrice_daily', duration: '7_days',  timing: 'after_food' } },
  { name: 'Cefixime 200mg',            category: 'Antibiotic', defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '7_days',  timing: 'after_food' } },
  { name: 'Levofloxacin 500mg',        category: 'Antibiotic', defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '7_days',  timing: 'after_food' } },
  { name: 'Ofloxacin 200mg',           category: 'Antibiotic', defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '5_days',  timing: 'after_food' } },
  { name: 'Clarithromycin 500mg',      category: 'Antibiotic', defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '7_days',  timing: 'after_food' } },
  { name: 'Clindamycin 300mg',         category: 'Antibiotic', defaults: { dosage: '1 cap',  frequency: 'thrice_daily', duration: '7_days',  timing: 'after_food' } },
  { name: 'Nitrofurantoin 100mg',      category: 'Antibiotic', defaults: { dosage: '1 cap',  frequency: 'twice_daily',  duration: '7_days',  timing: 'after_food' } },
  { name: 'Co-trimoxazole 960mg',      category: 'Antibiotic', defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '7_days',  timing: 'after_food' } },
  { name: 'Tinidazole 500mg',          category: 'Antibiotic', defaults: { dosage: '2 tabs', frequency: 'once_daily',   duration: '3_days',  timing: 'after_food' } },

  // ── Antacids / GI ─────────────────────────────────────────────────────────
  { name: 'Omeprazole 20mg',       category: 'PPI',           defaults: { dosage: '1 cap',  frequency: 'once_daily',   duration: '14_days', timing: 'before_food' } },
  { name: 'Omeprazole 40mg',       category: 'PPI',           defaults: { dosage: '1 cap',  frequency: 'once_daily',   duration: '14_days', timing: 'before_food' } },
  { name: 'Pantoprazole 40mg',     category: 'PPI',           defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '14_days', timing: 'before_food' } },
  { name: 'Rabeprazole 20mg',      category: 'PPI',           defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '14_days', timing: 'before_food' } },
  { name: 'Esomeprazole 40mg',     category: 'PPI',           defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '14_days', timing: 'before_food' } },
  { name: 'Ranitidine 150mg',      category: 'H2 Blocker',    defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '14_days', timing: 'before_food' } },
  { name: 'Domperidone 10mg',      category: 'Antiemetic',    defaults: { dosage: '1 tab',  frequency: 'thrice_daily', duration: '5_days',  timing: 'before_food' } },
  { name: 'Ondansetron 4mg',       category: 'Antiemetic',    defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '3_days',  timing: 'before_food' } },
  { name: 'Ondansetron 8mg',       category: 'Antiemetic',    defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '3_days',  timing: 'before_food' } },
  { name: 'Metoclopramide 10mg',   category: 'Antiemetic',    defaults: { dosage: '1 tab',  frequency: 'thrice_daily', duration: '5_days',  timing: 'before_food' } },
  { name: 'Antacid Syrup',         category: 'Antacid',       defaults: { dosage: '2 tsp',  frequency: 'thrice_daily', duration: '7_days',  timing: 'after_food' } },
  { name: 'Sucralfate 1g',         category: 'Antacid',       defaults: { dosage: '1 tab',  frequency: 'thrice_daily', duration: '14_days', timing: 'before_food' } },
  { name: 'Lactulose Syrup',       category: 'Laxative',      defaults: { dosage: '15ml',   frequency: 'twice_daily',  duration: '7_days',  timing: 'after_food' } },
  { name: 'Ispaghula Husk',        category: 'Laxative',      defaults: { dosage: '1 sachet', frequency: 'once_daily', duration: '14_days', timing: 'after_food' } },
  { name: 'ORS Sachet',            category: 'Rehydration',   defaults: { dosage: '1 sachet in 200ml', frequency: 'four_times', duration: '3_days', timing: 'after_food' } },

  // ── Antihistamines / Allergy ───────────────────────────────────────────────
  { name: 'Cetirizine 10mg',       category: 'Antihistamine', defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '7_days',  timing: 'after_food' } },
  { name: 'Levocetirizine 5mg',    category: 'Antihistamine', defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '7_days',  timing: 'after_food' } },
  { name: 'Fexofenadine 120mg',    category: 'Antihistamine', defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '7_days',  timing: 'before_food' } },
  { name: 'Fexofenadine 180mg',    category: 'Antihistamine', defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '7_days',  timing: 'before_food' } },
  { name: 'Loratadine 10mg',       category: 'Antihistamine', defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '7_days',  timing: 'after_food' } },
  { name: 'Chlorpheniramine 4mg',  category: 'Antihistamine', defaults: { dosage: '1 tab',  frequency: 'thrice_daily', duration: '5_days',  timing: 'after_food' } },
  { name: 'Montelukast 10mg',      category: 'Antileukotriene', defaults: { dosage: '1 tab', frequency: 'once_daily',  duration: '30_days', timing: 'after_food' } },
  { name: 'Montelukast + Levocetirizine', category: 'Antihistamine', defaults: { dosage: '1 tab', frequency: 'once_daily', duration: '14_days', timing: 'after_food' } },

  // ── Respiratory ────────────────────────────────────────────────────────────
  { name: 'Salbutamol 2mg',        category: 'Bronchodilator', defaults: { dosage: '1 tab',  frequency: 'thrice_daily', duration: '7_days',  timing: 'after_food' } },
  { name: 'Salbutamol Inhaler',    category: 'Bronchodilator', defaults: { dosage: '2 puffs', frequency: 'as_needed',   duration: '30_days', timing: 'as_needed' } },
  { name: 'Levosalbutamol 1mg',    category: 'Bronchodilator', defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '7_days',  timing: 'after_food' } },
  { name: 'Budesonide Inhaler',    category: 'Corticosteroid', defaults: { dosage: '2 puffs', frequency: 'twice_daily', duration: '30_days', timing: 'after_food' } },
  { name: 'Fluticasone Inhaler',   category: 'Corticosteroid', defaults: { dosage: '2 puffs', frequency: 'twice_daily', duration: '30_days', timing: 'after_food' } },
  { name: 'Bromhexine 8mg',        category: 'Expectorant',    defaults: { dosage: '1 tab',  frequency: 'thrice_daily', duration: '7_days',  timing: 'after_food' } },
  { name: 'Ambroxol 30mg',         category: 'Expectorant',    defaults: { dosage: '1 tab',  frequency: 'thrice_daily', duration: '7_days',  timing: 'after_food' } },
  { name: 'Dextromethorphan Syrup', category: 'Cough',         defaults: { dosage: '10ml',   frequency: 'thrice_daily', duration: '5_days',  timing: 'after_food' } },
  { name: 'Codeine Linctus',       category: 'Cough',           defaults: { dosage: '10ml',   frequency: 'thrice_daily', duration: '5_days',  timing: 'after_food' } },
  { name: 'Theophylline SR 200mg', category: 'Bronchodilator', defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '30_days', timing: 'after_food' } },
  { name: 'Tiotropium Inhaler',    category: 'Bronchodilator', defaults: { dosage: '1 cap (inhale)', frequency: 'once_daily', duration: '30_days', timing: 'after_food' } },

  // ── Antihypertensives ──────────────────────────────────────────────────────
  { name: 'Amlodipine 5mg',        category: 'CCB',            defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Amlodipine 10mg',       category: 'CCB',            defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Atenolol 50mg',         category: 'Beta-blocker',   defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Metoprolol 25mg',       category: 'Beta-blocker',   defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '30_days', timing: 'after_food' } },
  { name: 'Metoprolol 50mg',       category: 'Beta-blocker',   defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Telmisartan 40mg',      category: 'ARB',            defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Telmisartan 80mg',      category: 'ARB',            defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Losartan 50mg',         category: 'ARB',            defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Ramipril 5mg',          category: 'ACE Inhibitor',  defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Enalapril 5mg',         category: 'ACE Inhibitor',  defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Hydrochlorothiazide 25mg', category: 'Diuretic',   defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Furosemide 40mg',       category: 'Diuretic',       defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Spironolactone 25mg',   category: 'Diuretic',       defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },

  // ── Diabetes ───────────────────────────────────────────────────────────────
  { name: 'Metformin 500mg',       category: 'Antidiabetic',   defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '30_days', timing: 'after_food' } },
  { name: 'Metformin 1000mg',      category: 'Antidiabetic',   defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '30_days', timing: 'after_food' } },
  { name: 'Glibenclamide 5mg',     category: 'Antidiabetic',   defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'before_food' } },
  { name: 'Glipizide 5mg',         category: 'Antidiabetic',   defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '30_days', timing: 'before_food' } },
  { name: 'Glimepiride 1mg',       category: 'Antidiabetic',   defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'before_food' } },
  { name: 'Glimepiride 2mg',       category: 'Antidiabetic',   defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'before_food' } },
  { name: 'Sitagliptin 100mg',     category: 'Antidiabetic',   defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Teneligliptin 20mg',    category: 'Antidiabetic',   defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'before_food' } },
  { name: 'Empagliflozin 10mg',    category: 'Antidiabetic',   defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Dapagliflozin 10mg',    category: 'Antidiabetic',   defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Voglibose 0.3mg',       category: 'Antidiabetic',   defaults: { dosage: '1 tab',  frequency: 'thrice_daily', duration: '30_days', timing: 'before_food' } },

  // ── Vitamins / Supplements ─────────────────────────────────────────────────
  { name: 'Vitamin D3 60000 IU',   category: 'Supplement',     defaults: { dosage: '1 cap',  frequency: 'once_daily',   duration: '14_days', timing: 'after_food' } },
  { name: 'Vitamin D3 1000 IU',    category: 'Supplement',     defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Vitamin B12 500mcg',    category: 'Supplement',     defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Methylcobalamin 500mcg', category: 'Supplement',    defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Folic Acid 5mg',        category: 'Supplement',     defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Iron + Folic Acid',     category: 'Supplement',     defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Calcium + Vitamin D3',  category: 'Supplement',     defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '30_days', timing: 'after_food' } },
  { name: 'Zinc 50mg',             category: 'Supplement',     defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '14_days', timing: 'after_food' } },
  { name: 'Multivitamin',          category: 'Supplement',     defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Omega-3 Fatty Acids',   category: 'Supplement',     defaults: { dosage: '1 cap',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },

  // ── Thyroid ────────────────────────────────────────────────────────────────
  { name: 'Levothyroxine 25mcg',   category: 'Thyroid',        defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'empty_stomach' } },
  { name: 'Levothyroxine 50mcg',   category: 'Thyroid',        defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'empty_stomach' } },
  { name: 'Levothyroxine 100mcg',  category: 'Thyroid',        defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'empty_stomach' } },
  { name: 'Carbimazole 5mg',       category: 'Thyroid',        defaults: { dosage: '1 tab',  frequency: 'thrice_daily', duration: '30_days', timing: 'after_food' } },

  // ── Lipid-lowering ─────────────────────────────────────────────────────────
  { name: 'Atorvastatin 10mg',     category: 'Statin',         defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Atorvastatin 20mg',     category: 'Statin',         defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Atorvastatin 40mg',     category: 'Statin',         defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Rosuvastatin 10mg',     category: 'Statin',         defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Rosuvastatin 20mg',     category: 'Statin',         defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Fenofibrate 160mg',     category: 'Fibrate',        defaults: { dosage: '1 cap',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },

  // ── Antifungal ────────────────────────────────────────────────────────────
  { name: 'Fluconazole 150mg',     category: 'Antifungal',     defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '7_days',  timing: 'after_food' } },
  { name: 'Itraconazole 200mg',    category: 'Antifungal',     defaults: { dosage: '1 cap',  frequency: 'once_daily',   duration: '14_days', timing: 'after_food' } },
  { name: 'Clotrimazole Cream',    category: 'Antifungal',     defaults: { dosage: 'Apply thin layer', frequency: 'twice_daily', duration: '14_days', timing: 'after_food' } },
  { name: 'Terbinafine 250mg',     category: 'Antifungal',     defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '14_days', timing: 'after_food' } },

  // ── Corticosteroids ────────────────────────────────────────────────────────
  { name: 'Prednisolone 5mg',      category: 'Corticosteroid', defaults: { dosage: '2 tabs', frequency: 'once_daily',   duration: '5_days',  timing: 'after_food' } },
  { name: 'Prednisolone 10mg',     category: 'Corticosteroid', defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '5_days',  timing: 'after_food' } },
  { name: 'Methylprednisolone 4mg',category: 'Corticosteroid', defaults: { dosage: '2 tabs', frequency: 'once_daily',   duration: '5_days',  timing: 'after_food' } },
  { name: 'Dexamethasone 0.5mg',   category: 'Corticosteroid', defaults: { dosage: '2 tabs', frequency: 'once_daily',   duration: '5_days',  timing: 'after_food' } },
  { name: 'Betamethasone Cream',   category: 'Corticosteroid', defaults: { dosage: 'Apply thin layer', frequency: 'twice_daily', duration: '7_days', timing: 'after_food' } },

  // ── Psychiatric / Neuro ───────────────────────────────────────────────────
  { name: 'Alprazolam 0.25mg',     category: 'Anxiolytic',     defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '7_days',  timing: 'after_food' } },
  { name: 'Clonazepam 0.5mg',      category: 'Anxiolytic',     defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '14_days', timing: 'after_food' } },
  { name: 'Escitalopram 10mg',     category: 'Antidepressant', defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Sertraline 50mg',       category: 'Antidepressant', defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Amitriptyline 10mg',    category: 'Antidepressant', defaults: { dosage: '1 tab',  frequency: 'once_daily',   duration: '30_days', timing: 'after_food' } },
  { name: 'Gabapentin 300mg',      category: 'Neuropathic',    defaults: { dosage: '1 cap',  frequency: 'thrice_daily', duration: '30_days', timing: 'after_food' } },
  { name: 'Pregabalin 75mg',       category: 'Neuropathic',    defaults: { dosage: '1 cap',  frequency: 'twice_daily',  duration: '30_days', timing: 'after_food' } },
  { name: 'Phenytoin 100mg',       category: 'Anticonvulsant', defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '30_days', timing: 'after_food' } },
  { name: 'Valproate 500mg',       category: 'Anticonvulsant', defaults: { dosage: '1 tab',  frequency: 'twice_daily',  duration: '30_days', timing: 'after_food' } },

  // ── Topical / Eye / Ear ───────────────────────────────────────────────────
  { name: 'Ciprofloxacin Eye Drops',  category: 'Ophthalmic',  defaults: { dosage: '1-2 drops', frequency: 'four_times', duration: '7_days', timing: 'after_food' } },
  { name: 'Moxifloxacin Eye Drops',   category: 'Ophthalmic',  defaults: { dosage: '1 drop',    frequency: 'thrice_daily', duration: '7_days', timing: 'after_food' } },
  { name: 'Olopatadine Eye Drops',    category: 'Ophthalmic',  defaults: { dosage: '1-2 drops', frequency: 'twice_daily',  duration: '14_days', timing: 'after_food' } },
  { name: 'Ciprofloxacin Ear Drops',  category: 'Otic',        defaults: { dosage: '3-4 drops', frequency: 'twice_daily',  duration: '7_days', timing: 'after_food' } },
  { name: 'Waxsol Ear Drops',         category: 'Otic',        defaults: { dosage: '4 drops',   frequency: 'once_daily',   duration: '3_days', timing: 'after_food' } },
  { name: 'Mupirocin Ointment',       category: 'Topical',     defaults: { dosage: 'Apply thin layer', frequency: 'thrice_daily', duration: '7_days', timing: 'after_food' } },
  { name: 'Clindamycin Gel',          category: 'Topical',     defaults: { dosage: 'Apply thin layer', frequency: 'twice_daily',  duration: '14_days', timing: 'after_food' } },
];

// Category color map
const CATEGORY_COLORS = {
  'Analgesic':      '#ef4444',
  'NSAID':          '#f97316',
  'Opioid':         '#dc2626',
  'Antibiotic':     '#8b5cf6',
  'PPI':            '#0ea5e9',
  'H2 Blocker':     '#0ea5e9',
  'Antiemetic':     '#06b6d4',
  'Antacid':        '#06b6d4',
  'Laxative':       '#84cc16',
  'Rehydration':    '#84cc16',
  'Antihistamine':  '#f59e0b',
  'Antileukotriene':'#f59e0b',
  'Bronchodilator': '#10b981',
  'Expectorant':    '#10b981',
  'Cough':          '#10b981',
  'Corticosteroid': '#ec4899',
  'CCB':            '#3b82f6',
  'Beta-blocker':   '#3b82f6',
  'ARB':            '#3b82f6',
  'ACE Inhibitor':  '#3b82f6',
  'Diuretic':       '#6366f1',
  'Antidiabetic':   '#14b8a6',
  'Supplement':     '#a3e635',
  'Thyroid':        '#fb923c',
  'Statin':         '#a855f7',
  'Fibrate':        '#a855f7',
  'Antifungal':     '#d946ef',
  'Anxiolytic':     '#64748b',
  'Antidepressant': '#64748b',
  'Neuropathic':    '#64748b',
  'Anticonvulsant': '#64748b',
  'Ophthalmic':     '#0284c7',
  'Otic':           '#0284c7',
  'Topical':        '#78716c',
};

// ─── Component ────────────────────────────────────────────────────────────────
const MedicineAutocomplete = ({ value, onChange, disabled, placeholder }) => {
  const [query, setQuery]         = useState(value || '');
  const [open, setOpen]           = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [showAutoFillBadge, setShowAutoFillBadge] = useState(false);
  const containerRef = useRef(null);
  const inputRef     = useRef(null);

  // Keep internal query in sync if parent changes value (e.g. template applied)
  useEffect(() => { setQuery(value || ''); }, [value]);

  const results = query.trim().length >= 1
    ? MEDICINE_DB.filter(m =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.category.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectMedicine = useCallback((med) => {
    setQuery(med.name);
    setOpen(false);
    setHighlighted(0);
    setShowAutoFillBadge(true);
    setTimeout(() => setShowAutoFillBadge(false), 2500);
    // Pass name + defaults to parent
    onChange(med.name, med.defaults);
  }, [onChange]);

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectMedicine(results[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          className="medicine-name-input"
          placeholder={placeholder || 'e.g., Paracetamol  (type to search 150+ medicines)'}
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlighted(0);
            // If user manually types (not selecting), pass raw value without defaults
            onChange(e.target.value, null);
          }}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          style={{ paddingRight: 70 }}
        />

        {/* Search icon + badge */}
        <div style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none'
        }}>
          {showAutoFillBadge && (
            <span style={{
              fontSize: 10, fontWeight: 700, background: '#10b981', color: '#fff',
              padding: '2px 7px', borderRadius: 20, letterSpacing: 0.5,
              animation: 'fadeInPop 0.2s ease'
            }}>
              ✓ Auto-filled
            </span>
          )}
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ opacity: 0.4 }}>
            <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
          maxHeight: 320, overflowY: 'auto'
        }}>
          <div style={{ padding: '6px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
            {results.length} match{results.length !== 1 ? 'es' : ''} · ↑↓ navigate · Enter to select
          </div>
          {results.map((med, idx) => {
            const color = CATEGORY_COLORS[med.category] || '#6366f1';
            const isActive = idx === highlighted;
            return (
              <div
                key={med.name}
                onMouseEnter={() => setHighlighted(idx)}
                onMouseDown={() => selectMedicine(med)}
                style={{
                  padding: '9px 14px',
                  cursor: 'pointer',
                  background: isActive ? '#eff6ff' : '#fff',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'background 0.1s'
                }}
              >
                {/* Category dot */}
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1e293b' }}>{med.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                    {med.defaults.dosage} · {med.defaults.frequency.replace(/_/g, ' ')} · {med.defaults.duration.replace(/_/g, ' ')}
                  </div>
                </div>

                {/* Category badge */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: color + '18', color: color, flexShrink: 0, letterSpacing: 0.4
                }}>
                  {med.category}
                </span>

                {isActive && (
                  <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>Auto-fill →</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeInPop {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default MedicineAutocomplete;
export { MEDICINE_DB };