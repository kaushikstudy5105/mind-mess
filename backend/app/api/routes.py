"""
PharmaGuard — FastAPI Routes

Endpoints:
  POST /api/analyze       — Full pharmacogenomic analysis
  POST /api/validate-vcf  — Validate VCF file only
  GET  /api/supported-drugs — List supported drugs
  GET  /api/health         — Health check
"""
from __future__ import annotations
import asyncio
import time
import logging
from typing import List
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.config import settings
from app.models.schemas import (
    AnalysisResult, AnalysisResponse, VCFValidationResult,
    RiskAssessment, PharmacogenomicProfile, ClinicalRecommendation,
    LLMExplanation, QualityMetrics, DetectedVariant, Severity, RiskLabel, Phenotype,
)
from app.services.vcf_parser import parse_vcf
from app.services.pharmacogenomics import resolve_diplotype
from app.services.risk_engine import predict_risk
from app.services.llm_service import generate_clinical_explanation
from app.services.supabase_client import save_analysis_result

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["PharmaGuard"])


# ── Health ────────────────────────────────────────────────────────

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


# ── Supported Drugs ──────────────────────────────────────────────

@router.get("/supported-drugs")
async def get_supported_drugs():
    return {
        "drugs": [
            {"name": drug, "primary_gene": gene}
            for drug, gene in settings.SUPPORTED_DRUGS.items()
        ]
    }


# ── Validate VCF ─────────────────────────────────────────────────

@router.post("/validate-vcf", response_model=VCFValidationResult)
async def validate_vcf(file: UploadFile = File(...)):
    """Validate a VCF file without running full analysis."""
    if not file.filename or not file.filename.lower().endswith(".vcf"):
        raise HTTPException(status_code=400, detail="File must be a .vcf file")

    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File is not valid UTF-8 text")

    result = parse_vcf(text, max_size_mb=settings.MAX_VCF_SIZE_MB)

    return VCFValidationResult(
        is_valid=result.is_valid and len(result.errors) == 0,
        errors=result.errors,
        warnings=result.warnings,
        sample_id=result.sample_id,
        variant_count=result.total_variants,
        pharmacogene_variants_found=len(result.pharmacogene_variants),
    )


# ── Helper: analyze a single drug (used by asyncio.gather) ──────

async def _analyze_single_drug(
    drug: str,
    vcf_result,
    patient_id: str,
) -> AnalysisResult:
    """Analyze one drug and return its AnalysisResult."""
    drug_start = time.time()

    gene = settings.SUPPORTED_DRUGS[drug]
    gene_variants = vcf_result.gene_variants.get(gene, [])

    # Resolve diplotype & phenotype
    diplo_result = resolve_diplotype(gene, gene_variants)

    # Predict risk
    risk_rule = predict_risk(drug, diplo_result.phenotype)

    # Build detected variants list for output
    detected = [
        DetectedVariant(
            rsid=v.rsid,
            chromosome=v.chromosome,
            position=v.position,
            genotype=v.genotype,
            impact=v.impact,
        )
        for v in gene_variants
    ]

    # Variant dicts for LLM prompt
    variant_dicts = [
        {"rsid": v.rsid, "genotype": v.genotype, "impact": v.impact}
        for v in gene_variants
    ]

    # Generate LLM explanation
    try:
        llm_explanation = await generate_clinical_explanation(
            drug=drug,
            gene=gene,
            diplotype=diplo_result.diplotype,
            phenotype=diplo_result.phenotype,
            variants=variant_dicts,
            risk_label=risk_rule.risk_label.value,
            recommended_action=risk_rule.recommended_action,
        )
        llm_grounded = True
    except Exception as e:
        logger.error(f"LLM failed for {drug}: {e}")
        llm_explanation = LLMExplanation(
            summary=f"Analysis for {drug} with {gene} {diplo_result.diplotype}.",
            mechanism_of_action="LLM explanation unavailable.",
            variant_significance="See detected variants.",
            dosing_rationale=risk_rule.recommended_action,
        )
        llm_grounded = False

    processing_ms = int((time.time() - drug_start) * 1000)

    # Map phenotype string to enum
    phenotype_map = {
        "PM": Phenotype.PM, "IM": Phenotype.IM, "NM": Phenotype.NM,
        "RM": Phenotype.RM, "URM": Phenotype.URM,
    }
    phenotype_enum = phenotype_map.get(diplo_result.phenotype, Phenotype.UNKNOWN)

    return AnalysisResult(
        patient_id=patient_id,
        drug=drug,
        timestamp=datetime.utcnow().isoformat(),
        risk_assessment=RiskAssessment(
            risk_label=risk_rule.risk_label,
            confidence_score=risk_rule.confidence,
            severity=risk_rule.severity,
        ),
        pharmacogenomic_profile=PharmacogenomicProfile(
            primary_gene=gene,
            diplotype=diplo_result.diplotype,
            phenotype=phenotype_enum,
            detected_variants=detected,
        ),
        clinical_recommendation=ClinicalRecommendation(
            cpic_guideline_reference=risk_rule.cpic_url,
            recommended_action=risk_rule.recommended_action,
            dose_adjustment=risk_rule.dose_adjustment,
            alternative_drugs=risk_rule.alternative_drugs,
            monitoring_required=risk_rule.monitoring_required,
        ),
        llm_generated_explanation=llm_explanation,
        quality_metrics=QualityMetrics(
            vcf_parsing_success=vcf_result.is_valid,
            variant_match_confidence=risk_rule.confidence,
            llm_grounded_on_guidelines=llm_grounded,
            processing_time_ms=processing_ms,
        ),
    )


# ── Full Analysis ────────────────────────────────────────────────

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(
    file: UploadFile = File(...),
    drugs: str = Form(..., description="Comma-separated drug names"),
):
    """
    Full pharmacogenomic risk analysis.

    Accepts a VCF file and comma-separated drug names.
    Returns structured JSON with risk assessment, pharmacogenomic profile,
    clinical recommendations, and LLM-generated explanations for each drug.
    """
    overall_start = time.time()

    # ── Parse drug list ──
    drug_list = [d.strip().upper() for d in drugs.split(",") if d.strip()]
    if not drug_list:
        raise HTTPException(status_code=400, detail="At least one drug name is required")

    # Validate drugs
    unsupported = [d for d in drug_list if d not in settings.SUPPORTED_DRUGS]
    if unsupported:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported drugs: {', '.join(unsupported)}. "
                   f"Supported: {', '.join(settings.SUPPORTED_DRUGS.keys())}",
        )

    # ── Read & parse VCF ──
    if not file.filename or not file.filename.lower().endswith(".vcf"):
        raise HTTPException(status_code=400, detail="File must be a .vcf file")

    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid VCF file encoding")

    vcf_result = parse_vcf(text, max_size_mb=settings.MAX_VCF_SIZE_MB)

    if not vcf_result.is_valid:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid VCF v4.2 file: {'; '.join(vcf_result.errors)}",
        )

    patient_id = vcf_result.sample_id or "PATIENT_001"

    # ── Analyze all drugs in PARALLEL ──
    results: List[AnalysisResult] = await asyncio.gather(
        *[_analyze_single_drug(drug, vcf_result, patient_id) for drug in drug_list]
    )

    # ── Save results to Supabase (non-blocking, parallel) ──
    await asyncio.gather(
        *[save_analysis_result(r.model_dump()) for r in results],
        return_exceptions=True,
    )

    overall_ms = int((time.time() - overall_start) * 1000)

    return AnalysisResponse(
        results=results,
        total_drugs_analyzed=len(results),
        overall_processing_time_ms=overall_ms,
    )
