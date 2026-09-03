import type { DiagnosticMessage, TelemetrySnapshot } from "./types";

type Rule = {
  id: string;
  severity: DiagnosticMessage["severity"];
  test: (s: TelemetrySnapshot) => boolean;
  text: (s: TelemetrySnapshot) => string;
  detail?: string;
};

const v = (s: TelemetrySnapshot, key: keyof TelemetrySnapshot["signals"]) => {
  const sig = s.signals[key];
  return sig && sig.status !== "unsupported" && Number.isFinite(sig.value) ? sig.value : null;
};

const has = (s: TelemetrySnapshot, key: keyof TelemetrySnapshot["signals"]) =>
  s.signals[key]?.status === "live" || s.signals[key]?.status === "calculated";

/** Offline, rule-based predictive diagnostics. Output is plain Turkish. */
export const RULES: Rule[] = [
  {
    id: "vacuum-leak",
    severity: "warn",
    test: (s) => {
      const ltft = v(s, "ltft");
      const map = v(s, "map");
      const rpm = v(s, "rpm");
      return ltft !== null && map !== null && rpm !== null && ltft > 9 && map < 1.0 && rpm > 700;
    },
    text: () => "⚠️ Emme manifoldunda veya vakum hortumunda hava kaçağı var.",
    detail:
      "LTFT pozitif yönde sapıyor ve MAP beklenenden düşük. Manifold contası ve vakum hortumlarını kontrol edin.",
  },
  {
    id: "coolant-high",
    severity: "warn",
    test: (s) => (v(s, "coolant") ?? 0) >= 97,
    text: (s) =>
      `⚠️ Motor soğutma suyu ${(v(s, "coolant") ?? 0).toFixed(0)}°C, radyatör fanı ${s.flags.fanOn ? "devrede" : "devrede değil"}.`,
    detail:
      "Uzun süreli yüksek hararet silindir kapağına zarar verir. Fan, termostat ve su seviyesini kontrol edin.",
  },
  {
    id: "coolant-critical",
    severity: "critical",
    test: (s) => (v(s, "coolant") ?? 0) > 105,
    text: (s) =>
      `🛑 KRİTİK AŞIRI ISINMA! Hararet ${(v(s, "coolant") ?? 0).toFixed(0)}°C. Aracı güvenli şekilde durdurun.`,
  },
  {
    id: "oil-pressure",
    severity: "critical",
    test: (s) =>
      has(s, "oilPressure") && (v(s, "oilPressure") ?? 9) < 0.5 && (v(s, "rpm") ?? 0) > 600,
    text: () => "🛑 MOTOR YAĞ BASINCI YOK! Motoru derhal durdurun.",
    detail:
      "Yağ pompası, basınç sensörü veya yağ seviyesi kritik. Motoru çalıştırmaya devam etmek sarma riski taşır.",
  },
  {
    id: "starter-drop",
    severity: "warn",
    test: (s) => (v(s, "crankMinVoltage") ?? 12) < 10,
    text: (s) =>
      `⚠️ Akü marş voltajı ${(v(s, "crankMinVoltage") ?? 0).toFixed(1)}V'a düştü, akü şarj tutmuyor.`,
    detail:
      "Marş anındaki voltaj çöküşü akü içi plaka yorgunluğunu işaret eder. Akü testi yapılmalı.",
  },
  {
    id: "charge-low",
    severity: "warn",
    test: (s) => (v(s, "voltage") ?? 14) < 12.4 && !s.flags.cranking && (v(s, "rpm") ?? 0) > 700,
    text: (s) =>
      `⚠️ Şarj voltajı ${(v(s, "voltage") ?? 0).toFixed(2)}V — dinamo yeterli şarj vermiyor.`,
  },
  {
    id: "alternator-ripple",
    severity: "warn",
    test: (s) => (v(s, "alternatorRipple") ?? 0) > 180,
    text: () => "⚠️ Şarj dinamosu voltajında dalgalanma var, diyot tablası arızalı olabilir.",
    detail:
      "AC ripple değeri normalin üzerinde. Dinamo diyot tablası veya regülatör kontrol edilmeli.",
  },
  {
    id: "wss-mismatch",
    severity: "warn",
    test: (s) => {
      const fl = s.signals.wssFL;
      if (fl?.status === "stale" || fl?.status === "unsupported") return (v(s, "speed") ?? 0) > 5;
      const speeds = [v(s, "wssFL"), v(s, "wssFR"), v(s, "wssRL"), v(s, "wssRR")].filter(
        (x): x is number => x !== null,
      );
      if (speeds.length < 4 || (v(s, "speed") ?? 0) < 12) return false;
      return Math.max(...speeds) - Math.min(...speeds) > 8;
    },
    text: (s) =>
      s.signals.wssFL?.status === "stale"
        ? "⚠️ Sol ön tekerlek ABS hız sensörü veri vermiyor."
        : "⚠️ Tekerlek hızları arasında fark var, ABS sensörü veya patinaj kontrol edilmeli.",
  },
  {
    id: "brake-fluid",
    severity: "critical",
    test: (s) => has(s, "brakeFluidLevel") && (v(s, "brakeFluidLevel") ?? 100) < 25,
    text: () => "🛑 FREN HİDROLİĞİ KRİTİK SEVİYEDE! Fren kaybı riski var, aracı durdurun.",
  },
  {
    id: "brake-moisture",
    severity: "info",
    test: (s) => (v(s, "brakeFluidMoisture") ?? 0) > 2.5,
    text: () => "ℹ️ Fren yağı nem oranı yüksek, hidrolik değişimi öneriliyor.",
  },
  {
    id: "pad-wear",
    severity: "warn",
    test: (s) => Math.min(v(s, "padWearFront") ?? 100, v(s, "padWearRear") ?? 100) < 20,
    text: () => "⚠️ Balata kalınlığı sınırın altına yaklaştı, balata değişimi planlayın.",
  },
  {
    id: "misfire",
    severity: "warn",
    test: (s) =>
      Math.max(
        v(s, "misfire1") ?? 0,
        v(s, "misfire2") ?? 0,
        v(s, "misfire3") ?? 0,
        v(s, "misfire4") ?? 0,
      ) > 5,
    text: (s) => {
      const counts = [
        v(s, "misfire1") ?? 0,
        v(s, "misfire2") ?? 0,
        v(s, "misfire3") ?? 0,
        v(s, "misfire4") ?? 0,
      ];
      const worst = counts.indexOf(Math.max(...counts)) + 1;
      return `⚠️ ${worst}. silindirde tekleme sayımı artıyor, bujı/bobin veya enjektör kontrol edilmeli.`;
    },
  },
  {
    id: "knock",
    severity: "warn",
    test: (s) => (v(s, "knockRetard") ?? 0) > 3,
    text: () =>
      "⚠️ Vuruntu sensörü avansı geri çekiyor, yakıt kalitesi veya karbon birikmesi kontrol edilmeli.",
  },
  {
    id: "egt-high",
    severity: "warn",
    test: (s) => (v(s, "egt") ?? 0) > 780,
    text: (s) =>
      `⚠️ Egzoz gazı sıcaklığı ${(v(s, "egt") ?? 0).toFixed(0)}°C, turbo ve DPF için riskli bölgede.`,
  },
  {
    id: "dpf",
    severity: "warn",
    test: (s) => s.flags.regen === "blocked" || (v(s, "dpfSoot") ?? 0) > 24,
    text: (s) =>
      s.flags.regen === "blocked"
        ? "⚠️ DPF rejenerasyonu tamamlanamıyor, filtre tıkanma yolunda."
        : `⚠️ DPF kurum yükü ${(v(s, "dpfSoot") ?? 0).toFixed(1)} g — uzun yol sürüşü ile rejenerasyona izin verin.`,
  },
  {
    id: "egr-feedback",
    severity: "warn",
    test: (s) => (v(s, "egrError") ?? 0) > 6,
    text: () => "⚠️ EGR valfi istenen pozisyona ulaşmıyor, valf kurum nedeniyle sıkışmış olabilir.",
    detail:
      "EGR geri bildirim hatası yüksek. Valf ve emme kolektöründe kurum temizliği gerekebilir.",
  },
  {
    id: "iat-high",
    severity: "info",
    test: (s) => (v(s, "iat") ?? 0) > 65,
    text: () => "ℹ️ Emme havası sıcaklığı yüksek, intercooler verimi düşük olabilir.",
  },
  {
    id: "tpms",
    severity: "warn",
    test: (s) =>
      Math.min(v(s, "tpmsFL") ?? 9, v(s, "tpmsFR") ?? 9, v(s, "tpmsRL") ?? 9, v(s, "tpmsRR") ?? 9) <
      2.0,
    text: (s) => {
      const map: Array<[string, number | null]> = [
        ["sol ön", v(s, "tpmsFL")],
        ["sağ ön", v(s, "tpmsFR")],
        ["sol arka", v(s, "tpmsRL")],
        ["sağ arka", v(s, "tpmsRR")],
      ];
      const low = map.filter(([, p]) => p !== null && p < 2.0).map(([n]) => n);
      return `⚠️ ${low.join(", ")} lastik basıncı düşük, TPMS uyarı veriyor.`;
    },
  },
  {
    id: "healthy",
    severity: "info",
    test: () => true,
    text: () => "✅ Tüm sistemler normal aralıkta. Sürüş verileri kaydediliyor.",
  },
];

export function runDiagnostics(snapshot: TelemetrySnapshot): DiagnosticMessage[] {
  const out: DiagnosticMessage[] = [];
  for (const rule of RULES) {
    if (rule.id === "healthy") continue;
    let ok = false;
    try {
      ok = rule.test(snapshot);
    } catch {
      ok = false;
    }
    if (ok) {
      out.push({
        id: rule.id,
        severity: rule.severity,
        text: rule.text(snapshot),
        detail: rule.detail,
        at: snapshot.at,
      });
    }
  }
  if (out.length === 0) {
    out.push({
      id: "healthy",
      severity: "info",
      text: "✅ Tüm sistemler normal aralıkta. Sürüş verileri kaydediliyor.",
      at: snapshot.at,
    });
  }
  const order = { critical: 0, warn: 1, info: 2 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}
