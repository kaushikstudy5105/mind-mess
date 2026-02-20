"""
PharmaGuard — VCF v4.2 Parser (Pure Python)

Parses authentic VCF files, extracts pharmacogenomic variants for the
6 target genes:  CYP2D6, CYP2C19, CYP2C9, SLCO1B1, TPMT, DPYD.

Uses pure Python instead of cyvcf2 for Windows compatibility.
"""
from __future__ import annotations
import re
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field

from app.config import settings


# ── Known pharmacogenomic variant catalog ─────────────────────────
# Maps rsID → (gene, star_allele, functional_impact)
PHARMACO_VARIANT_DB: Dict[str, Tuple[str, str, str]] = {
    # CYP2D6
    "rs3892097":  ("CYP2D6",  "*4",  "no_function"),
    "rs5030655":  ("CYP2D6",  "*6",  "no_function"),
    "rs1065852":  ("CYP2D6",  "*10", "decreased_function"),
    "rs16947":    ("CYP2D6",  "*2",  "normal_function"),
    "rs1135840":  ("CYP2D6",  "*2",  "normal_function"),
    "rs28371725": ("CYP2D6",  "*41", "decreased_function"),
    "rs35742686": ("CYP2D6",  "*3",  "no_function"),
    # CYP2C19
    "rs4244285":  ("CYP2C19", "*2",  "no_function"),
    "rs4986893":  ("CYP2C19", "*3",  "no_function"),
    "rs12248560": ("CYP2C19", "*17", "increased_function"),
    "rs28399504": ("CYP2C19", "*4",  "no_function"),
    # CYP2C9
    "rs1799853":  ("CYP2C9",  "*2",  "decreased_function"),
    "rs1057910":  ("CYP2C9",  "*3",  "decreased_function"),
    "rs56165452": ("CYP2C9",  "*5",  "decreased_function"),
    "rs7900194":  ("CYP2C9",  "*8",  "decreased_function"),
    "rs28371686": ("CYP2C9",  "*11", "decreased_function"),
    # SLCO1B1
    "rs4149056":  ("SLCO1B1", "*5",  "decreased_function"),
    "rs2306283":  ("SLCO1B1", "*1B", "normal_function"),
    "rs4149015":  ("SLCO1B1", "*15", "decreased_function"),
    # TPMT
    "rs1800462":  ("TPMT",    "*2",  "no_function"),
    "rs1800460":  ("TPMT",    "*3B", "no_function"),
    "rs1142345":  ("TPMT",    "*3C", "no_function"),
    # DPYD
    "rs3918290":  ("DPYD",    "*2A", "no_function"),
    "rs55886062": ("DPYD",    "*13", "no_function"),
    "rs67376798": ("DPYD",    "D949V","decreased_function"),
    "rs75017182": ("DPYD",    "c.1129-5923C>G", "decreased_function"),
}

# Gene → chromosome mapping for validation
GENE_CHROMOSOMES: Dict[str, str] = {
    "CYP2D6":  "22",
    "CYP2C19": "10",
    "CYP2C9":  "10",
    "SLCO1B1": "12",
    "TPMT":    "6",
    "DPYD":    "1",
}


@dataclass
class ParsedVariant:
    """Single parsed VCF variant relevant to pharmacogenomics."""
    rsid: str
    chromosome: str
    position: int
    ref: str
    alt: str
    genotype: str
    gene: str
    star_allele: str
    impact: str
    quality: float = 0.0


@dataclass
class VCFParseResult:
    """Full result of VCF parsing."""
    is_valid: bool = True
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    sample_id: Optional[str] = None
    total_variants: int = 0
    pharmacogene_variants: List[ParsedVariant] = field(default_factory=list)
    gene_variants: Dict[str, List[ParsedVariant]] = field(default_factory=dict)


def validate_vcf_header(lines: List[str]) -> Tuple[bool, List[str], List[str]]:
    """Validate VCF v4.2 header structure."""
    errors = []
    warnings = []

    if not lines:
        errors.append("Empty VCF file")
        return False, errors, warnings

    # Check version
    first_line = lines[0].strip()
    if not first_line.startswith("##fileformat=VCF"):
        errors.append("Invalid VCF file: missing ##fileformat header")
        return False, errors, warnings

    version_match = re.search(r"VCFv?(\d+\.?\d*)", first_line)
    if version_match:
        version = version_match.group(1)
        if not version.startswith("4"):
            warnings.append(f"VCF version {version} detected; v4.2 expected")
    else:
        warnings.append("Could not determine VCF version")

    # Find #CHROM header
    has_chrom_header = False
    for line in lines:
        if line.startswith("#CHROM"):
            has_chrom_header = True
            cols = line.strip().split("\t")
            if len(cols) < 10:
                warnings.append("No sample genotype column detected")
            break

    if not has_chrom_header:
        errors.append("Missing #CHROM header line")
        return False, errors, warnings

    return True, errors, warnings


def _parse_genotype(gt_field: str, ref: str, alt: str) -> str:
    """Parse GT field from VCF genotype column into readable format."""
    # Extract GT from potentially complex FORMAT field
    gt = gt_field.split(":")[0]  # GT is always first

    alleles_map = {
        "0": ref,
        ".": ".",
    }
    # Handle multi-allelic
    alt_alleles = alt.split(",")
    for i, a in enumerate(alt_alleles):
        alleles_map[str(i + 1)] = a

    # Parse separator (/ = unphased, | = phased)
    separator = "|" if "|" in gt else "/"
    indices = re.split(r"[/|]", gt)

    called = []
    for idx in indices:
        called.append(alleles_map.get(idx, "?"))

    return "/".join(called)


def _extract_info_field(info_str: str, key: str) -> Optional[str]:
    """Extract a specific key=value from VCF INFO field."""
    for part in info_str.split(";"):
        if "=" in part:
            k, v = part.split("=", 1)
            if k.upper() == key.upper():
                return v
        elif part.upper() == key.upper():
            return "true"  # flag
    return None


def parse_vcf(content: str, max_size_mb: int = 5) -> VCFParseResult:
    """
    Parse a VCF v4.2 file content string.

    Extracts pharmacogenomic variants by matching:
        1. RS tags in INFO field
        2. Known rsIDs in the ID column
        3. GENE tags in INFO field
    """
    result = VCFParseResult()

    # Size check
    size_mb = len(content.encode("utf-8")) / (1024 * 1024)
    if size_mb > max_size_mb:
        result.is_valid = False
        result.errors.append(f"File size {size_mb:.1f}MB exceeds {max_size_mb}MB limit")
        return result

    lines = content.strip().split("\n")

    # Validate header
    is_valid, errors, warnings = validate_vcf_header(lines)
    result.errors.extend(errors)
    result.warnings.extend(warnings)
    if not is_valid:
        result.is_valid = False
        return result

    # Find column header and sample name
    header_idx = 0
    for i, line in enumerate(lines):
        if line.startswith("#CHROM"):
            header_idx = i
            cols = line.strip().split("\t")
            if len(cols) >= 10:
                result.sample_id = cols[9]
            break

    # Parse data lines
    for line in lines[header_idx + 1:]:
        if line.startswith("#") or not line.strip():
            continue

        cols = line.strip().split("\t")
        if len(cols) < 8:
            continue

        result.total_variants += 1

        chrom = cols[0].replace("chr", "")
        pos = int(cols[1])
        var_id = cols[2]
        ref = cols[3]
        alt = cols[4]
        qual = float(cols[5]) if cols[5] != "." else 0.0
        info = cols[7] if len(cols) > 7 else ""

        # Parse genotype if available
        genotype = "."
        if len(cols) >= 10:
            genotype = _parse_genotype(cols[9], ref, alt)

        # ── Strategy 1: Match by known rsID in ID column ──
        rsids_in_id = [x for x in var_id.split(";") if x.startswith("rs")]

        # ── Strategy 2: Match by RS tag in INFO field ──
        rs_info = _extract_info_field(info, "RS")
        if rs_info:
            rs_tag = f"rs{rs_info}" if not rs_info.startswith("rs") else rs_info
            if rs_tag not in rsids_in_id:
                rsids_in_id.append(rs_tag)

        # ── Strategy 3: Match by GENE tag in INFO ──
        gene_info = _extract_info_field(info, "GENE")
        star_info = _extract_info_field(info, "STAR")

        for rsid in rsids_in_id:
            if rsid in PHARMACO_VARIANT_DB:
                gene, star, impact = PHARMACO_VARIANT_DB[rsid]
                pv = ParsedVariant(
                    rsid=rsid,
                    chromosome=f"chr{chrom}",
                    position=pos,
                    ref=ref,
                    alt=alt,
                    genotype=genotype,
                    gene=gene,
                    star_allele=star,
                    impact=impact,
                    quality=qual,
                )
                result.pharmacogene_variants.append(pv)
                result.gene_variants.setdefault(gene, []).append(pv)

        # If GENE tag points to a target gene but no rsID match, still record
        if gene_info and gene_info.upper() in [g.upper() for g in settings.SUPPORTED_GENES]:
            matched_gene = gene_info.upper()
            already = any(v.position == pos and v.chromosome == f"chr{chrom}"
                          for v in result.pharmacogene_variants)
            if not already:
                pv = ParsedVariant(
                    rsid=var_id if var_id != "." else f"chr{chrom}:{pos}",
                    chromosome=f"chr{chrom}",
                    position=pos,
                    ref=ref,
                    alt=alt,
                    genotype=genotype,
                    gene=matched_gene,
                    star_allele=star_info or "unknown",
                    impact="unknown",
                    quality=qual,
                )
                result.pharmacogene_variants.append(pv)
                result.gene_variants.setdefault(matched_gene, []).append(pv)

    if not result.pharmacogene_variants:
        result.warnings.append("No pharmacogenomic variants detected in the uploaded VCF")

    return result
