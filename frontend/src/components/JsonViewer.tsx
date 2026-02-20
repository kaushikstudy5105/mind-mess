import { useState } from "react";
import { Copy, Download, Check, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface JsonViewerProps {
  data: object;
  fileName?: string;
}

export default function JsonViewer({ data, fileName = "analysis-result" }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      toast({ title: "Copied!", description: "JSON output copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: `${fileName}.json saved.` });
  };

  // Simple syntax highlighting
  const highlighted = jsonString
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = "text-teal-300"; // string
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "text-sky-300"; // key
        } else {
          cls = "text-emerald-300"; // string value
        }
      } else if (/true|false/.test(match)) {
        cls = "text-yellow-300"; // boolean
      } else if (/null/.test(match)) {
        cls = "text-red-400"; // null
      } else {
        cls = "text-purple-300"; // number
      }
      return `<span class="${cls}">${match}</span>`;
    });

  return (
    <div className="rounded-xl overflow-hidden border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary/50 border-b border-border">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">JSON Output</span>
          <span className="text-xs text-muted-foreground">({(jsonString.length / 1024).toFixed(1)} KB)</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-3 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-7 px-3 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </Button>
        </div>
      </div>

      {/* Code block */}
      <div className="overflow-auto max-h-72" style={{ background: "hsl(222 50% 5%)" }}>
        <pre className="text-xs p-4 leading-relaxed font-mono">
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>
    </div>
  );
}
