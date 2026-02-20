"""
PharmaGuard — Supabase Client Service

Handles storing patient analysis results to Supabase.
Table: patient_analyses
"""
import logging
from typing import Any, Dict
from supabase import create_client, Client

from app.config import settings

logger = logging.getLogger(__name__)

# ── Supabase client singleton ────────────────────────────────────
_supabase: Client | None = None


def get_supabase() -> Client:
    """Return a cached Supabase client (lazy init)."""
    global _supabase
    if _supabase is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Supabase client initialized")
    return _supabase


# ── Insert helpers ───────────────────────────────────────────────

async def save_analysis_result(result_dict: Dict[str, Any]) -> Dict[str, Any] | None:
    """
    Save a single drug-analysis result row to the `patient_analyses` table.

    Expects a flat-ish dict built from AnalysisResult; returns the inserted row
    or None on failure (non-blocking — analysis still succeeds).
    """
    try:
        client = get_supabase()

        row = {
            "patient_id":               result_dict.get("patient_id"),
            "drug":                     result_dict.get("drug"),
            "timestamp":                result_dict.get("timestamp"),
            # Risk assessment
            "risk_label":               result_dict.get("risk_assessment", {}).get("risk_label"),
            "confidence_score":         result_dict.get("risk_assessment", {}).get("confidence_score"),
            "severity":                 result_dict.get("risk_assessment", {}).get("severity"),
            # Pharmacogenomic profile
            "primary_gene":             result_dict.get("pharmacogenomic_profile", {}).get("primary_gene"),
            "diplotype":                result_dict.get("pharmacogenomic_profile", {}).get("diplotype"),
            "phenotype":                result_dict.get("pharmacogenomic_profile", {}).get("phenotype"),
            "detected_variants":        result_dict.get("pharmacogenomic_profile", {}).get("detected_variants", []),
            # Clinical recommendation
            "recommended_action":       result_dict.get("clinical_recommendation", {}).get("recommended_action"),
            "dose_adjustment":          result_dict.get("clinical_recommendation", {}).get("dose_adjustment"),
            "alternative_drugs":        result_dict.get("clinical_recommendation", {}).get("alternative_drugs", []),
            "monitoring_required":      result_dict.get("clinical_recommendation", {}).get("monitoring_required"),
            "cpic_guideline_reference": result_dict.get("clinical_recommendation", {}).get("cpic_guideline_reference"),
            # LLM explanation
            "llm_summary":              result_dict.get("llm_generated_explanation", {}).get("summary"),
            "llm_mechanism":            result_dict.get("llm_generated_explanation", {}).get("mechanism_of_action"),
            "llm_variant_significance": result_dict.get("llm_generated_explanation", {}).get("variant_significance"),
            "llm_dosing_rationale":     result_dict.get("llm_generated_explanation", {}).get("dosing_rationale"),
            # Quality
            "processing_time_ms":       result_dict.get("quality_metrics", {}).get("processing_time_ms"),
        }

        response = client.table("patient_analyses").insert(row).execute()
        logger.info(f"Saved analysis for patient={row['patient_id']}, drug={row['drug']}")
        return response.data[0] if response.data else None

    except Exception as e:
        logger.error(f"Supabase insert failed: {e}")
        return None
