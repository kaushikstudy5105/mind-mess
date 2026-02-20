"""
PharmaGuard — LLM Clinical Explanation Service (Gemini 1.5 Pro)

Generates CPIC-grounded clinical explanations with strict guardrails.
"""
from __future__ import annotations
import json
import logging
from typing import Optional

import google.generativeai as genai

from app.config import settings
from app.models.schemas import LLMExplanation

logger = logging.getLogger(__name__)

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)


SYSTEM_PROMPT = """You are PharmaGuard Clinical AI, a pharmacogenomics expert assistant.
You provide CPIC-guideline-grounded clinical explanations for drug-gene interactions.

STRICT RULES:
1. Only reference established CPIC guidelines and published pharmacogenomic evidence.
2. Do NOT speculate or invent drug-gene interactions.
3. Always cite specific rsIDs and their functional impact.
4. Explain the biological mechanism clearly.
5. Include dosing rationale based on the metabolizer phenotype.
6. Use professional clinical language suitable for healthcare providers.
7. Never include raw genomic data or patient identifiers.

You MUST respond with ONLY valid JSON matching this exact schema:
{
  "summary": "Brief 2-3 sentence clinical summary",
  "mechanism_of_action": "How the gene variant affects drug metabolism/transport",
  "variant_significance": "Clinical significance of the detected variants with rsID citations",
  "dosing_rationale": "CPIC-aligned dosing recommendation rationale"
}
"""


def _build_prompt(
    drug: str,
    gene: str,
    diplotype: str,
    phenotype: str,
    variants: list,
    risk_label: str,
    recommended_action: str,
) -> str:
    """Build the clinical explanation prompt."""
    variant_list = ", ".join(
        [f"{v.get('rsid', 'unknown')} ({v.get('genotype', '?')})" for v in variants]
    ) if variants else "No specific variants"

    return f"""Using CPIC guidelines for {drug}, explain how {gene} {diplotype} ({phenotype} phenotype) affects drug metabolism and clinical outcomes.

CONTEXT:
- Drug: {drug}
- Gene: {gene}
- Diplotype: {diplotype}
- Phenotype: {phenotype}
- Risk Classification: {risk_label}
- Detected Variants: {variant_list}
- Recommended Action: {recommended_action}

Provide a thorough clinical explanation including:
1. A concise clinical summary
2. The mechanism of action (how this gene/diplotype affects {drug} metabolism)
3. The clinical significance of the specific variants detected
4. CPIC-aligned dosing rationale for this phenotype

Remember: Respond with ONLY the JSON object. Do not include markdown formatting, code blocks, or any text outside the JSON."""


async def generate_clinical_explanation(
    drug: str,
    gene: str,
    diplotype: str,
    phenotype: str,
    variants: list,
    risk_label: str,
    recommended_action: str,
) -> LLMExplanation:
    """
    Generate a CPIC-grounded clinical explanation using Gemini 1.5 Pro.

    Returns LLMExplanation with fallback on any error.
    """
    try:
        model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                temperature=0.3,
                max_output_tokens=1024,
                response_mime_type="application/json",
            ),
        )

        prompt = _build_prompt(
            drug=drug,
            gene=gene,
            diplotype=diplotype,
            phenotype=phenotype,
            variants=variants,
            risk_label=risk_label,
            recommended_action=recommended_action,
        )

        response = model.generate_content(prompt)

        # Parse JSON response
        text = response.text.strip()
        # Remove possible markdown code fences
        if text.startswith("```"):
            text = text.split("\n", 1)[-1]
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        text = text.strip()

        data = json.loads(text)

        return LLMExplanation(
            summary=data.get("summary", ""),
            mechanism_of_action=data.get("mechanism_of_action", ""),
            variant_significance=data.get("variant_significance", ""),
            dosing_rationale=data.get("dosing_rationale", ""),
        )

    except json.JSONDecodeError as e:
        logger.error(f"LLM returned invalid JSON: {e}")
        return _fallback_explanation(drug, gene, diplotype, phenotype, risk_label)

    except Exception as e:
        logger.error(f"LLM generation failed: {e}")
        return _fallback_explanation(drug, gene, diplotype, phenotype, risk_label)


def _fallback_explanation(
    drug: str, gene: str, diplotype: str, phenotype: str, risk_label: str
) -> LLMExplanation:
    """Provide a deterministic fallback when LLM is unavailable."""
    return LLMExplanation(
        summary=f"Patient's {gene} {diplotype} results in {phenotype} phenotype, "
                f"classifying {drug} risk as {risk_label}.",
        mechanism_of_action=f"{gene} encodes an enzyme/transporter involved in {drug} "
                            f"metabolism. The {diplotype} diplotype alters enzymatic activity.",
        variant_significance=f"The detected {gene} variants indicate {phenotype} status "
                              f"per CPIC allele function tables.",
        dosing_rationale=f"CPIC guidelines recommend action for {phenotype} metabolizers "
                          f"prescribed {drug}. Consult full guideline for specific dosing.",
    )
