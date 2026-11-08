import { useNavigate } from "@tanstack/react-router";
import {
  ListOrdered,
  Mic,
  MicOff,
  Minus,
  Plus,
  Snowflake,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { executeCommand } from "@/lib/ai/commandActions";
import { buildInsights, driveModeOf, interpretCommand, DRIVE_MODE_LABEL } from "@/lib/ai/copilot";
import { useDriverAssist } from "@/lib/ai/driverAssist";
import {
  cancelSpeech,
  listen,
  recognitionSupported,
  speak,
  subscribeSpeech,
  subscribeSpeechQueue,
  type RecognitionHandle,
} from "@/lib/ai/speech";
import { useTelemetry } from "@/lib/telemetry/store";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Klimayı 22 dereceye ayarla",
  "En yakın şarj istasyonunu bul",
  "Araç durumu nedir",
  "Sonraki parçaya geç",
];

const SEVERITY_RANK = { info: 0, warn: 1, critical: 2 } as const;

/** Boot ekranındaki hologramın kalıcı, küçültülmüş kokpit versiyonu. */
export function AICopilot() {
  const navigate = useNavigate();
  const {
    snapshot,
    diagnostics,
    media,
    climate,
    setClimateTarget,
    findChargingStations,
    showNavigation,
  } = useTelemetry();
  const [speaking, setSpeaking] = useState(false);
  const [caption, setCaption] = useState("");
  const [queueCount, setQueueCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [log, setLog] = useState<Array<{ id: string; role: "user" | "ai"; text: string }>>([]);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<RecognitionHandle | null>(null);
  const announcedRef = useRef<Map<string, number>>(new Map());
  const safetyRef = useRef<{ key: string; at: number } | null>(null);

  useEffect(
    () =>
      subscribeSpeech((next, text) => {
        setSpeaking(next);
        setCaption(text);
      }),
    [],
  );

  useEffect(() => subscribeSpeechQueue(setQueueCount), []);

  const insights = useMemo(() => buildInsights(snapshot, diagnostics), [snapshot, diagnostics]);
  const assist = useDriverAssist(snapshot);
  const mode = driveModeOf(snapshot);
  const highway = mode === "highway";
  const worst = insights.some((i) => i.severity === "critical")
    ? "critical"
    : insights.some((i) => i.severity === "warn")
      ? "warn"
      : "info";

  // Odak modunda yalnız hologram kalır; panel ve mikrofon kontrolü gizlenir.
  useEffect(() => {
    if (!highway) return;
    setOpen(false);
    handleRef.current?.stop();
    handleRef.current = null;
    setListening(false);
  }, [highway]);

  const rpm = snapshot.signals.rpm.value;
  const load = Number.isFinite(rpm) ? Math.min(1, Math.max(0, rpm / 6000)) : 0;

  const say = useCallback(
    (text: string) => {
      // speak() mevcut anlatımı kesmez; ses ve altyazı aynı sırayla ilerler.
      speak(text, { silent: muted });
    },
    [muted],
  );

  const appendAiLog = useCallback((id: string, text: string) => {
    setLog((prev) => [...prev.slice(-8), { id, role: "ai", text }]);
  }, []);

  // Yeni uyarılar kuyruğa girer; aynı seviye tekrar okunmaz, seviye artışı yeniden bildirilir.
  useEffect(() => {
    const alerts = insights
      .filter((insight) => insight.severity !== "info")
      .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

    for (const insight of alerts) {
      const rank = SEVERITY_RANK[insight.severity];
      const previous = announcedRef.current.get(insight.id) ?? -1;
      if (previous >= rank) continue;
      announcedRef.current.set(insight.id, rank);
      const text = `${insight.title}. ${insight.message}${insight.action ? ` ${insight.action}` : ""}`;
      say(text);
      appendAiLog(`${insight.id}-${Date.now()}-${rank}`, text);
    }
  }, [insights, say, appendAiLog]);

  // Radar ve şerit müdahalesi de aynı kesintisiz bildirim kuyruğunu kullanır.
  useEffect(() => {
    const key =
      assist.gapRating === "critical" ? "gap" : assist.lane === "intervention" ? "lane" : null;
    if (!key) return;
    const now = Date.now();
    if (safetyRef.current?.key === key && now - safetyRef.current.at < 20_000) return;
    safetyRef.current = { key, at: now };
    const text =
      key === "gap"
        ? "Takip mesafesi kritik. Öndeki araçla güvenli mesafeyi artır."
        : "Şeritten ayrılma riski var. Direksiyon kontrolünü düzelt.";
    say(text);
    appendAiLog(`safety-${key}-${now}`, text);
  }, [assist.gapRating, assist.lane, say, appendAiLog]);

  const runCommand = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setLog((prev) => [...prev.slice(-8), { id: `u-${Date.now()}`, role: "user", text }]);
      const result = interpretCommand(text, snapshot);
      executeCommand(result, {
        setClimate: setClimateTarget,
        findChargingStations: () => {
          void navigate({ to: "/" });
          findChargingStations();
        },
        showNavigation: () => {
          void navigate({ to: "/" });
          showNavigation();
        },
        showDiagnostics: () => {
          void navigate({ to: "/" });
          window.setTimeout(() => {
            document.getElementById("ai-analysis-panel")?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }, 0);
        },
        media,
      });
      appendAiLog(`a-${Date.now()}`, result.reply);
      say(result.reply);
    },
    [appendAiLog, findChargingStations, media, say, setClimateTarget, showNavigation, snapshot],
  );

  const toggleListening = useCallback(() => {
    setError(null);
    if (listening) {
      handleRef.current?.stop();
      handleRef.current = null;
      setListening(false);
      return;
    }
    cancelSpeech();
    setOpen(true);
    setInterim("");
    const handle = listen({
      onInterim: setInterim,
      onFinal: (text) => {
        setInterim("");
        runCommand(text);
      },
      onEnd: () => {
        setListening(false);
        handleRef.current = null;
      },
      onError: (message) => setError(message),
    });
    handleRef.current = handle;
    setListening(handle !== null);
  }, [listening, runCommand]);

  return (
    <div className="pointer-events-none fixed bottom-3 left-1/2 z-40 flex w-[min(100%-1rem,720px)] -translate-x-1/2 flex-col items-center gap-2">
      {caption && (
        <div className="pointer-events-none flex max-w-full items-center gap-2 rounded-xl bg-background/90 px-4 py-2 text-center text-xs text-primary shadow-lg backdrop-blur">
          <p className="line-clamp-2">{caption}</p>
          {queueCount > 0 && (
            <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold">
              +{queueCount}
            </span>
          )}
        </div>
      )}

      {open && !highway && (
        <section
          aria-label="Sesli asistan paneli"
          className="panel pointer-events-auto w-full space-y-3 p-3 backdrop-blur"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="label-xs !text-primary">AI Copilot · {DRIVE_MODE_LABEL[mode]}</span>
            <div className="flex items-center gap-1">
              {queueCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-primary/12 px-2 py-1 text-[10px] text-primary">
                  <ListOrdered className="h-3 w-3" /> {queueCount} sırada
                </span>
              )}
              <button
                type="button"
                onClick={() => setMuted((value) => !value)}
                aria-label={muted ? "Sesi aç" : "Sesi kapat"}
                className="rounded-md border border-border p-1.5 text-muted-foreground"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Asistan panelini kapat"
                className="rounded-md border border-border p-1.5 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
            <Snowflake className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-muted-foreground">Klima hedefi</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                aria-label="Klima sıcaklığını azalt"
                onClick={() => setClimateTarget(climate.target - 1)}
                className="grid h-7 w-7 place-items-center rounded-md border border-border"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="digits min-w-12 text-center text-base">{climate.target}°C</span>
              <button
                type="button"
                aria-label="Klima sıcaklığını artır"
                onClick={() => setClimateTarget(climate.target + 1)}
                className="grid h-7 w-7 place-items-center rounded-md border border-border"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-40 space-y-1.5 overflow-y-auto">
            {log.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Mikrofona dokun ve konuş: klima, navigasyon, şarj istasyonu, müzik veya araç durumu.
              </p>
            ) : (
              log.map((entry) => (
                <p
                  key={entry.id}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-xs",
                    entry.role === "user"
                      ? "bg-muted/60 text-foreground"
                      : "bg-primary/12 text-primary",
                  )}
                >
                  {entry.text}
                </p>
              ))
            )}
            {interim && <p className="px-2.5 text-xs italic text-muted-foreground">{interim}…</p>}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {!recognitionSupported() && (
            <p className="text-xs text-muted-foreground">
              Bu tarayıcı canlı ses tanımayı desteklemiyor; hazır komutları kullanabilirsin.
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => runCommand(suggestion)}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          aria-label="AI Copilot"
          onClick={() => setOpen((value) => !value)}
          className="relative grid h-16 w-16 place-items-center rounded-full"
        >
          <span
            className={cn(
              "absolute inset-0 rounded-full border",
              speaking
                ? "border-secondary/70"
                : worst === "critical"
                  ? "border-destructive/70"
                  : worst === "warn"
                    ? "border-warn/70"
                    : "border-primary/60",
            )}
            style={{ animation: "ab-boot-spin 6s linear infinite" }}
          />
          <span
            className={cn(
              "absolute inset-2 rounded-full border border-dashed",
              speaking ? "border-secondary/50" : "border-primary/40",
            )}
            style={{ animation: "ab-boot-spin 4s linear infinite reverse" }}
          />
          <span
            className={cn(
              "h-7 w-7 rounded-full",
              speaking
                ? "bg-secondary glow-primary"
                : worst === "critical"
                  ? "bg-destructive"
                  : worst === "warn"
                    ? "bg-warn"
                    : "bg-primary glow-primary",
            )}
            style={{
              animation: speaking
                ? "ab-boot-react 0.5s ease-in-out infinite"
                : "ab-boot-breathe 2.6s ease-in-out infinite",
              transform: `scale(${1 + load * 0.35})`,
            }}
          />
          <Sparkles className="relative h-4 w-4 text-background" />
        </button>

        {!highway && (
          <button
            type="button"
            onClick={toggleListening}
            aria-label={listening ? "Dinlemeyi durdur" : "Sesli komutu başlat"}
            className={cn(
              "grid h-12 w-12 place-items-center rounded-full border",
              listening
                ? "border-secondary bg-secondary/20 text-secondary"
                : "border-border bg-background/80 text-muted-foreground",
            )}
          >
            {listening ? <Mic className="h-5 w-5 animate-pulse" /> : <MicOff className="h-5 w-5" />}
          </button>
        )}
      </div>
    </div>
  );
}
