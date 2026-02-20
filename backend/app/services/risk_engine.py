"""
PharmaGuard — CPIC-Aligned Risk Prediction Engine

Maps (drug, gene, phenotype) → risk classification.
"""
from __future__ import annotations
from typing import Dict, Tuple, List, Optional
from dataclasses import dataclass

from app.models.schemas import RiskLabel, Severity


# ── CPIC Risk Rules ───────────────────────────────────────────────
# Key: (DRUG, PHENOTYPE) → (RiskLabel, Severity, confidence, action, alternatives, monitoring)

@dataclass
class CPICRule:
    risk_label: RiskLabel
    severity: Severity
    confidence: float
    recommended_action: str
    dose_adjustment: str
    alternative_drugs: List[str]
    monitoring_required: bool
    cpic_url: str


CPIC_RULES: Dict[Tuple[str, str], CPICRule] = {
    # ── CODEINE (CYP2D6) ─────────────────────────────────────────
    ("CODEINE", "URM"): CPICRule(
        risk_label=RiskLabel.TOXIC,
        severity=Severity.CRITICAL,
        confidence=0.95,
        recommended_action="AVOID codeine. Ultra-rapid metabolism converts codeine to morphine at dangerously high levels. Use alternative analgesics.",
        dose_adjustment="Avoid (do not dose)",
        alternative_drugs=["Acetaminophen", "NSAIDs", "Morphine (with dose adjustment)"],
        monitoring_required=True,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-codeine-and-cyp2d6/",
    ),
    ("CODEINE", "RM"): CPICRule(
        risk_label=RiskLabel.ADJUST_DOSAGE,
        severity=Severity.HIGH,
        confidence=0.85,
        recommended_action="Use codeine with caution; consider lower doses or alternative analgesics. Monitor for excessive sedation and respiratory depression.",
        dose_adjustment="Consider lower dose (monitor closely)",
        alternative_drugs=["Acetaminophen", "NSAIDs"],
        monitoring_required=True,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-codeine-and-cyp2d6/",
    ),
    ("CODEINE", "NM"): CPICRule(
        risk_label=RiskLabel.SAFE,
        severity=Severity.NONE,
        confidence=0.95,
        recommended_action="Use codeine per standard prescribing. Normal CYP2D6 metabolism expected.",
        dose_adjustment="",
        alternative_drugs=[],
        monitoring_required=False,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-codeine-and-cyp2d6/",
    ),
    ("CODEINE", "IM"): CPICRule(
        risk_label=RiskLabel.INEFFECTIVE,
        severity=Severity.MODERATE,
        confidence=0.80,
        recommended_action="Reduced conversion of codeine to morphine. Analgesic effect may be diminished. Consider alternative analgesics.",
        dose_adjustment="Avoid / switch (no reliable up-titration)",
        alternative_drugs=["Morphine", "Oxycodone", "NSAIDs"],
        monitoring_required=True,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-codeine-and-cyp2d6/",
    ),
    ("CODEINE", "PM"): CPICRule(
        risk_label=RiskLabel.INEFFECTIVE,
        severity=Severity.HIGH,
        confidence=0.95,
        recommended_action="AVOID codeine. Poor metabolizers cannot convert codeine to active morphine. No analgesic effect expected.",
        dose_adjustment="Avoid (do not dose)",
        alternative_drugs=["Morphine", "Oxycodone", "Hydromorphone"],
        monitoring_required=False,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-codeine-and-cyp2d6/",
    ),

    # ── WARFARIN (CYP2C9) ────────────────────────────────────────
    ("WARFARIN", "NM"): CPICRule(
        risk_label=RiskLabel.SAFE,
        severity=Severity.NONE,
        confidence=0.90,
        recommended_action="Use standard warfarin dosing algorithm. Normal CYP2C9 metabolism.",
        dose_adjustment="",
        alternative_drugs=[],
        monitoring_required=True,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-warfarin-and-cyp2c9-and-vkorc1/",
    ),
    ("WARFARIN", "IM"): CPICRule(
        risk_label=RiskLabel.ADJUST_DOSAGE,
        severity=Severity.MODERATE,
        confidence=0.85,
        recommended_action="Reduce warfarin dose by 25-50%. Decreased CYP2C9 metabolism increases bleeding risk. Frequent INR monitoring required.",
        dose_adjustment="Reduce dose 25–50%",
        alternative_drugs=["DOACs (Rivaroxaban, Apixaban)"],
        monitoring_required=True,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-warfarin-and-cyp2c9-and-vkorc1/",
    ),
    ("WARFARIN", "PM"): CPICRule(
        risk_label=RiskLabel.TOXIC,
        severity=Severity.CRITICAL,
        confidence=0.95,
        recommended_action="Significantly reduce warfarin dose (50-80% reduction) or use alternative anticoagulant. High bleeding risk with standard doses.",
        dose_adjustment="Reduce dose 50–80% (or avoid)",
        alternative_drugs=["Rivaroxaban", "Apixaban", "Edoxaban"],
        monitoring_required=True,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-warfarin-and-cyp2c9-and-vkorc1/",
    ),

    # ── CLOPIDOGREL (CYP2C19) ────────────────────────────────────
    ("CLOPIDOGREL", "URM"): CPICRule(
        risk_label=RiskLabel.SAFE,
        severity=Severity.NONE,
        confidence=0.85,
        recommended_action="Enhanced clopidogrel activation. Standard dosing is appropriate. May have slightly increased bleeding risk.",
        dose_adjustment="",
        alternative_drugs=[],
        monitoring_required=False,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-clopidogrel-and-cyp2c19/",
    ),
    ("CLOPIDOGREL", "RM"): CPICRule(
        risk_label=RiskLabel.SAFE,
        severity=Severity.NONE,
        confidence=0.90,
        recommended_action="Standard clopidogrel dosing. Normal to enhanced bioactivation.",
        dose_adjustment="",
        alternative_drugs=[],
        monitoring_required=False,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-clopidogrel-and-cyp2c19/",
    ),
    ("CLOPIDOGREL", "NM"): CPICRule(
        risk_label=RiskLabel.SAFE,
        severity=Severity.NONE,
        confidence=0.95,
        recommended_action="Use standard clopidogrel dosing. Normal CYP2C19-mediated bioactivation.",
        dose_adjustment="",
        alternative_drugs=[],
        monitoring_required=False,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-clopidogrel-and-cyp2c19/",
    ),
    ("CLOPIDOGREL", "IM"): CPICRule(
        risk_label=RiskLabel.ADJUST_DOSAGE,
        severity=Severity.HIGH,
        confidence=0.90,
        recommended_action="Consider alternative antiplatelet therapy. Reduced clopidogrel activation leads to diminished antiplatelet effect and increased cardiovascular risk.",
        dose_adjustment="Avoid / switch (not dose escalation)",
        alternative_drugs=["Prasugrel", "Ticagrelor"],
        monitoring_required=True,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-clopidogrel-and-cyp2c19/",
    ),
    ("CLOPIDOGREL", "PM"): CPICRule(
        risk_label=RiskLabel.INEFFECTIVE,
        severity=Severity.CRITICAL,
        confidence=0.95,
        recommended_action="AVOID clopidogrel. Poor metabolizers cannot activate the prodrug. Use alternative antiplatelet agent.",
        dose_adjustment="Avoid (do not dose)",
        alternative_drugs=["Prasugrel", "Ticagrelor"],
        monitoring_required=True,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-clopidogrel-and-cyp2c19/",
    ),

    # ── SIMVASTATIN (SLCO1B1) ────────────────────────────────────
    ("SIMVASTATIN", "NM"): CPICRule(
        risk_label=RiskLabel.SAFE,
        severity=Severity.NONE,
        confidence=0.90,
        recommended_action="Use standard simvastatin dose. Normal SLCO1B1 transporter function.",
        dose_adjustment="",
        alternative_drugs=[],
        monitoring_required=False,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-simvastatin-and-slco1b1/",
    ),
    ("SIMVASTATIN", "IM"): CPICRule(
        risk_label=RiskLabel.ADJUST_DOSAGE,
        severity=Severity.MODERATE,
        confidence=0.85,
        recommended_action="Prescribe ≤20mg simvastatin or consider alternative statin. Decreased hepatic uptake increases myopathy risk.",
        dose_adjustment="Max dose ≤20mg",
        alternative_drugs=["Pravastatin", "Rosuvastatin"],
        monitoring_required=True,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-simvastatin-and-slco1b1/",
    ),
    ("SIMVASTATIN", "PM"): CPICRule(
        risk_label=RiskLabel.TOXIC,
        severity=Severity.HIGH,
        confidence=0.90,
        recommended_action="AVOID simvastatin. Use alternative statin (pravastatin/rosuvastatin). High risk of statin-induced myopathy/rhabdomyolysis.",
        dose_adjustment="Avoid (do not dose)",
        alternative_drugs=["Pravastatin", "Rosuvastatin", "Fluvastatin"],
        monitoring_required=True,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-simvastatin-and-slco1b1/",
    ),

    # ── AZATHIOPRINE (TPMT) ──────────────────────────────────────
    ("AZATHIOPRINE", "NM"): CPICRule(
        risk_label=RiskLabel.SAFE,
        severity=Severity.NONE,
        confidence=0.90,
        recommended_action="Use standard azathioprine dosing. Normal TPMT activity.",
        dose_adjustment="",
        alternative_drugs=[],
        monitoring_required=True,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-thiopurines-and-tpmt-and-nudt15/",
    ),
    ("AZATHIOPRINE", "IM"): CPICRule(
        risk_label=RiskLabel.ADJUST_DOSAGE,
        severity=Severity.HIGH,
        confidence=0.90,
        recommended_action="Reduce azathioprine dose by 30-70%. Intermediate TPMT activity increases risk of myelosuppression.",
        dose_adjustment="Reduce dose 30–70%",
        alternative_drugs=["Mycophenolate mofetil"],
        monitoring_required=True,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-thiopurines-and-tpmt-and-nudt15/",
    ),
    ("AZATHIOPRINE", "PM"): CPICRule(
        risk_label=RiskLabel.TOXIC,
        severity=Severity.CRITICAL,
        confidence=0.95,
        recommended_action="AVOID azathioprine or reduce to 10% of standard dose. TPMT-deficient patients accumulate toxic thioguanine nucleotides causing severe myelosuppression.",
        dose_adjustment="Avoid or reduce to ~10% of standard dose",
        alternative_drugs=["Mycophenolate mofetil", "Alternative immunosuppressant"],
        monitoring_required=True,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-thiopurines-and-tpmt-and-nudt15/",
    ),

    # ── FLUOROURACIL (DPYD) ──────────────────────────────────────
    ("FLUOROURACIL", "NM"): CPICRule(
        risk_label=RiskLabel.SAFE,
        severity=Severity.NONE,
        confidence=0.90,
        recommended_action="Use standard 5-FU dosing. Normal DPD activity.",
        dose_adjustment="",
        alternative_drugs=[],
        monitoring_required=True,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-fluoropyrimidines-and-dpyd/",
    ),
    ("FLUOROURACIL", "IM"): CPICRule(
        risk_label=RiskLabel.ADJUST_DOSAGE,
        severity=Severity.HIGH,
        confidence=0.90,
        recommended_action="Reduce 5-FU dose by 25-50%. Intermediate DPD activity increases risk of severe toxicity.",
        dose_adjustment="Reduce dose 25–50%",
        alternative_drugs=["Consider non-fluoropyrimidine regimen"],
        monitoring_required=True,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-fluoropyrimidines-and-dpyd/",
    ),
    ("FLUOROURACIL", "PM"): CPICRule(
        risk_label=RiskLabel.TOXIC,
        severity=Severity.CRITICAL,
        confidence=0.95,
        recommended_action="AVOID fluorouracil and capecitabine. DPD-deficient patients have potentially fatal toxicity with standard doses.",
        dose_adjustment="Avoid (do not dose)",
        alternative_drugs=["Non-fluoropyrimidine chemotherapy regimen"],
        monitoring_required=True,
        cpic_url="https://cpicpgx.org/guidelines/guideline-for-fluoropyrimidines-and-dpyd/",
    ),
}


def predict_risk(drug: str, phenotype: str) -> CPICRule:
    """
    Look up the CPIC risk rule for a drug-phenotype combination.

    Falls back to 'Unknown' risk if no rule matches.
    """
    drug_upper = drug.upper()
    pheno_upper = phenotype.upper()

    key = (drug_upper, pheno_upper)
    if key in CPIC_RULES:
        return CPIC_RULES[key]

    # Fallback: Unknown
    return CPICRule(
        risk_label=RiskLabel.UNKNOWN,
        severity=Severity.LOW,
        confidence=0.30,
        recommended_action=f"No CPIC guideline match for {drug} with {phenotype} phenotype. Clinical judgment required.",
        dose_adjustment="",
        alternative_drugs=[],
        monitoring_required=True,
        cpic_url="https://cpicpgx.org/guidelines/",
    )
