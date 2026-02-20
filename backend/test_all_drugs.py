#!/usr/bin/env python3
"""
Test all 6 drugs to showcase the 6-ring visualization
"""
import requests
import json

def test_all_drugs():
    """Test analysis with all 6 supported drugs"""
    
    url = "http://127.0.0.1:8000/api/analyze"
    
    # All 6 supported drugs
    drugs = "CODEINE,WARFARIN,CLOPIDOGREL,SIMVASTATIN,AZATHIOPRINE,FLUOROURACIL"
    
    print("🧪 Testing all 6 drugs for ring visualization...")
    print(f"Drugs: {drugs}")
    
    try:
        with open("test_analysis.vcf", "rb") as f:
            files = {"file": f}
            data = {"drugs": drugs}
            
            print("Sending analysis request...")
            response = requests.post(url, files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Analysis successful!")
                print(f"Total drugs analyzed: {result['total_drugs_analyzed']}")
                print(f"Processing time: {result['overall_processing_time_ms']}ms")
                
                print("\n--- Drug Results ---")
                for i, drug_result in enumerate(result['results'], 1):
                    print(f"{i}. {drug_result['drug']}")
                    print(f"   Risk: {drug_result['risk_assessment']['risk_label']}")
                    print(f"   Gene: {drug_result['pharmacogenomic_profile']['primary_gene']}")
                    print(f"   Phenotype: {drug_result['pharmacogenomic_profile']['phenotype']}")
                    print(f"   Confidence: {drug_result['risk_assessment']['confidence_score']:.0%}")
                    print()
                
                print("🎯 Ready for 6-ring visualization!")
                print("📊 Check the frontend to see the interactive ring chart!")
                
                return True
            else:
                print(f"❌ Analysis failed: {response.status_code}")
                print(f"Error: {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    test_all_drugs()
