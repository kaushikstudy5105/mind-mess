import { useState, useEffect } from "react";
import { Pill, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupportedDrugs, type SupportedDrug } from "@/lib/api";
import { cn } from "@/lib/utils";

// Fallback if the API is unreachable
const FALLBACK_DRUGS: SupportedDrug[] = [
    { name: "CODEINE", primary_gene: "CYP2D6" },
    { name: "WARFARIN", primary_gene: "CYP2C9" },
    { name: "CLOPIDOGREL", primary_gene: "CYP2C19" },
    { name: "SIMVASTATIN", primary_gene: "SLCO1B1" },
    { name: "AZATHIOPRINE", primary_gene: "TPMT" },
    { name: "FLUOROURACIL", primary_gene: "DPYD" },
];

interface DrugSelectorProps {
    selectedDrugs: string[];
    onChange: (drugs: string[]) => void;
    disabled?: boolean;
}

export default function DrugSelector({
    selectedDrugs,
    onChange,
    disabled,
}: DrugSelectorProps) {
    const [drugs, setDrugs] = useState<SupportedDrug[]>(FALLBACK_DRUGS);

    useEffect(() => {
        getSupportedDrugs()
            .then((d) => {
                if (d && d.length > 0) setDrugs(d);
            })
            .catch(() => {
                /* use fallback */
            });
    }, []);

    const toggle = (drug: string) => {
        if (disabled) return;
        if (selectedDrugs.includes(drug)) {
            onChange(selectedDrugs.filter((d) => d !== drug));
        } else {
            onChange([...selectedDrugs, drug]);
        }
    };

    const selectAll = () => {
        if (disabled) return;
        onChange(drugs.map((d) => d.name));
    };

    const clearAll = () => {
        if (disabled) return;
        onChange([]);
    };

    return (
        <div
            className="rounded-2xl p-px"
            style={{
                background:
                    selectedDrugs.length > 0
                        ? "linear-gradient(135deg, hsl(186 100% 50% / 0.4), hsl(222 35% 20%))"
                        : "linear-gradient(135deg, hsl(186 100% 50% / 0.3), hsl(222 35% 20%))",
            }}
        >
            <div
                className="gradient-card rounded-2xl p-6 space-y-4"
                style={{ boxShadow: "var(--shadow-card)" }}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                            <Pill className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Select Drugs</h3>
                            <p className="text-xs text-muted-foreground">
                                Choose medications to analyze
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={selectAll}
                            disabled={disabled}
                            className="h-7 px-3 text-xs hover:bg-primary/10 hover:text-primary"
                        >
                            Select All
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAll}
                            disabled={disabled || selectedDrugs.length === 0}
                            className="h-7 px-3 text-xs hover:bg-destructive/10 hover:text-destructive"
                        >
                            Clear
                        </Button>
                    </div>
                </div>

                {/* Drug Chips */}
                <div className="flex flex-wrap gap-2">
                    {drugs.map((drug) => {
                        const isSelected = selectedDrugs.includes(drug.name);
                        return (
                            <button
                                key={drug.name}
                                onClick={() => toggle(drug.name)}
                                disabled={disabled}
                                className={cn(
                                    "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
                                    isSelected
                                        ? "bg-primary/15 border-primary/40 text-primary shadow-sm"
                                        : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                                    disabled && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isSelected ? (
                                    <Check className="w-3.5 h-3.5" />
                                ) : (
                                    <X className="w-3.5 h-3.5 opacity-0" />
                                )}
                                <span>{drug.name}</span>
                                <span className="text-xs opacity-50">({drug.primary_gene})</span>
                            </button>
                        );
                    })}
                </div>

                {/* Selection count */}
                {selectedDrugs.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                        {selectedDrugs.length} drug{selectedDrugs.length > 1 ? "s" : ""}{" "}
                        selected for analysis
                    </p>
                )}
            </div>
        </div>
    );
}
