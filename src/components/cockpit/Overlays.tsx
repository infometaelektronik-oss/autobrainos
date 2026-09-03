import { AlertTriangle, Phone, PhoneOff, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { playAlarm } from "@/lib/audio";
import { useTelemetry } from "@/lib/telemetry/store";

export function CriticalOverlay() {
  const { critical, dismissCritical } = useTelemetry();

  useEffect(() => {
    if (!critical) return;
    const id = window.setInterval(() => playAlarm("critical"), 2200);
    return () => clearInterval(id);
  }, [critical]);

  if (!critical) return null;

  return (
    <div
      role="alertdialog"
      aria-label="Kritik arıza uyarısı"
      className="fixed inset-0 z-50 flex items-center justify-center bg-destructive/25 p-4 backdrop-blur-sm"
    >
      <div className="panel flash-alert w-full max-w-xl border-destructive bg-background/95 p-6 text-center sm:p-10">
        <ShieldAlert className="mx-auto h-14 w-14 text-destructive" />
        <h2 className="mt-4 text-2xl font-bold text-destructive sm:text-3xl">KRİTİK ARIZA</h2>
        <p className="mt-3 text-lg text-foreground">{critical.text}</p>
        {critical.detail && <p className="mt-2 text-sm text-muted-foreground">{critical.detail}</p>}
        <button
          onClick={dismissCritical}
          className="mt-6 w-full rounded-lg bg-destructive px-6 py-4 text-lg font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
        >
          Uyarıyı Sustur
        </button>
      </div>
    </div>
  );
}

export function CallOverlay() {
  const { call, acceptCall, declineCall } = useTelemetry();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (call.status !== "in-call" || !call.startedAt) return;
    const id = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - call.startedAt!) / 1000)),
      500,
    );
    return () => clearInterval(id);
  }, [call.status, call.startedAt]);

  if (!call.active) return null;
  const incoming = call.status === "incoming";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/85 p-4 backdrop-blur">
      <div className="panel w-full max-w-lg p-6 text-center sm:p-10">
        <span className="label-xs">{incoming ? "Gelen Çağrı" : "Görüşme Sürüyor"}</span>
        <div className="mx-auto mt-4 grid h-20 w-20 place-items-center rounded-full bg-primary/15 text-2xl font-bold text-primary">
          {call.name
            .split(" ")
            .map((part) => part.charAt(0))
            .join("")}
        </div>
        <h2 className="mt-4 truncate text-2xl font-bold sm:text-3xl">{call.name}</h2>
        <p className="mt-1 text-muted-foreground">{call.number}</p>
        {!incoming && (
          <p className="digits mt-3 text-xl text-primary">
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
            {String(elapsed % 60).padStart(2, "0")}
          </p>
        )}
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" /> Medya sesi otomatik kısıldı (ducking aktif)
        </p>
        <div className="mt-7 grid grid-cols-2 gap-4">
          {incoming ? (
            <button
              onClick={acceptCall}
              className="flex h-20 items-center justify-center gap-2 rounded-xl bg-ok text-lg font-semibold text-ok-foreground"
            >
              <Phone className="h-6 w-6" /> Kabul Et
            </button>
          ) : (
            <div className="flex h-20 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
              Mikrofon: AEC + gürültü filtresi açık
            </div>
          )}
          <button
            onClick={declineCall}
            className="flex h-20 items-center justify-center gap-2 rounded-xl bg-destructive text-lg font-semibold text-destructive-foreground"
          >
            <PhoneOff className="h-6 w-6" /> {incoming ? "Reddet" : "Bitir"}
          </button>
        </div>
      </div>
    </div>
  );
}
