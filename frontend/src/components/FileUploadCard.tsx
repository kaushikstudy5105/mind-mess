import { useRef, useState, useCallback } from "react";
import { Upload, FileText, X, AlertCircle, CheckCircle2, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface FileUploadCardProps {
  onFileSelect: (file: File) => void;
  onRunTest: () => void;
  selectedFile: File | null;
  onClearFile: () => void;
  isProcessing: boolean;
  canAnalyze?: boolean;
}

type UploadState = "idle" | "valid" | "error-size" | "error-format";

export default function FileUploadCard({
  onFileSelect,
  onRunTest,
  selectedFile,
  onClearFile,
  isProcessing,
  canAnalyze,
}: FileUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const validateFile = useCallback(
    (file: File): boolean => {
      const isVcf =
        file.name.toLowerCase().endsWith(".vcf") ||
        file.type === "text/vcard" ||
        file.type === "chemical/seq-na-vcf" ||
        file.type === "text/plain";

      if (!isVcf || !file.name.toLowerCase().endsWith(".vcf")) {
        setUploadState("error-format");
        setErrorMessage(
          `"${file.name}" is not a VCF file. Please upload a file with a .vcf extension.`
        );
        return false;
      }

      if (file.size > MAX_FILE_SIZE) {
        setUploadState("error-size");
        setErrorMessage(
          `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds the 5MB limit.`
        );
        return false;
      }

      return true;
    },
    []
  );

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        setUploadState("valid");
        setErrorMessage("");
        onFileSelect(file);
      } else {
        onClearFile();
      }
    },
    [validateFile, onFileSelect, onClearFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile]
  );

  const handleClear = () => {
    setUploadState("idle");
    setErrorMessage("");
    onClearFile();
  };

  const zoneClass = cn("upload-zone rounded-xl p-8 cursor-pointer text-center transition-all duration-300", {
    "drag-over": dragOver,
    "has-file": uploadState === "valid",
    "has-error": uploadState === "error-size" || uploadState === "error-format",
  });

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        className="rounded-2xl p-px"
        style={{
          background:
            uploadState === "valid"
              ? "linear-gradient(135deg, hsl(142 71% 45% / 0.5), hsl(142 71% 45% / 0.1))"
              : uploadState === "error-size" || uploadState === "error-format"
                ? "linear-gradient(135deg, hsl(0 72% 55% / 0.5), hsl(0 72% 55% / 0.1))"
                : "linear-gradient(135deg, hsl(186 100% 50% / 0.3), hsl(222 35% 20%))",
        }}
      >
        <div className="gradient-card rounded-2xl p-6 space-y-5" style={{ boxShadow: "var(--shadow-card)" }}>
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Upload Genomic File</h3>
              <p className="text-xs text-muted-foreground">VCF format · Max 5MB</p>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            className={zoneClass}
            onClick={() => !isProcessing && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".vcf"
              className="hidden"
              onChange={handleChange}
              disabled={isProcessing}
            />

            {uploadState === "idle" && (
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Drop your VCF file here</p>
                  <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
                </div>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                    .vcf extension required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                    Max 5MB
                  </span>
                </div>
              </div>
            )}

            {uploadState === "valid" && selectedFile && (
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-tox-safe/10 border border-tox-safe/30 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-tox-safe" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB · VCF file ready
                  </p>
                </div>
              </div>
            )}

            {(uploadState === "error-size" || uploadState === "error-format") && (
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-destructive">
                    {uploadState === "error-format" ? "Invalid File Format" : "File Too Large"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                    {errorMessage}
                  </p>
                  <p className="text-xs text-primary mt-2">Click to select another file</p>
                </div>
              </div>
            )}
          </div>

          {/* File info & actions */}
          {uploadState === "valid" && selectedFile && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-tox-safe/20">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-tox-safe shrink-0" />
                <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
                  {selectedFile.name}
                </span>
              </div>
              <button
                onClick={handleClear}
                disabled={isProcessing}
                className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Run Button */}
          <Button
            className="w-full h-11 font-semibold text-sm gradient-primary text-primary-foreground hover:opacity-90 transition-opacity glow-primary disabled:opacity-40"
            disabled={canAnalyze !== undefined ? !canAnalyze : (uploadState !== "valid" || isProcessing)}
            onClick={onRunTest}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing Genomic Data...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Run Toxicity Analysis
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
