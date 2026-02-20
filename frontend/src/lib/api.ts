/**
 * PharmaGuard API Client
 *
 * Connects the frontend to the FastAPI backend for pharmacogenomic analysis.
 * Uses the native fetch API — no extra dependencies needed.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/* ─── Backend response types ─────────────────────────────────── */

export interface DetectedVariant {
    rsid: string;
    chromosome: string;
    position: number;
    genotype: string;
    impact: string;
}

export interface RiskAssessment {
    risk_label: "Safe" | "Adjust Dosage" | "Toxic" | "Ineffective" | "Unknown";
    confidence_score: number;
    severity: "none" | "low" | "moderate" | "high" | "critical";
}

export interface PharmacogenomicProfile {
    primary_gene: string;
    diplotype: string;
    phenotype: "PM" | "IM" | "NM" | "RM" | "URM" | "Unknown";
    detected_variants: DetectedVariant[];
}

export interface ClinicalRecommendation {
    cpic_guideline_reference: string;
    recommended_action: string;
    dose_adjustment: string;
    alternative_drugs: string[];
    monitoring_required: boolean;
}

export interface LLMExplanation {
    summary: string;
    mechanism_of_action: string;
    variant_significance: string;
    dosing_rationale: string;
}

export interface QualityMetrics {
    vcf_parsing_success: boolean;
    variant_match_confidence: number;
    llm_grounded_on_guidelines: boolean;
    processing_time_ms: number;
}

export interface BackendAnalysisResult {
    patient_id: string;
    drug: string;
    timestamp: string;
    risk_assessment: RiskAssessment;
    pharmacogenomic_profile: PharmacogenomicProfile;
    clinical_recommendation: ClinicalRecommendation;
    llm_generated_explanation: LLMExplanation;
    quality_metrics: QualityMetrics;
}

export interface AnalysisResponse {
    results: BackendAnalysisResult[];
    total_drugs_analyzed: number;
    overall_processing_time_ms: number;
}

export interface SupportedDrug {
    name: string;
    primary_gene: string;
}

/* ─── API functions ──────────────────────────────────────────── */

export async function analyzeVCF(
    file: File,
    drugs: string[]
): Promise<AnalysisResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("drugs", drugs.join(","));

    const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
            body.detail || `Analysis failed (HTTP ${res.status})`
        );
    }

    return res.json();
}

export async function getSupportedDrugs(): Promise<SupportedDrug[]> {
    const res = await fetch(`${API_BASE}/api/supported-drugs`);
    if (!res.ok) throw new Error("Failed to fetch supported drugs");
    const data = await res.json();
    return data.drugs;
}

export async function validateVCF(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/validate-vcf`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "VCF validation failed");
    }

    return res.json();
}

export async function healthCheck() {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.json();
}
