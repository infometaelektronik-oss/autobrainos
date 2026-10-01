import { Mic, MicOff, Snowflake, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  cancelSpeech,
  listen,
  recognitionSupported,
  speak,
  subscribeSpeech,
  type RecognitionHandle,
} from "@/lib/ai/speech";
import { buildInsights, driveModeOf, interpretCommand, DRIVE_MODE_LABEL } from "@/lib/ai/copilot";
import { useTelemetry } from "@/lib/telemetry/store";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Klimayı 22 dereceye ayarla",
  "En yakın şarj istasyonunu bul",
  "Araç durumu nedir",
  "Sonraki parçaya geç",
];

/** Boot ekranındaki hologramın kalıcı, küçültülmüş kokpit versiyonu. */
export function AICopilot() {
  const { snapshot, diagnostics, media } = useTelemetry();
  const [speaking, setSpeaking] = useState(false);
  const [caption, setCaption] = useState("");
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [log, setLog] = useState<Array<{ id: string; role: "user" | "ai"; text: string }>>([]);
  const [climate, setClimate] = useState(21);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<RecognitionHandle | null>(null);
  const announcedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = subscribeSpeech((next, text) => {
      setSpeaking(next);
      setCaption(next ? text : "");
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const insights = useMemo(() => buildInsights(snapshot, diagnostics), [snapshot, diagnostics]);
  const mode = driveModeOf(snapshot);
  const worst = insights.some((i) => i.severity === "critical")
    ? "critical"
    : insights.some((i) => i.severity === "warn")
      ? "warn"
      : "info";

  // Otoyol/Odak modunda sesli asistan paneli kapanır, yalnız hologram kalır.
  useEffect(() => {
    if (mode === "highway") setOpen(false);
  }, [mode]);

  const rpm = snapshot.signals.rpm.value;
  const load = Number.isFinite(rpm) ? Math.min(1, Math.max(0, rpm / 6000)) : 0;


  const say = useCallback(
    (text: string) => {
      if (muted) {
        setCaption(text);
        window.setTimeout(() => setCaption(""), 2600);
        return;
      }
      speak(text);
    },
    [muted],
  );

  // Proaktif sesli bildirim: yeni kritik yorum çıktığında asistan konuşur.
  useEffect(() => {
    const critical = insights.find((i) => i.severity === "critical");
    if (!critical || announcedRef.current.has(critical.id)) return;
    announcedRef.current.add(critical.id);
    say(critical.message);
    setLog((prev) => [
      ...prev.slice(-8),
      { id: `${critical.id}-${Date.now()}`, role: "ai", text: critical.message },
    ]);
  }, [insights, say]);

  const runCommand = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setLog((prev) => [...prev.slice(-8), { id: `u-${Date.now()}`, role: "user", text }]);
      const result = interpretCommand(text, snapshot);
      if (result.climateTarget) setClimate(result.climateTarget);
      if (result.mediaAction === "next") media.next();
      else if (result.mediaAction === "prev") media.prev();
      else if (result.mediaAction === "play" && !media.playing) media.toggle();
      else if (result.mediaAction === "pause" && media.playing) media.toggle();
      setLog((prev) => [
        ...prev.slice(-8),
        { id: `a-${Date.now()}`, role: "ai", text: result.reply },
      ]);
      say(result.reply);
    },
    [media, say, snapshot],
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
        <p className="pointer-events-none max-w-full truncate rounded-full bg-background/85 px-4 py-1.5 text-center text-xs text-primary backdrop-blur">
          {caption}
        </p>
      )}

      {open && (
        <section
          aria-label="Sesli asistan paneli"
          className="panel pointer-events-auto w-full space-y-3 p-3 backdrop-blur"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="label-xs !text-primary">AI Copilot · {DRIVE_MODE_LABEL[mode]}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
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
            <span className="digits ml-auto text-base">{climate}°C</span>
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
          onClick={() => setOpen((o) => !o)}
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
      </div>
    </div>
  );
}
