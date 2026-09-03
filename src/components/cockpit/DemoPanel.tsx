import {
  BatteryWarning,
  Flame,
  PhoneIncoming,
  Radio,
  Thermometer,
  Wind,
  Droplets,
  Zap,
} from "lucide-react";

import { useTelemetry } from "@/lib/telemetry/store";
import type { FaultKey } from "@/lib/telemetry/types";
import { cn } from "@/lib/utils";

const FAULTS: Array<{ key: FaultKey; label: string; icon: typeof Flame }> = [
  { key: "vacuumLeak", label: "Vakum / Hava Kaçağı", icon: Wind },
  { key: "overheat", label: "Aşırı Isınma 102°C", icon: Thermometer },
  { key: "batteryCollapse", label: "Marş Voltaj Çöküşü 9.2V", icon: BatteryWarning },
  { key: "absDropout", label: "ABS Sensörü Kopması", icon: Radio },
  { key: "alternatorRipple", label: "Dinamo Diyot Dalgalanması", icon: Zap },
  { key: "oilPressureLoss", label: "Yağ Basıncı Kaybı", icon: Droplets },
  { key: "brakeFluidLoss", label: "Fren Hidroliği Kaybı", icon: Droplets },
  { key: "misfire", label: "Silindir Teklemesi", icon: Flame },
  { key: "dpfBlocked", label: "DPF Tıkanması", icon: Flame },
];

export function DemoPanel() {
  const { faults, toggleFault, simulateCall, source } = useTelemetry();

  return (
    <section className="panel p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="min-w-0">
          <span className="label-xs">Simülatör Kontrolleri</span>
          <h3 className="truncate text-lg font-bold">Arıza Tetikleyicileri</h3>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-widest",
            source === "demo" ? "bg-ok/15 text-ok" : "bg-muted text-muted-foreground",
          )}
        >
          {source === "demo" ? "demo aktif" : "canlı araç"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {FAULTS.map((fault) => {
          const active = faults.includes(fault.key);
          return (
            <button
              key={fault.key}
              onClick={() => toggleFault(fault.key)}
              disabled={source !== "demo"}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm transition-colors",
                active
                  ? "border-destructive/70 bg-destructive/15 text-destructive"
                  : "border-border bg-muted/40",
                source !== "demo" && "opacity-40",
              )}
            >
              <fault.icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{fault.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => simulateCall()}
          className="flex items-center gap-2 rounded-lg border border-primary/60 bg-primary/10 px-3 py-3 text-left text-sm text-primary"
        >
          <PhoneIncoming className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">Gelen Çağrı: Ahmet Yılmaz</span>
        </button>
      </div>
      {source !== "demo" && (
        <p className="mt-3 text-xs text-muted-foreground">
          Arıza tetikleyicileri yalnızca demo modunda çalışır; canlı araç bağlantısında gerçek
          veriler okunur.
        </p>
      )}
    </section>
  );
}
