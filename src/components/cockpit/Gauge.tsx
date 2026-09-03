import { useEffect, useRef, useState } from "react";

import { SIGNAL_META, formatSignal, severityOf, type SignalKey } from "@/lib/telemetry/signals";
import type { SignalStatus } from "@/lib/telemetry/signals";
import { cn } from "@/lib/utils";

const START = 225;
const SWEEP = 270;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

/** Smooths incoming telemetry so needles never jump between polls. */
function useSmoothed(value: number, factor = 0.22) {
  const [display, setDisplay] = useState(Number.isFinite(value) ? value : 0);
  const target = useRef(value);
  target.current = value;

  useEffect(() => {
    let frame = 0;
    const step = () => {
      setDisplay((prev) => {
        const goal = Number.isFinite(target.current) ? target.current : 0;
        return Math.abs(goal - prev) < 0.001 ? goal : prev + (goal - prev) * factor;
      });
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [factor]);

  return display;
}

export interface GaugeProps {
  signalKey: SignalKey;
  value: number;
  status: SignalStatus;
  variant?: "tesla" | "analog" | "race";
  className?: string;
}

export function Gauge({ signalKey, value, status, variant = "tesla", className }: GaugeProps) {
  const meta = SIGNAL_META[signalKey];
  const available = status === "live" || status === "calculated";
  const smooth = useSmoothed(available ? value : meta.min);
  const ratio = Math.min(1, Math.max(0, (smooth - meta.min) / (meta.max - meta.min)));
  const angle = START + ratio * SWEEP;
  const severity = available ? severityOf(signalKey, value) : "normal";

  const stroke =
    severity === "danger"
      ? "var(--destructive)"
      : severity === "warn"
        ? "var(--warn)"
        : variant === "race"
          ? "var(--ok)"
          : "var(--primary)";

  const ticks = Array.from({ length: 25 }, (_, i) => START + (i / 24) * SWEEP);

  return (
    <div className={cn("panel relative flex flex-col items-center justify-center p-3", className)}>
      <svg viewBox="0 0 200 200" className="w-full max-w-[240px]">
        <path
          d={arc(100, 100, 84, START, START + SWEEP)}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={10}
          strokeLinecap="round"
          opacity={0.55}
        />
        {available && (
          <path
            d={arc(100, 100, 84, START, angle)}
            fill="none"
            stroke={stroke}
            strokeWidth={10}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${stroke})` }}
          />
        )}
        {variant !== "tesla" &&
          ticks.map((deg, i) => {
            const outer = polar(100, 100, 70, deg);
            const inner = polar(100, 100, i % 4 === 0 ? 58 : 64, deg);
            return (
              <line
                key={deg}
                x1={outer.x}
                y1={outer.y}
                x2={inner.x}
                y2={inner.y}
                stroke="var(--muted-foreground)"
                strokeWidth={i % 4 === 0 ? 2 : 1}
                opacity={0.7}
              />
            );
          })}
        {variant === "analog" && available && (
          <g>
            <line
              x1={100}
              y1={100}
              x2={polar(100, 100, 66, angle).x}
              y2={polar(100, 100, 66, angle).y}
              stroke={stroke}
              strokeWidth={3.5}
              strokeLinecap="round"
            />
            <circle cx={100} cy={100} r={6} fill={stroke} />
          </g>
        )}
        <text
          x={100}
          y={104}
          textAnchor="middle"
          className="digits"
          fontSize={variant === "race" ? 34 : 38}
          fill="currentColor"
        >
          {available ? formatSignal(signalKey, value) : "—"}
        </text>
        <text x={100} y={126} textAnchor="middle" fontSize={13} fill="var(--muted-foreground)">
          {meta.unit}
        </text>
      </svg>
      <div className="mt-1 text-center">
        <div className="label-xs">{meta.short ?? meta.label}</div>
        {!available && (
          <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            {status === "unsupported" ? "donanım yok" : "veri yok"}
          </div>
        )}
      </div>
    </div>
  );
}
