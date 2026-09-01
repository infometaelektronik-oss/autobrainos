import { Bluetooth, FlaskConical, Loader2, Usb, X } from "lucide-react";

import { useTelemetry } from "@/lib/telemetry/store";
import type { SourceMode, TrimLevel } from "@/lib/telemetry/types";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{
  mode: SourceMode;
  title: string;
  description: string;
  icon: typeof Usb;
}> = [
  {
    mode: "usb",
    title: "USB Kablo (Birincil)",
    description: "OTG kablo ile FTDI / STN / CH340 / CP2102 arayüzüne doğrudan, sıfır gecikmeli seri bağlantı.",
    icon: Usb,
  },
  {
    mode: "bluetooth",
    title: "Bluetooth ELM327",
    description: "Kablosuz ELM327 / Vgate / BLE OBD2 dongle bağlantısı (Web Bluetooth).",
    icon: Bluetooth,
  },
  {
    mode: "demo",
    title: "Demo / Simülasyon",
    description: "Araç olmadan tüm göstergeleri besleyen gerçekçi çevrimiçi olmayan simülatör.",
    icon: FlaskConical,
  },
];

const TRIMS: Array<{ trim: TrimLevel; label: string }> = [
  { trim: "A", label: "A — Temel paket" },
  { trim: "B", label: "B — Orta paket" },
  { trim: "C", label: "C — Dolu paket" },
  { trim: "D", label: "D — Tam donanım" },
];

export function SourceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { source, connection, connectionError, connect, disconnect, capabilities, identity, setTrim } =
    useTelemetry();

  if (!open) return null;
  const busy = connection === "connecting" || connection === "handshaking";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-background/80 p-3 backdrop-blur sm:items-center">
      <div className="panel max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold">Veri Kaynağı Seçimi</h2>
            <p className="text-sm text-muted-foreground">
              Protokol: {identity.protocol}
              {identity.vin ? ` · VIN ${identity.vin}` : " · VIN okunmadı"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {OPTIONS.map((option) => {
            const unavailable =
              (option.mode === "usb" && !capabilities.serial) ||
              (option.mode === "bluetooth" && !capabilities.bluetooth);
            const active = source === option.mode && connection === "connected";
            return (
              <button
                key={option.mode}
                disabled={unavailable || busy}
                onClick={() => void connect(option.mode)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                  active ? "border-ok/70 bg-ok/10" : "border-border bg-muted/40 hover:bg-muted",
                  (unavailable || busy) && "opacity-50",
                )}
              >
                <option.icon className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{option.title}</span>
                    {active && <span className="text-[10px] uppercase tracking-widest text-ok">bağlı</span>}
                    {unavailable && (
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        tarayıcı desteklemiyor
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {busy && (
          <p className="mt-3 flex items-center gap-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            {connection === "connecting" ? "Arayüz açılıyor…" : "ELM327 el sıkışması ve PID taraması…"}
          </p>
        )}
        {connectionError && <p className="mt-3 text-sm text-destructive">{connectionError}</p>}

        <div className="mt-5">
          <span className="label-xs">Fabrika Donanım Paketi (Trim Matrisi)</span>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TRIMS.map((item) => (
              <button
                key={item.trim}
                onClick={() => setTrim(item.trim)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-semibold",
                  identity.trim === item.trim
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Düşük paketlerde bulunmayan sensörler (yağ sıcaklığı, balata aşınması, EGT…) otomatik olarak devre
            dışı bırakılır; bozuk 0 / 255 verisi gösterilmez.
          </p>
        </div>

        <button
          onClick={() => {
            disconnect();
            onClose();
          }}
          className="mt-5 w-full rounded-lg border border-destructive/60 px-4 py-3 text-sm font-semibold text-destructive"
        >
          Bağlantıyı Kes
        </button>
      </div>
    </div>
  );
}
