import { Link } from "@tanstack/react-router";
import {
  Activity,
  Bluetooth,
  Car,
  Cpu,
  Fan,
  FlaskConical,
  Gauge as GaugeIcon,
  Settings,
  Thermometer,
  Usb,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

import { formatSignal, severityOf } from "@/lib/telemetry/signals";
import { useTelemetry } from "@/lib/telemetry/store";
import { cn } from "@/lib/utils";

const SOURCE_META = {
  usb: { label: "USB Kablo", icon: Usb },
  bluetooth: { label: "Bluetooth", icon: Bluetooth },
  demo: { label: "Demo / Simülasyon", icon: FlaskConical },
} as const;

export function StatusBar({ onOpenSource }: { onOpenSource: () => void }) {
  const { snapshot, source, connection, identity } = useTelemetry();
  const [clock, setClock] = useState("--:--");

  useEffect(() => {
    const update = () =>
      setClock(new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }));
    update();
    const id = window.setInterval(update, 15_000);
    return () => clearInterval(id);
  }, []);

  const SourceIcon = SOURCE_META[source].icon;
  const voltage = snapshot.signals.voltage;
  const coolant = snapshot.signals.coolant;
  const outside = snapshot.signals.outsideTemp;

  return (
    <header className="panel grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 sm:flex sm:flex-wrap sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Cpu className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-sm font-bold tracking-[0.18em]">AUTOBRAIN OS</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {identity.make} · {identity.model} · Paket {identity.trim}
          </div>
        </div>
      </div>

      <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-auto">
        <Metric
          icon={Zap}
          label="Voltaj"
          value={voltage.status === "live" ? `${formatSignal("voltage", voltage.value)} V` : "—"}
          severity={voltage.status === "live" ? severityOf("voltage", voltage.value) : "normal"}
        />
        <Metric
          icon={Thermometer}
          label="Hararet"
          value={coolant.status === "live" ? `${formatSignal("coolant", coolant.value)} °C` : "—"}
          severity={coolant.status === "live" ? severityOf("coolant", coolant.value) : "normal"}
        />
        <Metric
          icon={Fan}
          label="Fan"
          value={snapshot.flags.fanOn ? "Devrede" : "Kapalı"}
          severity={snapshot.flags.fanOn ? "warn" : "normal"}
        />
        <Metric
          icon={Car}
          label="Dış Hava"
          value={outside.status === "live" ? `${formatSignal("outsideTemp", outside.value)} °C` : "—"}
          severity="normal"
        />

        <button
          onClick={onOpenSource}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
            connection === "connected"
              ? "border-ok/60 bg-ok/10 text-ok"
              : connection === "error"
                ? "border-destructive/60 bg-destructive/10 text-destructive"
                : "border-border bg-muted text-muted-foreground",
          )}
        >
          <SourceIcon className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{SOURCE_META[source].label}</span>
          <span className="h-2 w-2 rounded-full bg-current" />
        </button>

        <div className="digits rounded-lg bg-muted px-3 py-2 text-sm">{clock}</div>

        <nav className="flex items-center gap-1">
          <IconLink to="/" label="Kokpit" icon={GaugeIcon} />
          <IconLink to="/telemetry/engine" label="Telemetri" icon={Activity} />
          <IconLink to="/settings" label="Ayarlar" icon={Settings} />
        </nav>
      </div>
    </header>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  severity,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  severity: "normal" | "warn" | "danger";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg bg-muted/70 px-2.5 py-1.5",
        severity === "warn" && "bg-warn/15 text-warn",
        severity === "danger" && "bg-destructive/15 text-destructive",
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" />
      <div className="min-w-0 leading-tight">
        <div className="label-xs !text-[9px]">{label}</div>
        <div className="digits text-sm">{value}</div>
      </div>
    </div>
  );
}

function IconLink({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Zap }) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      activeProps={{ className: "bg-primary/20 text-primary" }}
      className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors hover:text-foreground"
    >
      <Icon className="h-4 w-4" />
    </Link>
  );
}
