import { SIGNALS, formatSignal, severityOf, type SignalKey } from "@/lib/telemetry/signals";
import type { Signal } from "@/lib/telemetry/types";
import { cn } from "@/lib/utils";

export function SignalTile({
  signalKey,
  signal,
  compact = false,
}: {
  signalKey: SignalKey;
  signal: Signal;
  compact?: boolean;
}) {
  const meta = SIGNALS[signalKey];
  const available = signal.status === "live" || signal.status === "calculated";
  const severity = available ? severityOf(signalKey, signal.value) : "normal";
  const ratio = available
    ? Math.min(1, Math.max(0, (signal.value - meta.min) / (meta.max - meta.min)))
    : 0;

  return (
    <div
      className={cn(
        "panel flex min-w-0 flex-col justify-between gap-2 p-3",
        !available && "opacity-45",
        severity === "warn" && "border-warn/70",
        severity === "danger" && "border-destructive/80",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <span className="label-xs truncate">{compact ? (meta.short ?? meta.label) : meta.label}</span>
        {signal.status === "calculated" && (
          <span className="shrink-0 rounded bg-accent/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-accent">
            hesap
          </span>
        )}
        {signal.status === "unsupported" && (
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
            paket dışı
          </span>
        )}
        {signal.status === "stale" && (
          <span className="shrink-0 rounded bg-destructive/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-destructive">
            sinyal yok
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "digits truncate text-2xl",
            severity === "warn" && "text-warn",
            severity === "danger" && "text-destructive",
          )}
        >
          {available ? formatSignal(signalKey, signal.value) : "—"}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{meta.unit}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-200",
            severity === "danger" ? "bg-destructive" : severity === "warn" ? "bg-warn" : "bg-primary",
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
