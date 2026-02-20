import {
  type AnalysisResponse,
  type BackendAnalysisResult,
} from "@/lib/api";

/* ─── UI-facing types (used by ResultsPanel, Summary, charts) ── */

export interface ToxicityLevel {
  label: string;
  value: number;
  color: string;
  hexColor: string;
}

export interface VariantResult {
  id: string;
  gene: string;
  chromosome: string;
  position: number;
  ref: string;
  alt: string;
  toxicityScore: number;
  classification: "safe" | "low" | "moderate" | "high" | "critical";
  drugInteractions: string[];
  clinicalSignificance: string;
  rsid: string;
}

export interface AnalysisResult {
  fileId: string;
  fileName: string;
  analyzedAt: string;
  totalVariants: number;
  toxicityBreakdown: ToxicityLevel[];
  overallRisk: "safe" | "low" | "moderate" | "high" | "critical";
  variants: VariantResult[];
  summary: {
    safeDrugs: string[];
    cautionDrugs: string[];
    contraindicatedDrugs: string[];
    recommendations: string[];
  };
  rawJson: object;
}

export type AppState = "idle" | "file-selected" | "processing" | "results";

/* ─── Helpers ────────────────────────────────────────────────── */

function severityToClassification(
  severity: string
): "safe" | "low" | "moderate" | "high" | "critical" {
  const map: Record<string, "safe" | "low" | "moderate" | "high" | "critical"> = {
    none: "safe",
    low: "low",
    moderate: "moderate",
    high: "high",
    critical: "critical",
  };
  return map[severity] ?? "moderate";
}

function riskLabelToClassification(
  label: string
): "safe" | "low" | "moderate" | "high" | "critical" {
  const map: Record<string, "safe" | "low" | "moderate" | "high" | "critical"> = {
    Safe: "safe",
    "Adjust Dosage": "moderate",
    Toxic: "critical",
    Ineffective: "high",
    Unknown: "low",
  };
  return map[label] ?? "moderate";
}

function confidenceToToxicityScore(confidence: number): number {
  return Math.round(confidence * 100);
}

/**
 * Transform the backend AnalysisResponse into the UI-facing AnalysisResult
 * shape consumed by ResultsPanel, Summary, charts, etc.
 */
export function transformBackendToUI(
  response: AnalysisResponse,
  fileName: string
): AnalysisResult {
  const results = response.results;

  // Build variant results from each drug's detected variants
  const variants: VariantResult[] = [];
  const seenRsids = new Set<string>();

  results.forEach((r: BackendAnalysisResult) => {
    r.pharmacogenomic_profile.detected_variants.forEach((v, i) => {
      if (seenRsids.has(v.rsid)) return; // de-duplicate
      seenRsids.add(v.rsid);

      const classification = severityToClassification(r.risk_assessment.severity);
      variants.push({
        id: `var-${v.rsid}-${i}`,
        gene: r.pharmacogenomic_profile.primary_gene,
        chromosome: v.chromosome,
        position: v.position,
        ref: v.genotype.split("/")[0] || "?",
        alt: v.genotype.split("/")[1] || "?",
        toxicityScore: confidenceToToxicityScore(r.risk_assessment.confidence_score),
        classification,
        drugInteractions: [r.drug],
        clinicalSignificance: v.impact || "Unknown",
        rsid: v.rsid,
      });
    });
  });

  // Merge drug interactions for same variant across drugs
  const variantMap = new Map<string, VariantResult>();
  variants.forEach((v) => {
    const existing = variantMap.get(v.rsid);
    if (existing) {
      existing.drugInteractions = [
        ...new Set([...existing.drugInteractions, ...v.drugInteractions]),
      ];
    } else {
      variantMap.set(v.rsid, { ...v });
    }
  });
  const mergedVariants = Array.from(variantMap.values());

  // Classify drugs by risk
  const safeDrugs: string[] = [];
  const cautionDrugs: string[] = [];
  const contraindicatedDrugs: string[] = [];
  const recommendations: string[] = [];

  results.forEach((r: BackendAnalysisResult) => {
    const label = r.risk_assessment.risk_label;
    if (label === "Safe") {
      safeDrugs.push(r.drug);
    } else if (label === "Toxic") {
      contraindicatedDrugs.push(r.drug);
    } else {
      cautionDrugs.push(r.drug);
    }
    // Add LLM-generated recommendation
    if (r.llm_generated_explanation?.summary) {
      recommendations.push(
        `**${r.drug}** (${r.pharmacogenomic_profile.primary_gene}): ${r.clinical_recommendation.recommended_action}`
      );
    }
    if (r.clinical_recommendation.dose_adjustment && r.clinical_recommendation.dose_adjustment !== "None") {
      recommendations.push(
        `${r.drug} dosing: ${r.clinical_recommendation.dose_adjustment}`
      );
    }
  });

  // Build toxicity breakdown from classification counts
  const classificationCounts = { safe: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  mergedVariants.forEach((v) => {
    classificationCounts[v.classification]++;
  });

  // If no variants found, create breakdown from drug risk labels instead
  const hasVariants = mergedVariants.length > 0;
  if (!hasVariants) {
    results.forEach((r: BackendAnalysisResult) => {
      const cls = riskLabelToClassification(r.risk_assessment.risk_label);
      classificationCounts[cls]++;
    });
  }

  const toxicityBreakdown: ToxicityLevel[] = [
    { label: "Safe", value: classificationCounts.safe, color: "hsl(142, 71%, 45%)", hexColor: "#22c55e" },
    { label: "Low Risk", value: classificationCounts.low, color: "hsl(88, 60%, 48%)", hexColor: "#84cc16" },
    { label: "Moderate", value: classificationCounts.moderate, color: "hsl(38, 92%, 55%)", hexColor: "#f59e0b" },
    { label: "High Risk", value: classificationCounts.high, color: "hsl(22, 95%, 55%)", hexColor: "#f97316" },
    { label: "Critical", value: classificationCounts.critical, color: "hsl(0, 72%, 55%)", hexColor: "#ef4444" },
  ];

  // Determine overall risk from highest severity
  let overallRisk: "safe" | "low" | "moderate" | "high" | "critical" = "safe";
  const severityOrder = ["safe", "low", "moderate", "high", "critical"] as const;
  results.forEach((r: BackendAnalysisResult) => {
    const cls = riskLabelToClassification(r.risk_assessment.risk_label);
    if (severityOrder.indexOf(cls) > severityOrder.indexOf(overallRisk)) {
      overallRisk = cls;
    }
  });

  const totalVariants = hasVariants
    ? mergedVariants.length
    : results.reduce(
      (sum: number, r: BackendAnalysisResult) =>
        sum + r.pharmacogenomic_profile.detected_variants.length,
      0
    );

  return {
    fileId: `analysis-${Date.now()}`,
    fileName,
    analyzedAt: results[0]?.timestamp || new Date().toISOString(),
    totalVariants: totalVariants || results.length,
    toxicityBreakdown,
    overallRisk,
    variants: mergedVariants,
    summary: {
      safeDrugs,
      cautionDrugs,
      contraindicatedDrugs,
      recommendations,
    },
    rawJson: response,
  };
}
