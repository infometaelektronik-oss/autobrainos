import { createFileRoute } from "@tanstack/react-router";
import { Activity, CircleDot } from "lucide-react";

import { DemoPanel } from "@/components/cockpit/DemoPanel";
import { Gauge } from "@/components/cockpit/Gauge";
import { MediaPanel } from "@/components/cockpit/MediaPanel";
import { CockpitShell } from "@/components/cockpit/Shell";
import { SignalTile } from "@/components/cockpit/SignalTile";
import { SIGNAL_META } from "@/lib/telemetry/signals";
import { useTelemetry } from "@/lib/telemetry/store";
import type { SignalKey } from "@/lib/telemetry/signals";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AutoBrain OS — Araç Kokpiti ve Telemetri Sistemi" },
      {
        name: "description",
        content:
          "AutoBrain OS: OBD2, CAN-Bus ve UDS destekli, yapay zeka teşhis motorlu dokunmatik araç kokpiti ve telemetri arayüzü.",
      },
      { property: "og:title", content: "AutoBrain OS — Araç Kokpiti ve Telemetri Sistemi" },
      {
        property: "og:description",
        content:
          "Tesla tarzı karanlık kokpit arayüzü, canlı sensör telemetrisi ve Türkçe yapay zeka arıza teşhisi.",
      },
    ],
  }),
  component: Cockpit,
});

const SECONDARY: SignalKey[] = [
  "map",
  "iat",
  "maf",
  "ltft",
  "oilPressure",
  "oilTemp",
  "egt",
  "voltage",
  "railPressure",
  "dpfSoot",
  "egrPosition",
  "fuelLevel",
];

function Cockpit() {
  const { snapshot, settings, identity } = useTelemetry();
  const variant = settings.theme;
  const gauges = settings.primaryGauges.slice(0, 4);

  return (
    <CockpitShell>
      <div className="grid min-h-0 gap-2 sm:gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="flex min-w-0 flex-col gap-2 sm:gap-3">
          <div
            className={
              variant === "race"
                ? "grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4"
                : "grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4"
            }
          >
            {gauges.map((key) => (
              <Gauge
                key={key}
                signalKey={key}
                value={snapshot.signals[key].value}
                status={snapshot.signals[key].status}
                variant={variant}
              />
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
            <GForcePad />
            <WheelPad />
            <section className="panel p-4">
              <span className="label-xs">Araç Kimliği</span>
              <h3 className="mt-1 truncate text-lg font-bold">
                {identity.make} {identity.model}
              </h3>
              <dl className="mt-3 space-y-1.5 text-xs">
                <Row label="VIN" value={identity.vin ?? "okunmadı"} />
                <Row label="Model Yılı" value={identity.year ? String(identity.year) : "—"} />
                <Row label="Motor Kodu" value={identity.engineCode} />
                <Row label="Protokol" value={identity.protocol} />
                <Row label="Donanım Paketi" value={`Paket ${identity.trim}`} />
                <Row label="Rejenerasyon" value={snapshot.flags.regen} />
              </dl>
            </section>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {SECONDARY.map((key) => (
              <SignalTile key={key} signalKey={key} signal={snapshot.signals[key]} compact />
            ))}
          </div>

          <DemoPanel />
        </div>

        <MediaPanel />
      </div>
    </CockpitShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
      <dt className="truncate text-muted-foreground">{label}</dt>
      <dd className="digits truncate text-right">{value}</dd>
    </div>
  );
}

function GForcePad() {
  const { snapshot } = useTelemetry();
  const lat = snapshot.signals.gLat;
  const lon = snapshot.signals.gLong;
  const x = 50 + Math.max(-1.4, Math.min(1.4, lat.status === "live" ? lat.value : 0)) * 32;
  const y = 50 - Math.max(-1.4, Math.min(1.4, lon.status === "live" ? lon.value : 0)) * 32;

  return (
    <section className="panel p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <span className="label-xs truncate">G-Force / Yaw</span>
        <Activity className="h-4 w-4 shrink-0 text-primary" />
      </div>
      <div className="relative mx-auto mt-3 aspect-square w-full max-w-[160px] rounded-full border border-border">
        <div className="absolute inset-1/4 rounded-full border border-border/60" />
        <div className="absolute left-1/2 top-0 h-full w-px bg-border/60" />
        <div className="absolute left-0 top-1/2 h-px w-full bg-border/60" />
        <div
          className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary glow-primary transition-all duration-100"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[11px]">
        <Mini label="Yanal" value={lat.status === "live" ? lat.value.toFixed(2) : "—"} />
        <Mini label="Boyuna" value={lon.status === "live" ? lon.value.toFixed(2) : "—"} />
        <Mini
          label="Yaw"
          value={
            snapshot.signals.yawRate.status === "live"
              ? snapshot.signals.yawRate.value.toFixed(1)
              : "—"
          }
        />
      </div>
    </section>
  );
}

function WheelPad() {
  const { snapshot } = useTelemetry();
  const wheels: Array<{ key: SignalKey; tpms: SignalKey; label: string }> = [
    { key: "wssFL", tpms: "tpmsFL", label: "Sol Ön" },
    { key: "wssFR", tpms: "tpmsFR", label: "Sağ Ön" },
    { key: "wssRL", tpms: "tpmsRL", label: "Sol Arka" },
    { key: "wssRR", tpms: "tpmsRR", label: "Sağ Arka" },
  ];

  return (
    <section className="panel p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <span className="label-xs truncate">Tekerlek Hızı & TPMS</span>
        <CircleDot className="h-4 w-4 shrink-0 text-primary" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {wheels.map((wheel) => {
          const speed = snapshot.signals[wheel.key];
          const pressure = snapshot.signals[wheel.tpms];
          const ok = speed.status === "live" || speed.status === "calculated";
          return (
            <div
              key={wheel.key}
              className={`rounded-lg border p-2 ${ok ? "border-border" : "border-destructive/70 bg-destructive/10"}`}
            >
              <div className="label-xs !text-[9px] truncate">{wheel.label}</div>
              <div className="digits text-lg">{ok ? speed.value.toFixed(0) : "✕"}</div>
              <div className="text-[10px] text-muted-foreground">
                {pressure.status === "live"
                  ? `${pressure.value.toFixed(2)} ${SIGNAL_META[wheel.tpms].unit}`
                  : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/60 py-1">
      <div className="label-xs !text-[9px]">{label}</div>
      <div className="digits text-sm">{value}</div>
    </div>
  );
}
