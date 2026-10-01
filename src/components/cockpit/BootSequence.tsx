import { Check, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { speakAsync, cancelSpeech, unlockAudio } from "@/lib/ai/speech";
import { playBootChime } from "@/lib/audio";

/**
 * Modern işletim sistemi açılışı:
 * dokunuş → sinematik açılış sesi + kendini çizen AutoBrain işareti →
 * akan sistem durum satırları → ChatGPT sesiyle karşılama → panele geçiş.
 */

const LINES = [
  "Sistem başlatılıyor. Araç donanımları taranıyor.",
  "E.C.U bağlantısı başarılı, sensörler aktif.",
  "AutoBrain işletim sistemi devrede. Hoş geldin Tolga, iyi yolculuklar.",
];

const STEPS = [
  { label: "Çekirdek ve bellek", delay: 250 },
  { label: "Güç ve enerji yönetimi", delay: 900 },
  { label: "E.C.U / CAN-Bus veri yolu", delay: 1650 },
  { label: "Sensör ağı ve kalibrasyon", delay: 2400 },
  { label: "Yapay zeka teşhis motoru", delay: 3100 },
];

const BOOT_FLAG = "autobrain:booted";

type Phase = "idle" | "boot" | "done";

export function BootSequence({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [caption, setCaption] = useState("");
  const [fading, setFading] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && sessionStorage.getItem(BOOT_FLAG) === "1") {
      setPhase("done");
    }
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      cancelSpeech();
    };
  }, []);

  const finish = useCallback(() => {
    setSpeaking(false);
    setCaption("");
    setFading(true);
    const t = window.setTimeout(() => {
      sessionStorage.setItem(BOOT_FLAG, "1");
      setPhase("done");
    }, 850);
    timers.current.push(t);
  }, []);

  const narrate = useCallback(async () => {
    for (const line of LINES) {
      setCaption(line);
      setSpeaking(true);
      await speakAsync(line, { style: "boot", remember: true });
      setSpeaking(false);
      await new Promise<void>((resolve) => {
        timers.current.push(window.setTimeout(resolve, 260));
      });
    }
    finish();
  }, [finish]);

  const start = useCallback(() => {
    unlockAudio();
    playBootChime();
    setPhase("boot");

    STEPS.forEach((item, index) => {
      timers.current.push(window.setTimeout(() => setStep(index), item.delay));
    });
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startedAt) / 3800) * 100);
      setProgress(pct);
      if (pct >= 100) window.clearInterval(tick);
    }, 60);
    timers.current.push(window.setTimeout(() => void narrate(), 3900));
  }, [narrate]);

  if (!mounted) return null;
  if (phase === "done") return <div className="animate-fade-in">{children}</div>;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[oklch(0.05_0.012_250)] text-foreground">
      {/* arka plan: derin ızgara + tarama dalgası */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:linear-gradient(oklch(0.72_0.14_200/0.5)_1px,transparent_1px),linear-gradient(90deg,oklch(0.72_0.14_200/0.5)_1px,transparent_1px)] [background-size:46px_46px] [mask-image:radial-gradient(circle_at_50%_45%,black,transparent_72%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_50%_40%,oklch(0.45_0.13_200/0.28),transparent_62%),radial-gradient(circle_at_50%_115%,oklch(0.45_0.17_320/0.22),transparent_58%)]" />
      <div
        className="pointer-events-none absolute inset-x-0 h-40 bg-[linear-gradient(to_bottom,transparent,oklch(0.8_0.14_195/0.12),transparent)]"
        style={{ animation: "ab-boot-sweep 3.6s cubic-bezier(.4,0,.2,1) infinite" }}
      />

      <div
        className={`relative flex h-full flex-col items-center justify-center gap-7 px-6 transition-all duration-700 ${
          fading ? "scale-[1.04] opacity-0" : "opacity-100"
        }`}
      >
        <Mark active={phase === "boot"} speaking={speaking} />

        <h1 className="font-display text-2xl font-bold tracking-[0.42em] text-primary sm:text-4xl">
          AUTOBRAIN
        </h1>
        <p className="-mt-5 text-[10px] tracking-[0.5em] text-muted-foreground uppercase">
          Vehicle Operating System
        </p>

        {phase === "idle" ? (
          <button
            onClick={start}
            aria-label="Sistemi Başlat"
            className="group relative mt-2 overflow-hidden rounded-full border border-primary/60 px-9 py-3.5 font-display text-xs font-bold tracking-[0.3em] text-primary uppercase [box-shadow:0_0_50px_-18px_var(--primary)]"
          >
            <span
              className="pointer-events-none absolute inset-0 rounded-full border border-primary/50"
              style={{ animation: "ab-boot-pulse 1.8s ease-in-out infinite" }}
            />
            <span className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              Sistemi Başlat
              <ChevronRight className="h-4 w-4" />
            </span>
          </button>
        ) : (
          <div className="w-full max-w-sm">
            <div className="h-1 w-full overflow-hidden rounded-full bg-primary/15">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-100 [box-shadow:0_0_16px_0_var(--primary)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <ul className="mt-4 space-y-1.5">
              {STEPS.map((item, index) => (
                <li
                  key={item.label}
                  className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-xs transition-opacity duration-500 ${
                    index <= step ? "opacity-100" : "opacity-25"
                  }`}
                >
                  {index < step ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                  )}
                  <span className="truncate text-muted-foreground">{item.label}</span>
                  <span className="font-mono text-[10px] text-primary">
                    {index < step ? "OK" : index === step ? "…" : ""}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 min-h-12 text-center">
              <p
                className={`font-display text-sm leading-snug tracking-[0.04em] transition-colors duration-300 sm:text-base ${
                  speaking ? "text-secondary" : "text-primary/80"
                }`}
              >
                {caption}
              </p>
            </div>

            <button
              onClick={finish}
              className="mx-auto mt-2 block text-[10px] tracking-[0.3em] text-muted-foreground uppercase"
            >
              Atla
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Kendini çizen AutoBrain işareti; konuşurken magentaya döner ve titreşir. */
function Mark({ active, speaking }: { active: boolean; speaking: boolean }) {
  const tone = speaking ? "var(--secondary)" : "var(--primary)";
  return (
    <div
      className="relative grid h-40 w-40 place-items-center sm:h-52 sm:w-52"
      style={{ color: tone, transition: "color 300ms ease" }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="0.6"
        />
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeDasharray="289"
          style={{
            strokeDashoffset: active ? 0 : 289,
            transition: "stroke-dashoffset 2.6s cubic-bezier(.22,1,.36,1)",
          }}
          transform="rotate(-90 50 50)"
        />
        <path
          d="M50 20 L72 72 L50 60 L28 72 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeDasharray="190"
          style={{
            strokeDashoffset: active ? 0 : 190,
            transition: "stroke-dashoffset 2.2s cubic-bezier(.22,1,.36,1) 0.3s",
            filter: `drop-shadow(0 0 6px ${tone})`,
          }}
        />
      </svg>

      <div
        className="absolute rounded-full border"
        style={{
          width: "72%",
          height: "72%",
          borderColor: `color-mix(in oklab, ${tone} 45%, transparent)`,
          animation: "ab-boot-spin 7s linear infinite",
        }}
      />
      <div
        className="h-10 w-10 rounded-full sm:h-12 sm:w-12"
        style={{
          background: `radial-gradient(circle at 40% 35%, color-mix(in oklab, ${tone} 92%, white), ${tone} 58%, transparent 80%)`,
          boxShadow: `0 0 60px 0 ${tone}`,
          animation: speaking
            ? "ab-boot-react 0.34s ease-in-out infinite"
            : "ab-boot-breathe 3s ease-in-out infinite",
        }}
      />
    </div>
  );
}
