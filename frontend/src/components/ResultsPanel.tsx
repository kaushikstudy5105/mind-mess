import { useNavigate } from "react-router-dom";
import { AnalysisResult } from "@/types/pharma";
import type { AnalysisResponse, BackendAnalysisResult } from "@/lib/api";
import ToxicityDonutChart from "./ToxicityDonutChart";
import VariantTable from "./VariantTable";
import JsonViewer from "./JsonViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  Activity,
  Dna,
  Pill,
  FileText,
  ArrowRight,
  Clock,
  Beaker,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ResultsPanelProps {
  result: AnalysisResult;
}

/* ─── Risk styling helpers ─────────────────────────────── */

const riskConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof ShieldCheck }> = {
  Safe: { label: "Safe", color: "text-tox-safe", bg: "bg-tox-safe/10", border: "border-tox-safe/30", icon: ShieldCheck },
  "Adjust Dosage": { label: "Adjust Dosage", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", icon: AlertTriangle },
  Toxic: { label: "Toxic", color: "text-tox-critical", bg: "bg-tox-critical/10", border: "border-tox-critical/30", icon: ShieldX },
  Ineffective: { label: "Ineffective", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30", icon: ShieldAlert },
  Unknown: { label: "Unknown", color: "text-muted-foreground", bg: "bg-secondary", border: "border-border", icon: ShieldAlert },
};

function getRiskConfig(label: string) {
  return riskConfig[label] || riskConfig.Unknown;
}

const severityColors: Record<string, string> = {
  none: "text-tox-safe",
  low: "text-lime-400",
  moderate: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-tox-critical",
};

const RISK_COLORS_RAW: Record<string, string> = {
  safe: "hsl(142, 71%, 45%)",
  low: "hsl(88, 60%, 48%)",
  moderate: "hsl(38, 92%, 55%)",
  high: "hsl(22, 95%, 55%)",
  critical: "hsl(0, 72%, 55%)",
};

/* ─── Individual Drug Card ─────────────────────────────── */

function DrugResultCard({ drug }: { drug: BackendAnalysisResult }) {
  const [expanded, setExpanded] = useState(false);
  const risk = getRiskConfig(drug.risk_assessment.risk_label);
  const RiskIcon = risk.icon;
  const profile = drug.pharmacogenomic_profile;
  const rec = drug.clinical_recommendation;
  const llm = drug.llm_generated_explanation;
  const sevColor = severityColors[drug.risk_assessment.severity] || "text-muted-foreground";

  return (
    <div
      className={cn(
        "rounded-2xl p-px transition-all duration-300",
        expanded ? "ring-1 ring-primary/20" : ""
      )}
      style={{
        background: `linear-gradient(135deg, ${drug.risk_assessment.risk_label === "Safe"
            ? "hsl(142 71% 45% / 0.3)"
            : drug.risk_assessment.risk_label === "Toxic"
              ? "hsl(0 72% 55% / 0.3)"
              : "hsl(38 92% 55% / 0.2)"
          }, hsl(222 35% 20%))`,
      }}
    >
      <div className="gradient-card rounded-2xl overflow-hidden">
        {/* Card header — always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
        >
          <div className={cn("p-2.5 rounded-xl border", risk.bg, risk.border)}>
            <RiskIcon className={cn("w-5 h-5", risk.color)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground text-lg">{drug.drug}</h3>
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", risk.bg, risk.border, risk.color)}>
                {risk.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Dna className="w-3 h-3" />
                {profile.primary_gene}
              </span>
              <span>·</span>
              <span>{profile.diplotype}</span>
              <span>·</span>
              <span className={sevColor}>{profile.phenotype} Metabolizer</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Confidence</p>
              <p className="text-sm font-semibold text-foreground">
                {Math.round(drug.risk_assessment.confidence_score * 100)}%
              </p>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {expanded && (
          <div className="px-5 pb-5 space-y-4 border-t border-border/50 pt-4 animate-fade-in-up">
            {llm.summary && (
              <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                  <Activity className="w-3 h-3" /> Clinical Summary
                </h4>
                <p className="text-sm text-foreground leading-relaxed">{llm.summary}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {llm.mechanism_of_action && (
                <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                    <Beaker className="w-3 h-3" /> Mechanism of Action
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{llm.mechanism_of_action}</p>
                </div>
              )}
              {llm.variant_significance && (
                <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                    <Dna className="w-3 h-3" /> Variant Significance
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{llm.variant_significance}</p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-secondary/50 border border-border">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Clinical Recommendation
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-muted-foreground shrink-0 w-32">Action:</span>
                  <span className="text-foreground font-medium">{rec.recommended_action}</span>
                </div>
                {rec.dose_adjustment && rec.dose_adjustment !== "None" && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground shrink-0 w-32">Dose Adjustment:</span>
                    <span className="text-foreground">{rec.dose_adjustment}</span>
                  </div>
                )}
                {rec.alternative_drugs && rec.alternative_drugs.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground shrink-0 w-32">Alternatives:</span>
                    <span className="text-foreground">{rec.alternative_drugs.join(", ")}</span>
                  </div>
                )}
                {rec.monitoring_required && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground shrink-0 w-32">Monitoring:</span>
                    <span className="text-yellow-400 font-medium">Required</span>
                  </div>
                )}
              </div>
            </div>

            {llm.dosing_rationale && (
              <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                  <Pill className="w-3 h-3" /> Dosing Rationale
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{llm.dosing_rationale}</p>
              </div>
            )}

            {profile.detected_variants.length > 0 && (
              <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
                  <Dna className="w-3 h-3" /> Detected Variants ({profile.detected_variants.length})
                </h4>
                <div className="space-y-1.5">
                  {profile.detected_variants.map((v, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm px-3 py-2 rounded-lg bg-background/50">
                      <span className="font-mono text-primary">{v.rsid}</span>
                      <span className="text-muted-foreground">chr{v.chromosome}:{v.position}</span>
                      <span className="text-foreground font-medium">{v.genotype}</span>
                      {v.impact && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{v.impact}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Processed in {drug.quality_metrics.processing_time_ms}ms
              {drug.quality_metrics.llm_grounded_on_guidelines && (
                <span className="ml-2 flex items-center gap-1 text-tox-safe">
                  <ShieldCheck className="w-3 h-3" /> CPIC Grounded
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main ResultsPanel ────────────────────────────────── */

export default function ResultsPanel({ result }: ResultsPanelProps) {
  const navigate = useNavigate();

  const rawResponse = result.rawJson as AnalysisResponse;
  const drugResults = rawResponse?.results || [];

  const safeCount = drugResults.filter((d) => d.risk_assessment.risk_label === "Safe").length;
  const cautionCount = drugResults.filter(
    (d) => d.risk_assessment.risk_label === "Adjust Dosage" || d.risk_assessment.risk_label === "Ineffective"
  ).length;
  const dangerCount = drugResults.filter((d) => d.risk_assessment.risk_label === "Toxic").length;
  const totalTime = rawResponse?.overall_processing_time_ms || 0;
  const riskColor = RISK_COLORS_RAW[result.overallRisk] || RISK_COLORS_RAW.moderate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analysis Results</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {result.fileName} · {new Date(result.analyzedAt).toLocaleString()} · {totalTime}ms total
          </p>
        </div>
      </div>

      {/* Overall Risk Banner */}
      <div
        className="rounded-2xl p-6 border"
        style={{
          background: `linear-gradient(135deg, ${riskColor}15, ${riskColor}05)`,
          borderColor: `${riskColor}40`,
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: `${riskColor}20`, border: `2px solid ${riskColor}40` }}
            >
              <Activity className="w-7 h-7" style={{ color: riskColor }} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overall Pharmacogenomic Risk</p>
              <p className="text-3xl font-bold mt-0.5" style={{ color: riskColor }}>
                {result.overallRisk === "safe" ? "Safe" : result.overallRisk === "low" ? "Low Risk" : result.overallRisk === "moderate" ? "Moderate Risk" : result.overallRisk === "high" ? "High Risk" : "Critical Risk"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-6 text-center">
            {[
              { label: "Total Drugs", value: drugResults.length, color: "text-primary" },
              { label: "Safe", value: safeCount, color: "text-tox-safe" },
              { label: "Caution", value: cautionCount, color: "text-yellow-400" },
              { label: "Contraindicated", value: dangerCount, color: "text-tox-critical" },
            ].map((s) => (
              <div key={s.label}>
                <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drug Classification Summary: Safe / Caution / Contraindicated */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { title: "Safe Medications", icon: CheckCircle, drugs: result.summary.safeDrugs, color: "#22c55e" },
          { title: "Use with Caution", icon: AlertTriangle, drugs: result.summary.cautionDrugs, color: "#f59e0b" },
          { title: "Contraindicated", icon: XCircle, drugs: result.summary.contraindicatedDrugs, color: "#ef4444" },
        ].map((section) => (
          <div
            key={section.title}
            className="gradient-card rounded-2xl p-5 border"
            style={{ borderColor: `${section.color}30`, boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <section.icon className="w-4 h-4" style={{ color: section.color }} />
              <h3 className="font-semibold text-sm text-foreground">{section.title}</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {section.drugs.length > 0 ? section.drugs.map((drug) => (
                <span
                  key={drug}
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{
                    background: `${section.color}15`,
                    color: section.color,
                    border: `1px solid ${section.color}30`,
                  }}
                >
                  {drug}
                </span>
              )) : <span className="text-xs text-muted-foreground">None</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Toxicity Chart + Recommendations side by side */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="gradient-card rounded-2xl p-6 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="font-semibold text-foreground mb-5 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-primary" />
            Toxicity Distribution
          </h2>
          <ToxicityDonutChart
            data={result.toxicityBreakdown}
            totalVariants={result.totalVariants}
            overallRisk={result.overallRisk}
          />
        </div>

        <div className="gradient-card rounded-2xl p-6 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="font-semibold text-foreground mb-5 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-primary" />
            Clinical Recommendations
          </h2>
          <div className="space-y-3">
            {result.summary.recommendations.length > 0 ? result.summary.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="w-3 h-3 text-primary" />
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">{rec}</p>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No specific recommendations.</p>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Tabs: Per-Drug, Variants, JSON */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Pill className="w-5 h-5 text-primary" />
          Detailed Per-Drug Analysis
        </h2>
        <Tabs defaultValue="drugs" className="w-full">
          <TabsList className="w-full justify-start bg-card border border-border rounded-xl p-1 gap-1">
            <TabsTrigger value="drugs" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <Pill className="w-3.5 h-3.5 mr-1.5" /> Drug Cards
            </TabsTrigger>
            <TabsTrigger value="variants" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <Dna className="w-3.5 h-3.5 mr-1.5" /> Variants
            </TabsTrigger>
            <TabsTrigger value="json" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Raw JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drugs" className="mt-4 space-y-3">
            {drugResults.length > 0 ? drugResults.map((drug, i) => (
              <DrugResultCard key={`${drug.drug}-${i}`} drug={drug} />
            )) : <p className="text-muted-foreground text-center py-8">No drug results available.</p>}
          </TabsContent>

          <TabsContent value="variants" className="mt-4">
            <div className="gradient-card rounded-2xl p-6 border border-border">
              <VariantTable variants={result.variants} />
            </div>
          </TabsContent>

          <TabsContent value="json" className="mt-4">
            <div className="gradient-card rounded-2xl p-6 border border-border">
              <JsonViewer data={result.rawJson} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* View Full Summary Report button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={() => navigate("/summary", { state: { result } })}
          className="flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
        >
          View Printable Summary Report <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center pt-2">
        ⚠️ This report is for research and informational purposes only. All clinical decisions should be made in consultation with a qualified healthcare professional.
      </p>
    </div>
  );
}
