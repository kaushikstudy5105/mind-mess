#!/usr/bin/env python3
"""
Manual data insertion script for Supabase
Use this to insert test data directly into your Supabase table
"""
import json
from datetime import datetime

# Sample analysis result (from our test)
sample_data = {
    "patient_id": "PATIENT_001",
    "drug": "CODEINE",
    "timestamp": datetime.utcnow().isoformat(),
    "risk_label": "Safe",
    "confidence_score": 0.95,
    "severity": "none",
    "primary_gene": "CYP2D6",
    "diplotype": "*1/*1",
    "phenotype": "NM",
    "detected_variants": [
        {
            "rsid": "rs1065852",
            "chromosome": "22",
            "position": 42129084,
            "genotype": "G/A",
            "impact": "moderate"
        }
    ],
    "recommended_action": "Standard dosing appropriate",
    "dose_adjustment": "",
    "alternative_drugs": [],
    "monitoring_required": False,
    "cpic_guideline_reference": "https://cpicpgx.org/guideline/cyp2d6-and-codeine/",
    "llm_summary": "Patient has normal CYP2D6 metabolism. Standard codeine dosing is appropriate with expected efficacy and safety profile.",
    "llm_mechanism": "Codeine is a prodrug converted to morphine by CYP2D6. Normal metabolizers convert codeine efficiently.",
    "llm_variant_significance": "Detected variants are consistent with normal metabolic activity.",
    "llm_dosing_rationale": "Standard dosing guidelines apply for normal metabolizers.",
    "processing_time_ms": 550
}

# Warfarin sample data
warfarin_data = {
    "patient_id": "PATIENT_001",
    "drug": "WARFARIN",
    "timestamp": datetime.utcnow().isoformat(),
    "risk_label": "Safe",
    "confidence_score": 0.90,
    "severity": "none",
    "primary_gene": "CYP2C9",
    "diplotype": "*1/*1",
    "phenotype": "NM",
    "detected_variants": [
        {
            "rsid": "rs16947",
            "chromosome": "22",
            "position": 42130692,
            "genotype": "A/G",
            "impact": "benign"
        }
    ],
    "recommended_action": "Standard warfarin dosing and monitoring",
    "dose_adjustment": "",
    "alternative_drugs": [],
    "monitoring_required": True,
    "cpic_guideline_reference": "https://cpicpgx.org/guideline/cyp2c9-and-warfarin/",
    "llm_summary": "Patient has normal CYP2C9 metabolism. Standard warfarin dosing protocol with regular INR monitoring is recommended.",
    "llm_mechanism": "Warfarin is metabolized primarily by CYP2C9. Normal metabolizers have expected clearance rates.",
    "llm_variant_significance": "No clinically significant variants affecting warfarin metabolism were detected.",
    "llm_dosing_rationale": "Standard initiation and maintenance dosing protocols apply.",
    "processing_time_ms": 451
}

print("=== Manual Supabase Insert Instructions ===")
print("\n1. Go to your Supabase Dashboard: https://app.supabase.com")
print("2. Select your project: zprrgcjgbqgqrfzlgjwa")
print("3. Click on 'Table Editor'")
print("4. Select the 'patient_analyses' table")
print("5. Click 'Insert row' and paste the following JSON data:")

print("\n--- CODEINE Data ---")
print(json.dumps(sample_data, indent=2))

print("\n--- WARFARIN Data ---")
print(json.dumps(warfarin_data, indent=2))

print("\n=== Alternative: Use SQL Editor ===")
print("You can also run this SQL in the SQL Editor:")

# Generate SQL INSERT statements
for data in [sample_data, warfarin_data]:
    columns = ", ".join([f'"{k}"' for k in data.keys()])
    values = []
    for k, v in data.items():
        if isinstance(v, str):
            values.append(f"'{v}'")
        elif isinstance(v, bool):
            values.append(str(v).lower())
        elif isinstance(v, (list, dict)):
            values.append(f"'{json.dumps(v).replace(\"'\", \"''\")}'::jsonb")
        else:
            values.append(str(v))
    
    sql = f"INSERT INTO patient_analyses ({columns}) VALUES ({', '.join(values)});"
    print(sql)
