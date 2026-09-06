import type { SignalKey } from "@/lib/telemetry/signals";
import type { TelemetrySnapshot } from "@/lib/telemetry/types";

/**
 * Öngörülü uyarı motorunun bellek katmanı.
 * Her sinyal için kayan pencere geçmişi tutar ve dakikadaki değişim hızını verir.
 */

interface Sample {
  t: number;
  v: number;
}

const WINDOW_MS = 90_000;
const MIN_GAP_MS = 400;

const history = new Map<SignalKey, Sample[]>();
let lastRecordedAt = 0;

const TRACKED: SignalKey[] = [
  "coolant",
  "oilTemp",
  "oilPressure",
  "egt",
  "voltage",
  "dpfSoot",
  "ltft",
  "railPressure",
  "fuelLevel",
  "padWearFront",
  "tpmsFL",
  "tpmsFR",
  "tpmsRL",
  "tpmsRR",
  "egrError",
  "maf",
];

export function recordTrends(snapshot: TelemetrySnapshot) {
  const at = snapshot.at || Date.now();
  if (at - lastRecordedAt < MIN_GAP_MS) return;
  lastRecordedAt = at;

  for (const key of TRACKED) {
    const signal = snapshot.signals[key];
    if (!signal || signal.status === "unsupported" || !Number.isFinite(signal.value)) continue;
    const series = history.get(key) ?? [];
    series.push({ t: at, v: signal.value });
    while (series.length > 1 && at - (series[0]?.t ?? at) > WINDOW_MS) series.shift();
    history.set(key, series);
  }
}

/** Basit doğrusal regresyon eğimi — birim / dakika. */
export function slopePerMinute(key: SignalKey): number | null {
  const series = history.get(key);
  if (!series || series.length < 6) return null;
  const first = series[0];
  if (!first) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const sample of series) {
    const x = (sample.t - first.t) / 60_000;
    sumX += x;
    sumY += sample.v;
    sumXY += x * sample.v;
    sumXX += x * x;
  }
  const n = series.length;
  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-6) return null;
  return (n * sumXY - sumX * sumY) / denominator;
}

/** Pencere boyunca toplam değişim. */
export function deltaOverWindow(key: SignalKey): { change: number; seconds: number } | null {
  const series = history.get(key);
  if (!series || series.length < 6) return null;
  const first = series[0];
  const last = series[series.length - 1];
  if (!first || !last) return null;
  const seconds = (last.t - first.t) / 1000;
  if (seconds < 8) return null;
  return { change: last.v - first.v, seconds };
}

/** Eşiğe kaç dakika kaldığını tahmin eder. */
export function minutesToThreshold(key: SignalKey, threshold: number): number | null {
  const slope = slopePerMinute(key);
  const series = history.get(key);
  const last = series?.[series.length - 1];
  if (slope === null || !last) return null;
  const distance = threshold - last.v;
  if (slope === 0 || distance / slope <= 0) return null;
  const minutes = distance / slope;
  return minutes > 0 && minutes < 240 ? minutes : null;
}

export function resetTrends() {
  history.clear();
  lastRecordedAt = 0;
}
