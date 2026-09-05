import { Brain, ShieldAlert, TriangleAlert } from "lucide-react";
import { useMemo } from "react";

import { buildInsights, driveModeOf, DRIVE_MODE_LABEL } from "@/lib/ai/copilot";
import { useTelemetry } from "@/lib/telemetry/store";
import { cn } from "@/lib/utils";

/** Öngörülü teşhis paneli: ham veri değil, doğal dilde yorum üretir. */
export function AIAnalysisPanel({ compact = false }: { compact?: boolean }) {
  const { snapshot, diagnostics } = useTelemetry();
  const insights = useMemo(() => buildInsights(snapshot, diagnostics), [snapshot, diagnostics]);
  const mode = driveModeOf(snapshot);
  const shown = compact ? insights.filter((i) => i.severity !== "info").slice(0, 3) : insights;

  return (
    <section aria-label="Yapay zeka analiz paneli" className="panel p-4">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <Brain className="h-4 w-4 shrink-0 text-primary" />
        <span className="label-xs truncate">AI Analiz Paneli</span>
        <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {DRIVE_MODE_LABEL[mode]}
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {shown.length === 0 && (
          <li className="text-xs text-muted-foreground">
            Kritik bir eğilim yok, tüm sistemleri izlemeye devam ediyorum.
          </li>
        )}
        {shown.map((insight) => (
          <li
            key={insight.id}
            className={cn(
              "rounded-lg border p-2.5",
              insight.severity === "critical"
                ? "border-destructive/60 bg-destructive/10"
                : insight.severity === "warn"
                  ? "border-warn/50 bg-warn/10"
                  : "border-border bg-muted/40",
            )}
          >
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
              {insight.severity === "critical" ? (
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-destructive" />
              ) : insight.severity === "warn" ? (
                <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-warn" />
              ) : (
                <Brain className="h-3.5 w-3.5 shrink-0 text-primary" />
              )}
              <span className="label-xs truncate">{insight.title}</span>
            </div>
            <p className="mt-1 text-sm leading-snug">{insight.message}</p>
            {insight.action && (
              <p className="mt-1 text-xs text-muted-foreground">{insight.action}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
