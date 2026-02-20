"""
PharmaGuard — Diplotype Resolver & Phenotype Engine

Variant → Star allele → Diplotype (*X/*Y) → Phenotype
Uses CPIC allele function tables for phenotype classification.
"""
from __future__ import annotations
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

from app.services.vcf_parser import ParsedVariant


# ── Allele Function Classifications (CPIC-aligned) ───────────────

ALLELE_FUNCTIONS: Dict[str, Dict[str, str]] = {
    "CYP2D6": {
        "*1":  "normal_function",
        "*2":  "normal_function",
        "*3":  "no_function",
        "*4":  "no_function",
        "*5":  "no_function",
        "*6":  "no_function",
        "*9":  "decreased_function",
        "*10": "decreased_function",
        "*17": "decreased_function",
        "*29": "decreased_function",
        "*41": "decreased_function",
    },
    "CYP2C19": {
        "*1":  "normal_function",
        "*2":  "no_function",
        "*3":  "no_function",
        "*4":  "no_function",
        "*17": "increased_function",
    },
    "CYP2C9": {
        "*1":  "normal_function",
        "*2":  "decreased_function",
        "*3":  "decreased_function",
        "*5":  "decreased_function",
        "*8":  "decreased_function",
        "*11": "decreased_function",
    },
    "SLCO1B1": {
        "*1":  "normal_function",
        "*1A": "normal_function",
        "*1B": "normal_function",
        "*5":  "decreased_function",
        "*15": "decreased_function",
        "*17": "decreased_function",
    },
    "TPMT": {
        "*1":  "normal_function",
        "*2":  "no_function",
        "*3A": "no_function",
        "*3B": "no_function",
        "*3C": "no_function",
    },
    "DPYD": {
        "*1":   "normal_function",
        "*2A":  "no_function",
        "*13":  "no_function",
        "D949V": "decreased_function",
        "c.1129-5923C>G": "decreased_function",
    },
}


# ── Activity Score Weights ────────────────────────────────────────

FUNCTION_SCORES: Dict[str, float] = {
    "normal_function":    1.0,
    "decreased_function": 0.5,
    "no_function":        0.0,
    "increased_function": 1.5,
    "uncertain_function": 0.5,
    "unknown":            0.5,
}


# ── Phenotype Thresholds (Activity Score based) ───────────────────

def _score_to_phenotype(score: float, gene: str) -> str:
    """Convert activity score sum to phenotype string."""
    # Special handling for genes with increased function alleles
    if gene in ("CYP2C19", "CYP2D6"):
        if score >= 2.5:
            return "URM"
        elif score >= 1.75:
            return "RM"
        elif score >= 1.0:
            return "NM"
        elif score >= 0.5:
            return "IM"
        else:
            return "PM"
    else:
        # Standard enzymes / transporters
        if score >= 1.5:
            return "NM"
        elif score >= 1.0:
            return "NM"
        elif score >= 0.5:
            return "IM"
        else:
            return "PM"


@dataclass
class DiplotypePhenotypeResult:
    """Result of diplotype resolution and phenotype assignment."""
    gene: str
    allele1: str
    allele2: str
    diplotype: str  # "*X/*Y"
    allele1_function: str
    allele2_function: str
    activity_score: float
    phenotype: str  # PM, IM, NM, RM, URM, Unknown
    detected_variants: List[ParsedVariant]


def resolve_diplotype(
    gene: str,
    variants: List[ParsedVariant]
) -> DiplotypePhenotypeResult:
    """
    Resolve diplotype and derive phenotype for a given gene from detected
    variants.

    Logic:
    1. Collect unique non-*1 star alleles from detected variants.
    2. If heterozygous genotype: assign variant allele + *1 reference.
    3. If homozygous alt: assign variant allele twice.
    4. If no variant alleles: assign *1/*1 (wildtype).
    5. Calculate activity score and map to phenotype.
    """
    gene_alleles = ALLELE_FUNCTIONS.get(gene, {})

    # Collect variant alleles with function info
    detected_alleles: List[Tuple[str, str]] = []  # (star, function)

    for v in variants:
        star = v.star_allele
        func = gene_alleles.get(star, v.impact if v.impact != "unknown" else "uncertain_function")

        # Determine zygosity from genotype
        gt_parts = v.genotype.split("/")
        is_homozygous_alt = len(gt_parts) == 2 and gt_parts[0] == gt_parts[1] and gt_parts[0] != "."
        is_heterozygous = len(gt_parts) == 2 and gt_parts[0] != gt_parts[1]

        if is_homozygous_alt:
            detected_alleles.append((star, func))
            detected_alleles.append((star, func))
        else:
            detected_alleles.append((star, func))

    # Deduplicate and pick the two most impactful alleles
    if len(detected_alleles) == 0:
        # Wildtype — no variant alleles detected
        allele1 = "*1"
        allele2 = "*1"
        func1 = "normal_function"
        func2 = "normal_function"
    elif len(detected_alleles) == 1:
        # One variant allele + reference *1
        allele1 = detected_alleles[0][0]
        func1 = detected_alleles[0][1]
        allele2 = "*1"
        func2 = "normal_function"
    else:
        # Sort by severity (lowest function score first)
        detected_alleles.sort(key=lambda x: FUNCTION_SCORES.get(x[1], 0.5))
        allele1 = detected_alleles[0][0]
        func1 = detected_alleles[0][1]
        allele2 = detected_alleles[1][0]
        func2 = detected_alleles[1][1]

    # Compute activity score
    score1 = FUNCTION_SCORES.get(func1, 0.5)
    score2 = FUNCTION_SCORES.get(func2, 0.5)
    activity_score = score1 + score2

    # Derive phenotype
    phenotype = _score_to_phenotype(activity_score, gene)

    diplotype = f"{allele1}/{allele2}"

    return DiplotypePhenotypeResult(
        gene=gene,
        allele1=allele1,
        allele2=allele2,
        diplotype=diplotype,
        allele1_function=func1,
        allele2_function=func2,
        activity_score=activity_score,
        phenotype=phenotype,
        detected_variants=variants,
    )
