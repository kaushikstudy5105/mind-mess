import { useLocation, useNavigate } from "react-router-dom";
import { AnalysisResult } from "@/types/pharma";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Info, Activity, Dna } from "lucide-react";
import ToxicityDonutChart from "@/components/ToxicityDonutChart";
import pharmaLogo from "@/assets/pharma-logo.png";

export default function Summary() {
  const location = useLocation();
  const navigate = useNavigate();
  const result: AnalysisResult | undefined = location.state?.result;

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No analysis data available.</p>
          <Button onClick={() => navigate("/")} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const RISK_COLORS: Record<string, string> = {
    safe: "hsl(var(--tox-safe))",
    low: "hsl(var(--tox-low))",
    moderate: "hsl(var(--tox-moderate))",
    high: "hsl(var(--tox-high))",
    critical: "hsl(var(--tox-critical))",
  };
  const RISK_LABEL: Record<string, string> = {
    safe: "Safe",
    low: "Low Risk",
    moderate: "Moderate Risk",
    high: "High Risk",
    critical: "Critical Risk",
  };

  const riskColor = RISK_COLORS[result.overallRisk];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Results
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <img src={pharmaLogo} alt="PharmaGuard" className="w-6 h-6 object-contain" />
            <span className="font-semibold text-sm text-foreground">PharmaGuard</span>
          </div>
          <span className="text-muted-foreground text-sm ml-auto">
            Comprehensive Summary Report
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Title */}
        <div className="space-y-2 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <Dna className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Pharmacogenomics Analysis Report</h1>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>File: <span className="text-foreground font-medium">{result.fileName}</span></span>
            <span>Analyzed: <span className="text-foreground font-medium">{new Date(result.analyzedAt).toLocaleString()}</span></span>
            <span>Genome Build: <span className="text-foreground font-medium">GRCh38</span></span>
          </div>
        </div>

        {/* Overall risk banner */}
        <div
          className="rounded-2xl p-6 border animate-scale-in"
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
                  {RISK_LABEL[result.overallRisk]}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              {[
                { label: "Total Variants", value: result.totalVariants },
                { label: "Genes Flagged", value: result.variants.length },
                { label: "Drug Alerts", value: result.summary.contraindicatedDrugs.length + result.summary.cautionDrugs.length },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Two-column: chart + gene breakdown */}
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
              Gene Panel Results
            </h2>
            <div className="space-y-3">
              {result.variants.map((v) => {
                const RISK_C = RISK_COLORS[v.classification];
                return (
                  <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 border border-border/50">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: `${RISK_C}20`, color: RISK_C, border: `1px solid ${RISK_C}30` }}
                    >
                      {v.toxicityScore}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-primary">{v.gene}</span>
                        <span className="text-xs text-muted-foreground font-mono">{v.rsid}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{v.clinicalSignificance}</div>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: `${RISK_C}15`, color: RISK_C, border: `1px solid ${RISK_C}30` }}
                    >
                      {v.classification}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drug sections */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              title: "Safe Medications",
              icon: CheckCircle,
              drugs: result.summary.safeDrugs,
              color: "var(--tox-safe)",
              desc: "No significant pharmacogenomic interactions detected.",
            },
            {
              title: "Use with Caution",
              icon: AlertTriangle,
              drugs: result.summary.cautionDrugs,
              color: "var(--tox-moderate)",
              desc: "Dose adjustment or additional monitoring may be required.",
            },
            {
              title: "Contraindicated",
              icon: XCircle,
              drugs: result.summary.contraindicatedDrugs,
              color: "var(--tox-critical)",
              desc: "Avoid these drugs — high risk of serious adverse effects.",
            },
          ].map((section) => (
            <div
              key={section.title}
              className="gradient-card rounded-2xl p-5 border"
              style={{
                borderColor: `hsl(${section.color.replace("var(--", "").replace(")", "")} / 0.3)`,
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <section.icon
                  className="w-4 h-4 shrink-0"
                  style={{ color: `hsl(var(--${section.color.replace("var(--", "").replace(")", "")}))` }}
                />
                <h3 className="font-semibold text-sm text-foreground">{section.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{section.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {section.drugs.map((drug) => (
                  <span
                    key={drug}
                    className="text-xs px-2 py-1 rounded-lg"
                    style={{
                      background: `hsl(var(--${section.color.replace("var(--", "").replace(")", "")}) / 0.1)`,
                      color: `hsl(var(--${section.color.replace("var(--", "").replace(")", "")}))`,
                      border: `1px solid hsl(var(--${section.color.replace("var(--", "").replace(")", "")}) / 0.3)`,
                    }}
                  >
                    {drug}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Clinical Recommendations */}
        <div className="gradient-card rounded-2xl p-6 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="font-semibold text-foreground mb-5 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-primary" />
            Clinical Recommendations
          </h2>
          <div className="space-y-3">
            {result.summary.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="w-3 h-3 text-primary" />
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
            ⚠️ This report is for research and informational purposes only. All clinical decisions should be made in consultation with a qualified healthcare professional.
          </p>
        </div>
      </main>
    </div>
  );
}
