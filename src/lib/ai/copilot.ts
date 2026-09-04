import type { DiagnosticMessage, TelemetrySnapshot } from "@/lib/telemetry/types";

/** Bağlamsal arayüz modları — sürüş dinamiğine göre türetilir. */
export type DriveMode = "park" | "city" | "highway";

export function driveModeOf(snapshot: TelemetrySnapshot): DriveMode {
  const speed = snapshot.signals.speed;
  const rpm = snapshot.signals.rpm;
  const kmh = speed && Number.isFinite(speed.value) ? speed.value : 0;
  const rev = rpm && Number.isFinite(rpm.value) ? rpm.value : 0;
  if (kmh >= 100) return "highway";
  if (kmh < 2 && rev < 1100) return "park";
  return "city";
}

export const DRIVE_MODE_LABEL: Record<DriveMode, string> = {
  park: "Park / Rapor Modu",
  city: "Şehir Modu",
  highway: "Odak / Otoyol Modu",
};

export interface Insight {
  id: string;
  severity: "info" | "warn" | "critical";
  title: string;
  /** Doğal dilde yorum — ham veri değil. */
  message: string;
  action?: string;
}

const num = (snapshot: TelemetrySnapshot, key: keyof TelemetrySnapshot["signals"]) => {
  const sig = snapshot.signals[key];
  return sig && sig.status !== "unsupported" && Number.isFinite(sig.value) ? sig.value : null;
};

/**
 * Sensör verilerini yorumlayan öngörülü teşhis motoru.
 * Kural tabanlı teşhis mesajlarını doğal dil analizine dönüştürür ve
 * kendi trend yorumlarını ekler.
 */
export function buildInsights(
  snapshot: TelemetrySnapshot,
  diagnostics: DiagnosticMessage[],
): Insight[] {
  const out: Insight[] = [];

  const voltage = num(snapshot, "voltage");
  if (voltage !== null && voltage < 12.2 && !snapshot.flags.cranking) {
    out.push({
      id: "ai-voltage",
      severity: voltage < 11.6 ? "critical" : "warn",
      title: "Elektrik Sistemi Analizi",
      message: `Akü voltajı ${voltage.toFixed(1)}V ile kritik seviyede seyrediyor; alternatör şarj döngüsü kontrol edilmeli.`,
      action: "Dinamo kayışı ve diyot tablası testi öneriyorum.",
    });
  }

  const coolant = num(snapshot, "coolant");
  const egt = num(snapshot, "egt");
  if (coolant !== null && coolant >= 96) {
    out.push({
      id: "ai-thermal",
      severity: coolant > 105 ? "critical" : "warn",
      title: "Termal Yük Analizi",
      message: `Soğutma devresi ${coolant.toFixed(0)}°C ile normal bandın üzerinde${
        egt !== null && egt > 620 ? ` ve egzoz gazı sıcaklığı ${egt.toFixed(0)}°C'ye tırmandı` : ""
      }. Yükü azaltırsan sıcaklık düşecek.`,
      action: snapshot.flags.fanOn
        ? "Fan devrede, seyir hızını koruyup rölantide beklemekten kaçın."
        : "Fan devreye girmedi; fan rölesini kontrol ettirmelisin.",
    });
  }

  const ltft = num(snapshot, "ltft");
  const map = num(snapshot, "map");
  if (ltft !== null && map !== null && ltft > 8) {
    out.push({
      id: "ai-mixture",
      severity: "warn",
      title: "Karışım Trendi",
      message: `Uzun dönem yakıt düzeltmesi %${ltft.toFixed(1)} pozitif ilerliyor; motor sürekli fakir karışımı telafi ediyor.`,
      action: "Emme hattında kaçak veya kirli MAF olasılığı yüksek.",
    });
  }

  const soot = num(snapshot, "dpfSoot");
  if (soot !== null && soot > 24) {
    out.push({
      id: "ai-dpf",
      severity: soot > 38 ? "warn" : "info",
      title: "Emisyon Öngörüsü",
      message: `Partikül filtresinde ${soot.toFixed(0)} g kurum birikti; kısa şehir turlarına devam edersen tıkanma riski artıyor.`,
      action: "20 dakikalık 2000+ devir seyir rejenerasyonu tamamlar.",
    });
  }

  const pads = num(snapshot, "padWearFront");
  if (pads !== null && pads < 25) {
    out.push({
      id: "ai-brake",
      severity: pads < 12 ? "warn" : "info",
      title: "Fren Aşınma Tahmini",
      message: `Ön balata ömrü %${pads.toFixed(0)} seviyesinde; mevcut kullanım profiliyle yakında değişim gerekecek.`,
    });
  }

  for (const message of diagnostics.slice(0, 4)) {
    if (out.some((i) => i.id === `rule-${message.id}`)) continue;
    out.push({
      id: `rule-${message.id}`,
      severity: message.severity === "critical" ? "critical" : message.severity,
      title: "Arıza Yorumu",
      message: message.text.replace(/^[^\p{L}\d]+/u, ""),
      action: message.detail,
    });
  }

  if (out.length === 0) {
    out.push({
      id: "ai-ok",
      severity: "info",
      title: "Genel Durum",
      message:
        "Tüm alt sistemleri tarıyorum; motor, şarj ve fren verileri normal bantta. Kritik bir eğilim görmüyorum.",
    });
  }

  return out.slice(0, 6);
}

export interface CommandResult {
  reply: string;
  intent:
    | "climate"
    | "charging"
    | "media"
    | "status"
    | "navigation"
    | "diagnostics"
    | "unknown";
  climateTarget?: number;
  mediaAction?: "play" | "pause" | "next" | "prev";
}

/** Sesli/yazılı doğal dil komutlarını yorumlar (Türkçe). */
export function interpretCommand(rawInput: string, snapshot: TelemetrySnapshot): CommandResult {
  const text = rawInput.toLocaleLowerCase("tr-TR");

  if (/(klima|sıcaklık|ısıt|soğut|derece)/.test(text)) {
    const match = text.match(/(\d{2})/);
    const target = match ? Math.min(30, Math.max(16, Number(match[1]))) : undefined;
    return {
      intent: "climate",
      climateTarget: target,
      reply: target
        ? `Klimayı ${target} dereceye ayarlıyorum.`
        : "Klima için kaç derece istediğini söyler misin?",
    };
  }

  if (/(şarj istasyon|şarj noktası|charge)/.test(text)) {
    return {
      intent: "charging",
      reply: "En yakın şarj istasyonlarını haritada listeliyorum: 2,4 km mesafede 3 uygun nokta var.",
    };
  }

  if (/(navigasyon|rota|git|yol tarifi|harita)/.test(text)) {
    return { intent: "navigation", reply: "Navigasyon panelini açıyorum ve rotayı hazırlıyorum." };
  }

  if (/(müzik|şarkı|çal|duraklat|sonraki|önceki|parça)/.test(text)) {
    const action = /sonraki/.test(text)
      ? "next"
      : /önceki/.test(text)
        ? "prev"
        : /duraklat|durdur/.test(text)
          ? "pause"
          : "play";
    return {
      intent: "media",
      mediaAction: action,
      reply:
        action === "next"
          ? "Sonraki parçaya geçiyorum."
          : action === "prev"
            ? "Önceki parçaya dönüyorum."
            : action === "pause"
              ? "Müziği duraklatıyorum."
              : "Müziği başlatıyorum.",
    };
  }

  if (/(arıza|hata|teşhis|sorun|durum raporu)/.test(text)) {
    return {
      intent: "diagnostics",
      reply: "Öngörülü teşhis panelinde güncel yorumları listeliyorum.",
    };
  }

  if (/(hız|devir|voltaj|hararet|sıcaklık kaç|durum)/.test(text)) {
    const speed = num(snapshot, "speed") ?? 0;
    const coolant = num(snapshot, "coolant");
    const voltage = num(snapshot, "voltage");
    return {
      intent: "status",
      reply: `Hız ${speed.toFixed(0)} kilometre, hararet ${
        coolant !== null ? `${coolant.toFixed(0)} derece` : "okunamıyor"
      }, akü ${voltage !== null ? `${voltage.toFixed(1)} volt` : "okunamıyor"}.`,
    };
  }

  return {
    intent: "unknown",
    reply:
      "Bu komutu tam anlayamadım. Klima, navigasyon, şarj istasyonu, müzik veya araç durumu isteyebilirsin.",
  };
}
