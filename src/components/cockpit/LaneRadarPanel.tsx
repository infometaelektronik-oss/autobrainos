import { Radar } from "lucide-react";

import { LANE_LABEL, type DriverAssist } from "@/lib/ai/driverAssist";
import { cn } from "@/lib/utils";

/** Şerit takibi + radar takip mesafesi şeridi. */
export function LaneRadarPanel({ assist }: { assist: DriverAssist }) {
  const tone =
    assist.lane === "intervention" || assist.gapRating === "critical"
      ? "critical"
      : assist.lane === "drift" || assist.gapRating === "close"
        ? "warn"
        : "ok";

  const carLeft = 50 + assist.laneOffset * 30;

  return (
    <section
      aria-label="Radar ve şerit takibi"
      className={cn(
        "panel p-4",
        tone === "critical" && "border-destructive/60",
        tone === "warn" && "border-warn/50",
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <Radar
          className={cn(
            "h-4 w-4 shrink-0",
            tone === "critical"
              ? "text-destructive"
              : tone === "warn"
                ? "text-warn"
                : "text-primary",
          )}
        />
        <span className="label-xs truncate">Radar / Şerit Takibi</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            tone === "critical"
              ? "bg-destructive/15 text-destructive"
              : tone === "warn"
                ? "bg-warn/15 text-warn"
                : "bg-primary/12 text-primary",
          )}
        >
          {LANE_LABEL[assist.lane]}
        </span>
      </div>

      {/* Şerit görselleştirmesi */}
      <div className="relative mt-3 h-24 overflow-hidden rounded-lg border border-border bg-muted/30">
        <div className="absolute left-[18%] top-0 h-full w-0.5 bg-foreground/35" />
        <div className="absolute right-[18%] top-0 h-full w-0.5 bg-foreground/35" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border" />
        {assist.followDistance !== null && (
          <div
            className="absolute left-1/2 h-4 w-8 -translate-x-1/2 rounded-sm border border-primary/70 bg-primary/25"
            style={{ top: `${Math.max(4, 70 - assist.followDistance * 0.9)}%` }}
          />
        )}
        <div
          className={cn(
            "absolute bottom-2 h-6 w-10 -translate-x-1/2 rounded-sm transition-all duration-150",
            tone === "critical"
              ? "bg-destructive"
              : tone === "warn"
                ? "bg-warn"
                : "bg-primary glow-primary",
          )}
          style={{ left: `${carLeft}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Cell
          label="Takip Mesafesi"
          value={assist.followDistance !== null ? `${assist.followDistance.toFixed(0)} m` : "—"}
        />
        <Cell
          label="Kapanma"
          value={`${assist.closingSpeed > 0 ? "+" : ""}${assist.closingSpeed.toFixed(0)} km/s`}
        />
        <Cell
          label="Kör Nokta"
          value={
            assist.blindSpot === "clear" ? "Temiz" : assist.blindSpot === "left" ? "Sol" : "Sağ"
          }
        />
      </div>
    </section>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/60 py-1.5">
      <div className="label-xs !text-[9px]">{label}</div>
      <div className="digits text-sm">{value}</div>
    </div>
  );
}
