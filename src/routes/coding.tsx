import { createFileRoute } from "@tanstack/react-router";
import { Lock, ShieldCheck } from "lucide-react";

import { CockpitShell } from "@/components/cockpit/Shell";
import { HIDDEN_FEATURES, useTelemetry } from "@/lib/telemetry/store";
import type { TrimLevel } from "@/lib/telemetry/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/coding")({
  head: () => ({
    meta: [
      { title: "ECU Kodlama ve Gizli Özellikler — AutoBrain OS" },
      {
        name: "description",
        content:
          "Donanım paketine göre güvenli fabrika gizli özelliklerini görüntüleyin: gösterge selamlaması, amerikan park, hıza duyarlı kilit.",
      },
      { property: "og:title", content: "ECU Kodlama Modülü — AutoBrain OS" },
      {
        property: "og:description",
        content: "Fabrika gizli özellik anahtarları ve trim bazlı kodlama matrisi.",
      },
    ],
  }),
  component: CodingPage,
});

const ORDER: TrimLevel[] = ["A", "B", "C", "D"];

function CodingPage() {
  const { identity, settings, updateSettings } = useTelemetry();

  const toggle = (id: string, next: boolean) =>
    updateSettings({ hiddenFeatures: { ...settings.hiddenFeatures, [id]: next } });

  return (
    <CockpitShell>
      <div className="flex flex-col gap-3">
        <header className="panel p-4">
          <span className="label-xs">Diagnostik Yardımcı</span>
          <h1 className="mt-1 text-2xl font-bold">ECU Kodlama Modülü</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {identity.make} {identity.model} · {identity.protocol} · Paket {identity.trim}
          </p>
          <p className="mt-2 flex items-start gap-2 text-xs text-warn">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            Yalnızca geri alınabilir, güvenli fabrika adaptasyonları listelenir. Anahtarlar burada
            hazırlanır; tarayıcı ECU'ya yazma yapamaz — kodlama, kiosk paketindeki native köprü ile
            uygulanır.
          </p>
        </header>

        <div className="grid gap-2 sm:gap-3 lg:grid-cols-2">
          {HIDDEN_FEATURES.map((feature) => {
            const locked = ORDER.indexOf(identity.trim) < ORDER.indexOf(feature.minTrim);
            const enabled = Boolean(settings.hiddenFeatures[feature.id]);
            return (
              <article
                key={feature.id}
                className={cn(
                  "panel grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4",
                  locked && "opacity-50",
                )}
              >
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{feature.label}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{feature.description}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    Gerekli paket: {feature.minTrim}
                  </p>
                </div>
                {locked ? (
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </span>
                ) : (
                  <button
                    role="switch"
                    aria-checked={enabled}
                    aria-label={feature.label}
                    onClick={() => toggle(feature.id, !enabled)}
                    className={cn(
                      "relative h-11 w-20 shrink-0 rounded-full transition-colors",
                      enabled ? "bg-primary" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 h-9 w-9 rounded-full bg-background transition-all",
                        enabled ? "left-10" : "left-1",
                      )}
                    />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </CockpitShell>
  );
}
