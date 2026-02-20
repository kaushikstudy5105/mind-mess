-- Queries to view saved pharmacogenomic analysis data
-- Run these in your Supabase SQL Editor

-- 1. View all recent analyses (latest first)
SELECT 
    id,
    patient_id,
    drug,
    timestamp,
    risk_label,
    severity,
    confidence_score,
    primary_gene,
    phenotype
FROM patient_analyses 
ORDER BY timestamp DESC 
LIMIT 10;

-- 2. View complete details for a specific analysis
SELECT 
    patient_id,
    drug,
    timestamp,
    risk_label,
    confidence_score,
    severity,
    primary_gene,
    diplotype,
    phenotype,
    detected_variants,
    recommended_action,
    dose_adjustment,
    alternative_drugs,
    monitoring_required,
    cpic_guideline_reference,
    llm_summary,
    llm_mechanism,
    llm_variant_significance,
    llm_dosing_rationale,
    processing_time_ms
FROM patient_analyses 
ORDER BY timestamp DESC 
LIMIT 5;

-- 3. Filter by patient ID
SELECT 
    patient_id,
    drug,
    timestamp,
    risk_label,
    severity,
    phenotype,
    recommended_action,
    llm_summary
FROM patient_analyses 
WHERE patient_id = 'PATIENT_001'  -- Replace with actual patient ID
ORDER BY timestamp DESC;

-- 4. Filter by specific drug
SELECT 
    patient_id,
    timestamp,
    risk_label,
    confidence_score,
    phenotype,
    recommended_action,
    dose_adjustment
FROM patient_analyses 
WHERE drug = 'WARFARIN'  -- Replace with drug name
ORDER BY timestamp DESC;

-- 5. View high-risk cases
SELECT 
    patient_id,
    drug,
    timestamp,
    risk_label,
    severity,
    confidence_score,
    recommended_action,
    llm_summary
FROM patient_analyses 
WHERE risk_label IN ('Toxic', 'Adjust Dosage')
ORDER BY timestamp DESC;

-- 6. Count analyses by drug
SELECT 
    drug,
    COUNT(*) as total_analyses,
    COUNT(DISTINCT patient_id) as unique_patients
FROM patient_analyses 
GROUP BY drug 
ORDER BY total_analyses DESC;

-- 7. Count by risk level
SELECT 
    risk_label,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM patient_analyses), 2) as percentage
FROM patient_analyses 
GROUP BY risk_label 
ORDER BY count DESC;
