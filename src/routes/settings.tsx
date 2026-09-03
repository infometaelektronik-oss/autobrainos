import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { CockpitShell } from "@/components/cockpit/Shell";
import { listMicrophones } from "@/lib/audio";
import { SIGNAL_KEYS, SIGNAL_META } from "@/lib/telemetry/signals";
import type { SignalKey } from "@/lib/telemetry/signals";
import { useTelemetry, type RingMapping, type ThemeKey } from "@/lib/telemetry/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Ayarlar ve Tema Motoru — AutoBrain OS" },
      {
        name: "description",
        content:
          "Gösterge teması, birincil sensör seçimi, direksiyon kumandası eşlemesi ve mikrofon ayarları.",
      },
      { property: "og:title", content: "Ayarlar ve Tema Motoru — AutoBrain OS" },
      {
        property: "og:description",
        content: "AutoBrain OS kokpit tema motoru ve donanım eşleme ayarları.",
      },
    ],
  }),
  component: SettingsPage,
});

const THEMES: Array<{ key: ThemeKey; label: string; description: string }> = [
  {
    key: "tesla",
    label: "Tesla Minimal",
    description: "İnce halka göstergeler, maksimum okunabilirlik.",
  },
  { key: "analog", label: "Klasik Analog", description: "İbreli göstergeler ve kademe çizgileri." },
  { key: "race", label: "Yarış Telemetri", description: "Yoğun ızgara, yeşil telemetri vurgusu." },
];

const RING_KEYS: Array<{ key: keyof RingMapping; label: string }> = [
  { key: "volumeUp", label: "Ses Artır" },
  { key: "volumeDown", label: "Ses Azalt" },
  { key: "nextTrack", label: "Sonraki Parça" },
  { key: "prevTrack", label: "Önceki Parça" },
  { key: "acceptCall", label: "Çağrı Kabul" },
  { key: "rejectCall", label: "Çağrı Reddet" },
];

function SettingsPage() {
  const { settings, updateSettings } = useTelemetry();
  const [mics, setMics] = useState<Array<{ id: string; label: string }>>([]);
  const [capturing, setCapturing] = useState<keyof RingMapping | null>(null);

  useEffect(() => {
    void listMicrophones().then(setMics);
  }, []);

  useEffect(() => {
    if (!capturing) return;
    const handler = (event: KeyboardEvent) => {
      event.preventDefault();
      updateSettings({ ring: { ...settings.ring, [capturing]: event.key } });
      setCapturing(null);
    };
    window.addEventListener("keydown", handler, { once: true });
    return () => window.removeEventListener("keydown", handler);
  }, [capturing, settings.ring, updateSettings]);

  const toggleGauge = (key: SignalKey) => {
    const current = settings.primaryGauges;
    if (current.includes(key)) {
      if (current.length <= 1) return;
      updateSettings({ primaryGauges: current.filter((k) => k !== key) });
    } else {
      updateSettings({ primaryGauges: [...current, key].slice(-4) });
    }
  };

  return (
    <CockpitShell>
      <div className="flex flex-col gap-3">
        <header className="panel p-4">
          <span className="label-xs">Sistem</span>
          <h1 className="mt-1 text-2xl font-bold">Ayarlar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tema motoru, birincil göstergeler, direksiyon Bluetooth kumandası ve mikrofon
            yönlendirmesi.
          </p>
        </header>

        <section className="panel p-4">
          <span className="label-xs">Gösterge Teması</span>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {THEMES.map((theme) => (
              <button
                key={theme.key}
                onClick={() => updateSettings({ theme: theme.key })}
                className={cn(
                  "rounded-xl border p-4 text-left",
                  settings.theme === theme.key
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/40",
                )}
              >
                <div className="font-semibold">{theme.label}</div>
                <p className="mt-1 text-xs text-muted-foreground">{theme.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="panel p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <span className="label-xs truncate">Birincil Kokpit Göstergeleri (4 adet)</span>
            <span className="digits shrink-0 text-sm text-primary">
              {settings.primaryGauges.length}/4
            </span>
          </div>
          <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
            {SIGNAL_KEYS.map((key) => {
              const active = settings.primaryGauges.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleGauge(key)}
                  className={cn(
                    "truncate rounded-lg border px-3 py-2 text-left text-xs",
                    active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-muted/40",
                  )}
                >
                  {SIGNAL_META[key].short ?? SIGNAL_META[key].label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel p-4">
          <span className="label-xs">Direksiyon Bluetooth Kumanda Eşlemesi</span>
          <p className="mt-1 text-xs text-muted-foreground">
            Bir işleve dokunun, ardından kumanda tuşuna basın. Kumanda ringleri HID tuş kodu
            gönderir.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {RING_KEYS.map((item) => (
              <button
                key={item.key}
                onClick={() => setCapturing(item.key)}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm",
                  capturing === item.key
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/40",
                )}
              >
                <span className="truncate">{item.label}</span>
                <span className="digits shrink-0 rounded bg-muted px-2 py-0.5 text-xs">
                  {capturing === item.key ? "bekliyor…" : settings.ring[item.key]}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel p-4">
          <span className="label-xs">Ses Yönlendirme</span>
          <label className="mt-3 block text-sm">
            Harici mikrofon (3.5mm / USB)
            <select
              value={settings.micDeviceId}
              onChange={(event) => updateSettings({ micDeviceId: event.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
            >
              <option value="">Sistem varsayılanı</option>
              {mics.map((mic) => (
                <option key={mic.id} value={mic.id}>
                  {mic.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0">
              Sürüş verisi kaydı (yerel depolama)
              <span className="block text-xs text-muted-foreground">
                Trip logları CSV / JSON olarak dışa aktarılabilir.
              </span>
            </span>
            <input
              type="checkbox"
              checked={settings.logging}
              onChange={(event) => updateSettings({ logging: event.target.checked })}
              className="h-6 w-6 shrink-0 accent-primary"
            />
          </label>
          <p className="mt-3 text-xs text-muted-foreground">
            Çıkış sesi 3.5mm AUX / DAC hattı üzerinden aracın teybine veya amfisine verilir. Hat
            izolasyonu sayesinde ECU / BCM tarafına voltaj sıçraması gitmez.
          </p>
        </section>
      </div>
    </CockpitShell>
  );
}
