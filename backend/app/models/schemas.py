"""
PharmaGuard Pydantic v2 Schemas — Strict JSON output compliance.
"""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from datetime import datetime


# ── Enums ──────────────────────────────────────────────────────────

class RiskLabel(str, Enum):
    SAFE = "Safe"
    ADJUST_DOSAGE = "Adjust Dosage"
    TOXIC = "Toxic"
    INEFFECTIVE = "Ineffective"
    UNKNOWN = "Unknown"


class Severity(str, Enum):
    NONE = "none"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class Phenotype(str, Enum):
    PM = "PM"
    IM = "IM"
    NM = "NM"
    RM = "RM"
    URM = "URM"
    UNKNOWN = "Unknown"


# ── Sub-models ─────────────────────────────────────────────────────

class DetectedVariant(BaseModel):
    rsid: str = Field(..., description="rsID of the variant, e.g. rs1234")
    chromosome: str = Field(..., description="Chromosome, e.g. chr10")
    position: int = Field(..., description="Genomic position")
    genotype: str = Field(..., description="Genotype call, e.g. A/G")
    impact: str = Field(..., description="Functional annotation")


class RiskAssessment(BaseModel):
    risk_label: RiskLabel
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    severity: Severity


class PharmacogenomicProfile(BaseModel):
    primary_gene: str
    diplotype: str = Field(..., description="e.g. *1/*2")
    phenotype: Phenotype
    detected_variants: List[DetectedVariant] = []


class ClinicalRecommendation(BaseModel):
    cpic_guideline_reference: str = ""
    recommended_action: str = ""
    dose_adjustment: str = Field(
        default="",
        description="Optional concise dose adjustment guidance (e.g., 'Reduce dose 25–50%' or 'Max ≤20mg').",
    )
    alternative_drugs: List[str] = []
    monitoring_required: bool = False


class LLMExplanation(BaseModel):
    summary: str = ""
    mechanism_of_action: str = ""
    variant_significance: str = ""
    dosing_rationale: str = ""


class QualityMetrics(BaseModel):
    vcf_parsing_success: bool = True
    variant_match_confidence: float = Field(0.0, ge=0.0, le=1.0)
    llm_grounded_on_guidelines: bool = True
    processing_time_ms: int = 0


# ── Top-level output ──────────────────────────────────────────────

class AnalysisResult(BaseModel):
    """Strict JSON schema for a single drug analysis result."""
    patient_id: str
    drug: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    risk_assessment: RiskAssessment
    pharmacogenomic_profile: PharmacogenomicProfile
    clinical_recommendation: ClinicalRecommendation
    llm_generated_explanation: LLMExplanation
    quality_metrics: QualityMetrics


class AnalysisResponse(BaseModel):
    """Wrapper for multiple drug results."""
    results: List[AnalysisResult]
    total_drugs_analyzed: int
    overall_processing_time_ms: int


# ── Request models ────────────────────────────────────────────────

class AnalysisRequest(BaseModel):
    drugs: List[str] = Field(..., min_length=1, description="List of drug names")


class VCFValidationResult(BaseModel):
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    sample_id: Optional[str] = None
    variant_count: int = 0
    pharmacogene_variants_found: int = 0
