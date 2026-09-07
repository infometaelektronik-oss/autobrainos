import { Gauge as GaugeIcon } from "lucide-react";

import { usePerfMetrics } from "@/lib/telemetry/perf";
import { useTelemetry } from "@/lib/telemetry/store";
import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "bad";

const TONE_CLASS: Record<Tone, string> = {
  ok: "text-foreground",
  warn: "text-warn",
  bad: "text-destructive",
};

function Metric({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone: Tone;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/50 p-2">
      <div className="label-xs !text-[9px] truncate">{label}</div>
      <div className={cn("digits truncate text-lg", TONE_CLASS[tone])}>
        {value}
        <span className="ml-1 text-[10px] text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

/** Telemetri yenileme hızı ve arayüz gecikmesi paneli. */
export function PerfPanel() {
  const { snapshot, source, connection } = useTelemetry();
  const perf = usePerfMetrics(snapshot);

  const hzTone: Tone = perf.dataHz >= 6 ? "ok" : perf.dataHz >= 3 ? "warn" : "bad";
  const latencyTone: Tone =
    perf.dataLatency <= 200 ? "ok" : perf.dataLatency <= 600 ? "warn" : "bad";
  const fpsTone: Tone = perf.fps >= 50 ? "ok" : perf.fps >= 30 ? "warn" : "bad";
  const frameTone: Tone = perf.worstFrame <= 40 ? "ok" : perf.worstFrame <= 90 ? "warn" : "bad";
  const dropTone: Tone = perf.dropRate <= 5 ? "ok" : perf.dropRate <= 15 ? "warn" : "bad";
  const degraded = [hzTone, latencyTone, fpsTone, dropTone].includes("bad");

  return (
    <section
      aria-label="Performans ve gecikme paneli"
      className={cn("panel p-4", degraded && "border-destructive/60")}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <GaugeIcon className="h-4 w-4 shrink-0 text-primary" />
        <span className="label-xs truncate">Performans / Gecikme</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {source === "demo" ? "Demo" : source === "usb" ? "USB" : "Bluetooth"} · {connection}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Metric label="Veri Yenileme" value={perf.dataHz.toFixed(0)} unit="Hz" tone={hzTone} />
        <Metric
          label="Veri Gecikmesi"
          value={perf.dataLatency.toFixed(0)}
          unit="ms"
          tone={latencyTone}
        />
        <Metric label="Arayüz" value={perf.fps.toFixed(0)} unit="fps" tone={fpsTone} />
        <Metric
          label="En Yavaş Kare"
          value={perf.worstFrame.toFixed(0)}
          unit="ms"
          tone={frameTone}
        />
        <Metric label="Kayıp Paket" value={perf.dropRate.toFixed(0)} unit="%" tone={dropTone} />
      </div>

      {degraded && (
        <p className="mt-2 text-xs text-destructive">
          Veri akışı veya arayüz hedef hızın altında; arka plan uygulamalarını kapatmak akışı
          düzeltir.
        </p>
      )}
    </section>
  );
}
