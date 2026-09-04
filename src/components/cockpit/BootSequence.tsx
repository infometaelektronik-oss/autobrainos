import { Power } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * J.A.R.V.I.S / MBUX tarzı açılış sekansı.
 * Aşama 1: ENGINE START butonu (autoplay kilidini açan ilk etkileşim)
 * Aşama 2: AI çekirdeği + yörünge halkaları
 * Aşama 3: Web Speech API ile Türkçe sesli selamlama + tepkisel animasyon
 * Aşama 4: Dashboard'a pürüzsüz geçiş
 */

const LINES = [
  "Sistem başlatılıyor. Araç donanımları taranıyor...",
  "E.C.U bağlantısı başarılı. Sensörler aktif.",
  "AutoBrain işletim sistemi devrede. Hoş geldin Tolga. İyi yolculuklar.",
];

const BOOT_FLAG = "autobrain:booted";

type Phase = "idle" | "core" | "done";

export function BootSequence({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
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
      window.speechSynthesis?.cancel();
    };
  }, []);

  const finish = useCallback(() => {
    setSpeaking(false);
    setCaption("");
    setFading(true);
    const t = window.setTimeout(() => {
      sessionStorage.setItem(BOOT_FLAG, "1");
      setPhase("done");
    }, 900);
    timers.current.push(t);
  }, []);

  const speakAll = useCallback(() => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth) {
      // Sesi olmayan cihazlarda altyazıyı zamanlayarak akıt.
      LINES.forEach((line, i) => {
        timers.current.push(
          window.setTimeout(() => {
            setCaption(line);
            setSpeaking(true);
          }, i * 2600),
        );
        timers.current.push(
          window.setTimeout(() => setSpeaking(false), i * 2600 + 2200),
        );
      });
      timers.current.push(window.setTimeout(finish, LINES.length * 2600 + 400));
      return;
    }

    synth.cancel();
    LINES.forEach((line, index) => {
      const utter = new SpeechSynthesisUtterance(line);
      utter.lang = "tr-TR";
      utter.rate = 0.98;
      utter.pitch = 1.02;
      utter.onstart = () => {
        setCaption(line);
        setSpeaking(true);
      };
      utter.onend = () => {
        setSpeaking(false);
        if (index === LINES.length - 1) {
          timers.current.push(window.setTimeout(finish, 700));
        }
      };
      utter.onerror = () => {
        setSpeaking(false);
        if (index === LINES.length - 1) finish();
      };
      synth.speak(utter);
    });
    // Güvenlik ağı: konuşma hiç başlamazsa da dashboard'a geç.
    timers.current.push(window.setTimeout(() => {
      if (synth.speaking || synth.pending) return;
      finish();
    }, 22000));
  }, [finish]);

  const start = useCallback(() => {
    setPhase("core");
    timers.current.push(window.setTimeout(speakAll, 1400));
  }, [speakAll]);

  if (!mounted) return null;

  if (phase === "done") {
    return <div className="animate-fade-in">{children}</div>;
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[oklch(0.06_0.01_255)]">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_50%_45%,oklch(0.4_0.12_200/0.25),transparent_60%),radial-gradient(circle_at_50%_120%,oklch(0.4_0.16_320/0.2),transparent_55%)]" />

      {phase === "idle" && (
        <div className="relative flex h-full flex-col items-center justify-center gap-8 px-6">
          <button
            onClick={start}
            className="group relative grid h-44 w-44 place-items-center rounded-full border-2 border-destructive text-destructive [animation:ab-boot-pulse_1.4s_ease-in-out_infinite] [box-shadow:0_0_60px_-10px_var(--destructive),inset_0_0_40px_-18px_var(--destructive)]"
            aria-label="Engine Start"
          >
            <Power className="h-9 w-9" />
            <span className="mt-2 font-display text-sm font-bold tracking-[0.22em] absolute bottom-12">
              ENGINE
            </span>
            <span className="font-display text-sm font-bold tracking-[0.22em] absolute bottom-6">
              START
            </span>
          </button>
          <p className="max-w-xs text-center text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Sistemi başlatmak için dokunun
          </p>
        </div>
      )}

      {phase === "core" && (
        <div
          className={`relative flex h-full flex-col items-center justify-center transition-opacity duration-700 ${fading ? "opacity-0" : "opacity-100"}`}
        >
          <AICore speaking={speaking} />
          <div className="mt-14 h-16 px-6 text-center">
            <p
              className={`font-display text-base tracking-[0.08em] transition-colors duration-300 sm:text-xl ${
                speaking ? "text-accent" : "text-primary"
              }`}
            >
              {caption}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function AICore({ speaking }: { speaking: boolean }) {
  const tone = speaking ? "var(--accent)" : "var(--primary)";
  return (
    <div
      className="relative grid h-64 w-64 place-items-center sm:h-80 sm:w-80"
      style={{ color: tone, transition: "color 300ms ease" }}
    >
      {[
        { size: "100%", dur: "7s", dir: "normal", rx: 74 },
        { size: "80%", dur: "5s", dir: "reverse", rx: 22 },
        { size: "60%", dur: "3.6s", dir: "normal", rx: 58 },
      ].map((ring, i) => (
        <div
          key={i}
          className="absolute rounded-full border-2"
          style={{
            width: ring.size,
            height: ring.size,
            borderColor: `color-mix(in oklab, ${tone} ${70 - i * 12}%, transparent)`,
            transform: `rotateX(${ring.rx}deg)`,
            animation: `ab-boot-spin ${ring.dur} linear infinite ${ring.dir}`,
            boxShadow: `0 0 26px -8px ${tone}`,
            transition: "border-color 300ms ease",
          }}
        />
      ))}
      <div
        className="h-20 w-20 rounded-full sm:h-24 sm:w-24"
        style={{
          background: `radial-gradient(circle at 40% 35%, color-mix(in oklab, ${tone} 92%, white), ${tone} 55%, transparent 78%)`,
          boxShadow: `0 0 70px -6px ${tone}`,
          animation: speaking
            ? "ab-boot-react 0.32s ease-in-out infinite"
            : "ab-boot-breathe 3s ease-in-out infinite",
        }}
      />
    </div>
  );
}
