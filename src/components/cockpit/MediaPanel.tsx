import {
  Map as MapIcon,
  Mic,
  MicOff,
  Navigation,
  Pause,
  Phone,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { openMicrophone, type MicSession } from "@/lib/audio";
import { useTelemetry } from "@/lib/telemetry/store";
import { cn } from "@/lib/utils";

function mmss(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export function MediaPanel() {
  const { media, simulateCall, snapshot, settings } = useTelemetry();
  const [micOn, setMicOn] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const sessionRef = useRef<MicSession | null>(null);

  useEffect(() => {
    if (!micOn) {
      sessionRef.current?.stop();
      sessionRef.current = null;
      setMicLevel(0);
      return;
    }
    let frame = 0;
    let cancelled = false;
    openMicrophone(settings.micDeviceId || undefined)
      .then((session) => {
        if (cancelled) return session.stop();
        sessionRef.current = session;
        const loop = () => {
          setMicLevel(session.level());
          frame = requestAnimationFrame(loop);
        };
        loop();
      })
      .catch((error: unknown) => {
        setMicError(error instanceof Error ? error.message : "Mikrofon açılamadı");
        setMicOn(false);
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, [micOn, settings.micDeviceId]);

  const progress = (media.position / media.track.duration) * 100;

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <section className="panel p-4">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <div
            className={cn(
              "grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-xs font-bold",
              media.track.art,
            )}
          >
            ♪
          </div>
          <div className="min-w-0">
            <span className="label-xs">{media.ducked ? "Ducking · ses kısıldı" : "Bluetooth / USB Medya"}</span>
            <h3 className="truncate text-lg font-bold">{media.track.title}</h3>
            <p className="truncate text-sm text-muted-foreground">{media.track.artist}</p>
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={media.track.duration}
          value={media.position}
          onChange={(event) => media.seek(Number(event.target.value))}
          aria-label="Parça konumu"
          className="mt-4 w-full accent-primary"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span className="digits">{mmss(media.position)}</span>
          <span className="digits">{mmss(media.track.duration - media.position)}</span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <button onClick={media.prev} aria-label="Önceki parça" className="grid h-14 place-items-center rounded-xl bg-muted">
            <SkipBack className="h-6 w-6" />
          </button>
          <button
            onClick={media.toggle}
            aria-label={media.playing ? "Duraklat" : "Çal"}
            className="grid h-14 place-items-center rounded-xl bg-primary text-primary-foreground"
          >
            {media.playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>
          <button onClick={media.next} aria-label="Sonraki parça" className="grid h-14 place-items-center rounded-xl bg-muted">
            <SkipForward className="h-6 w-6" />
          </button>
          <button
            onClick={() => simulateCall()}
            aria-label="Gelen çağrı simülasyonu"
            className="grid h-14 place-items-center rounded-xl bg-ok/20 text-ok"
          >
            <Phone className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
          <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={media.volume}
            onChange={(event) => media.setVolume(Number(event.target.value))}
            aria-label="Ses seviyesi"
            className="w-full accent-primary"
          />
        </div>

        <button
          onClick={() => {
            setMicError(null);
            setMicOn((v) => !v);
          }}
          className={cn(
            "mt-3 flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-3 text-sm",
            micOn ? "border-ok/60 bg-ok/10 text-ok" : "border-border bg-muted/40 text-muted-foreground",
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {micOn ? <Mic className="h-4 w-4 shrink-0" /> : <MicOff className="h-4 w-4 shrink-0" />}
            <span className="truncate">Harici mikrofon · AEC + gürültü filtresi</span>
          </span>
          <span className="flex h-3 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
            <span className="h-full bg-ok transition-[width]" style={{ width: `${Math.min(100, micLevel * 260)}%` }} />
          </span>
        </button>
        {micError && <p className="mt-2 text-xs text-destructive">{micError}</p>}
      </section>

      <section className="panel relative min-h-[180px] flex-1 overflow-hidden p-4">
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(oklch(0.4_0.03_240/.5)_1px,transparent_1px),linear-gradient(90deg,oklch(0.4_0.03_240/.5)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <div className="min-w-0">
              <span className="label-xs">Navigasyon</span>
              <h3 className="truncate text-lg font-bold">Harita Paneli</h3>
            </div>
            <MapIcon className="h-5 w-5 shrink-0 text-primary" />
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Navigation className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">Çevrimdışı / çevrimiçi harita katmanı bu konteynere gömülür.</span>
              </p>
              <p className="digits mt-2 text-2xl">
                {snapshot.signals.speed.status === "live" ? snapshot.signals.speed.value.toFixed(0) : "—"}
                <span className="ml-1 text-xs text-muted-foreground">km/h</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
