import { useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AppState, AnalysisResult, transformBackendToUI } from "@/types/pharma";
import { analyzeVCF } from "@/lib/api";
import FileUploadCard from "@/components/FileUploadCard";
import DrugSelector from "@/components/DrugSelector";
import ResultsPanel from "@/components/ResultsPanel";
import pharmaLogo from "@/assets/pharma-logo.png";
import { Dna, ShieldCheck, Activity, Lock, AlertCircle } from "lucide-react";

const STORAGE_KEY = "pharmaguard_result";

export default function Index() {
  const location = useLocation();
  const [appState, setAppState] = useState<AppState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Restore result from sessionStorage (after navigating back from Summary)
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AnalysisResult;
        setResult(parsed);
        setAppState("results");
      } catch { /* ignore parse errors */ }
    }
  }, []);

  // Also restore if navigating back with result in location state
  useEffect(() => {
    if (location.state?.result) {
      const r = location.state.result as AnalysisResult;
      setResult(r);
      setAppState("results");
    }
  }, [location.state]);

  const canAnalyze =
    selectedFile !== null && selectedDrugs.length > 0 && appState !== "processing";

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setAppState("file-selected");
    setError(null);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (appState !== "results") setAppState("idle");
    setError(null);
  };

  const handleRunAnalysis = useCallback(async () => {
    if (!selectedFile || selectedDrugs.length === 0) return;
    setAppState("processing");
    setError(null);

    try {
      const response = await analyzeVCF(selectedFile, selectedDrugs);
      const uiResult = transformBackendToUI(response, selectedFile.name);
      setResult(uiResult);
      setAppState("results");
      // Persist to sessionStorage for back-navigation
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(uiResult));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Analysis failed. Please try again.";
      setError(message);
      setAppState("file-selected");
    }
  }, [selectedFile, selectedDrugs]);

  const handleReset = () => {
    setAppState("idle");
    setSelectedFile(null);
    setSelectedDrugs([]);
    setResult(null);
    setError(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% -10%, hsl(186 100% 50% / 0.07) 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={pharmaLogo} alt="PharmaGuard" className="w-8 h-8 object-contain" />
            <div>
              <h1 className="font-bold text-foreground text-sm leading-tight">PharmaGuard</h1>
              <p className="text-xs text-muted-foreground leading-tight">Genomic Toxicity Analyzer</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-primary" />
              Secure Analysis
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-primary" />
              HIPAA Compliant
            </span>
            {appState === "results" && (
              <button
                onClick={handleReset}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                New Analysis
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 relative z-0">
        {/* Hero section — shown only when NOT results */}
        {appState !== "results" && (
          <div className="text-center mb-12 space-y-4 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              <Activity className="w-3 h-3" />
              Pharmacogenomics Platform
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight">
              Analyze Genomic{" "}
              <span className="text-gradient">Toxicity Risk</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
              Upload a VCF file, select drugs, and instantly assess drug interaction
              risks and pharmacogenomic toxicity profiles.
            </p>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {[
                { icon: Dna, label: "VCF Format Support" },
                { icon: ShieldCheck, label: "6 Drugs · 6 Genes" },
                { icon: Activity, label: "AI-Powered Analysis" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-secondary/50 border border-border"
                >
                  <Icon className="w-3 h-3 text-primary" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Upload + Drug Selection — hide when results shown */}
        {appState !== "results" && (
          <div className="max-w-xl mx-auto space-y-6">
            <FileUploadCard
              onFileSelect={handleFileSelect}
              onRunTest={handleRunAnalysis}
              selectedFile={selectedFile}
              onClearFile={handleClearFile}
              isProcessing={appState === "processing"}
              canAnalyze={canAnalyze}
            />

            <DrugSelector
              selectedDrugs={selectedDrugs}
              onChange={setSelectedDrugs}
              disabled={appState === "processing"}
            />

            {/* Error Display */}
            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 animate-fade-in-up">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Analysis Failed</p>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing animation */}
        {appState === "processing" && (
          <div className="text-center mt-8 space-y-4 animate-fade-in-up">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 border border-primary/20">
              <Dna className="w-4 h-4 text-primary animate-spin-slow" />
              <span className="text-sm text-foreground font-medium">
                Analyzing genomic data against {selectedDrugs.length} drug{selectedDrugs.length > 1 ? "s" : ""}…
              </span>
            </div>
            <div className="flex justify-center gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-8 rounded-full bg-primary/30"
                  style={{
                    animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite`,
                    animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {appState === "results" && result && (
          <div className="animate-fade-in-up">
            <ResultsPanel result={result} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16 py-6 text-center text-xs text-muted-foreground">
        <p>PharmaGuard · For research use only · Not intended for clinical diagnosis</p>
      </footer>
    </div>
  );
}
