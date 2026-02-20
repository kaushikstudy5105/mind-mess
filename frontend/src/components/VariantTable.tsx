import { VariantResult } from "@/types/pharma";
import { Badge } from "@/components/ui/badge";

interface VariantTableProps {
  variants: VariantResult[];
}

const CLASSIFICATION_CONFIG = {
  safe: { label: "Safe", bg: "bg-tox-safe/10", text: "text-tox-safe", border: "border-tox-safe/30" },
  low: { label: "Low", bg: "bg-tox-low/10", text: "text-tox-low", border: "border-tox-low/30" },
  moderate: { label: "Moderate", bg: "bg-tox-moderate/10", text: "text-tox-moderate", border: "border-tox-moderate/30" },
  high: { label: "High", bg: "bg-tox-high/10", text: "text-tox-high", border: "border-tox-high/30" },
  critical: { label: "Critical", bg: "bg-tox-critical/10", text: "text-tox-critical", border: "border-tox-critical/30" },
};

export default function VariantTable({ variants }: VariantTableProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Gene</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">rsID</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Chr</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Ref/Alt</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Risk Score</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Classification</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Drug Interactions</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v, i) => {
              const cfg = CLASSIFICATION_CONFIG[v.classification];
              return (
                <tr
                  key={v.id}
                  className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                  style={{ background: i % 2 === 0 ? "transparent" : "hsl(var(--secondary) / 0.15)" }}
                >
                  <td className="px-4 py-3 font-semibold text-primary font-mono">{v.gene}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{v.rsid}</td>
                  <td className="px-4 py-3 text-foreground">chr{v.chromosome}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    <span className="text-foreground">{v.ref}</span>
                    <span className="text-muted-foreground mx-1">→</span>
                    <span className="text-primary">{v.alt}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${v.toxicityScore}%`,
                            background: CLASSIFICATION_CONFIG[v.classification].text.replace("text-", "").includes("tox")
                              ? `hsl(var(--${CLASSIFICATION_CONFIG[v.classification].text.replace("text-", "").replace("-", " ").replace("tox ", "tox-")}))`
                              : "#ef4444",
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono text-foreground">{v.toxicityScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                    >
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {v.drugInteractions.slice(0, 3).map((d) => (
                        <span
                          key={d}
                          className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
