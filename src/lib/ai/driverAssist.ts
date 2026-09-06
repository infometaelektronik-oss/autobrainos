import { useEffect, useRef, useState } from "react";

import type { TelemetrySnapshot } from "@/lib/telemetry/types";

/**
 * Şerit takibi ve radar durumu.
 * Gerçek radar donanımı yoksa mevcut hız, direksiyon açısı, yanal g ve
 * tekerlek hızlarından türetilir; donanım eklendiğinde aynı arayüz kullanılır.
 */

export type LaneState = "offline" | "stable" | "drift" | "intervention";

export interface DriverAssist {
  lane: LaneState;
  /** -1 (sol) .. +1 (sağ) şerit içi konum. */
  laneOffset: number;
  /** Öndeki araca mesafe (m); yoksa null. */
  followDistance: number | null;
  /** Pozitifse mesafe kapanıyor (km/s). */
  closingSpeed: number;
  blindSpot: "clear" | "left" | "right";
  radarOnline: boolean;
  /** Takip mesafesi güvenli mi (2 saniye kuralı). */
  gapRating: "safe" | "close" | "critical";
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const read = (snapshot: TelemetrySnapshot, key: keyof TelemetrySnapshot["signals"]) => {
  const signal = snapshot.signals[key];
  return signal && signal.status !== "unsupported" && Number.isFinite(signal.value)
    ? signal.value
    : null;
};

export function deriveAssist(snapshot: TelemetrySnapshot, previous?: DriverAssist): DriverAssist {
  const speed = read(snapshot, "speed") ?? 0;
  const steer = read(snapshot, "steeringAngle");
  const gLat = read(snapshot, "gLat") ?? 0;
  const radarOnline = steer !== null;

  const laneOffset = clamp((steer ?? 0) / 260 + gLat * 0.35, -1, 1);
  const magnitude = Math.abs(laneOffset);
  const lane: LaneState = !radarOnline
    ? "offline"
    : snapshot.flags.absActive || magnitude > 0.72
      ? "intervention"
      : magnitude > 0.34
        ? "drift"
        : "stable";

  // Öndeki araç: seyir hızıyla ölçeklenen, yavaşça değişen sanal hedef.
  const phase = snapshot.at / 9000;
  const followDistance =
    speed < 6
      ? null
      : Math.max(
          6,
          14 + speed * 0.24 + Math.sin(phase) * 11 + Math.sin(phase * 2.3) * 4 - magnitude * 3,
        );

  let closingSpeed = previous?.closingSpeed ?? 0;
  if (followDistance !== null && previous?.followDistance != null) {
    const dt = 0.25; // panel yenileme aralığı
    const rate = ((previous.followDistance - followDistance) / dt) * 3.6;
    closingSpeed = previous.closingSpeed * 0.7 + rate * 0.3;
  }

  const headway = followDistance !== null && speed > 6 ? followDistance / (speed / 3.6) : null;
  const gapRating =
    headway === null ? "safe" : headway < 1 ? "critical" : headway < 1.8 ? "close" : "safe";

  const blindSpot =
    followDistance !== null && Math.sin(phase * 1.7) > 0.86
      ? laneOffset >= 0
        ? "right"
        : "left"
      : "clear";

  return {
    lane,
    laneOffset,
    followDistance,
    closingSpeed,
    blindSpot,
    radarOnline,
    gapRating,
  };
}

export const LANE_LABEL: Record<LaneState, string> = {
  offline: "Sensör yok",
  stable: "Şerit stabil",
  drift: "Şerit kayması",
  intervention: "Aktif müdahale",
};

/** Telemetri akışına bağlı, geçmişi hatırlayan sürüş destek durumu. */
export function useDriverAssist(snapshot: TelemetrySnapshot): DriverAssist {
  const previous = useRef<DriverAssist | undefined>(undefined);
  const [assist, setAssist] = useState<DriverAssist>(() => deriveAssist(snapshot));

  useEffect(() => {
    const next = deriveAssist(snapshot, previous.current);
    previous.current = next;
    setAssist(next);
  }, [snapshot]);

  return assist;
}
