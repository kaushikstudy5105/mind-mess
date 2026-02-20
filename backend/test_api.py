#!/usr/bin/env python3
"""
Test script to populate Supabase with sample analysis data
"""
import requests
import json

def test_analysis():
    """Test the analysis endpoint with sample VCF data"""
    
    # API endpoint
    url = "http://127.0.0.1:8000/api/analyze"
    
    # Read VCF file
    with open("test_analysis.vcf", "rb") as f:
        files = {"file": f}
        data = {"drugs": "CODEINE,WARFARIN"}
        
        print("Sending analysis request...")
        response = requests.post(url, files=files, data=data)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Analysis successful!")
            print(f"Analyzed {result['total_drugs_analyzed']} drugs")
            print(f"Processing time: {result['overall_processing_time_ms']}ms")
            
            # Show results
            for i, drug_result in enumerate(result['results'], 1):
                print(f"\n--- Drug {i}: {drug_result['drug']} ---")
                print(f"Patient ID: {drug_result['patient_id']}")
                print(f"Risk Label: {drug_result['risk_assessment']['risk_label']}")
                print(f"Severity: {drug_result['risk_assessment']['severity']}")
                print(f"Confidence: {drug_result['risk_assessment']['confidence_score']}")
                print(f"Gene: {drug_result['pharmacogenomic_profile']['primary_gene']}")
                print(f"Phenotype: {drug_result['pharmacogenomic_profile']['phenotype']}")
                
            print("\n🎉 Data should now be saved to Supabase!")
            
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")

if __name__ == "__main__":
    test_analysis()
