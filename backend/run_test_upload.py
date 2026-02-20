"""
Test script to send a VCF file to the running backend and verify Supabase integration.
Assumes backend is running on http://localhost:8000.
"""
import requests
import os

API_URL = "http://localhost:8000/api/analyze"
VCF_FILE = "test_analysis.vcf"

def run_test():
    if not os.path.exists(VCF_FILE):
        print(f"Error: {VCF_FILE} not found. Run previous step to create it.")
        return

    print(f"Sending {VCF_FILE} to {API_URL}...")
    
    with open(VCF_FILE, "rb") as f:
        files = {"file": (VCF_FILE, f, "text/plain")}
        data = {"drugs": "CODEINE"}
        
        try:
            response = requests.post(API_URL, files=files, data=data)
            
            if response.status_code == 200:
                print("\n✅ Analysis Success!")
                result = response.json()
                print(f"Drugs Analyzed: {result['total_drugs_analyzed']}")
                
                # Check results
                for res in result['results']:
                    print(f"\nDrug: {res['drug']}")
                    print(f"Risk: {res['risk_assessment']['risk_label']}")
                    print(f"Gene: {res['pharmacogenomic_profile']['primary_gene']}")
                    print(f"Diplotype: {res['pharmacogenomic_profile']['diplotype']}")
                
                print("\nIf Supabase is integrated, check your 'patient_analyses' table for a new row!")
            else:
                print(f"\n❌ Error {response.status_code}: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print(f"\n❌ Connection Error: Is the backend running on port 8000?")
            print("Run: uvicorn app.main:app --reload")

if __name__ == "__main__":
    run_test()
