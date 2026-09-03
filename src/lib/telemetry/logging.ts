import { SIGNAL_KEYS } from "./signals";
import type { TelemetrySnapshot } from "./types";

export interface TripLog {
  id: string;
  startedAt: number;
  endedAt: number | null;
  source: string;
  vehicle: string;
  rows: Array<Record<string, number | string>>;
  faults: string[];
}

const KEY = "autobrain.trips.v1";

export function loadTrips(): TripLog[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as TripLog[];
  } catch {
    return [];
  }
}

export function saveTrips(trips: TripLog[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(trips.slice(-25)));
  } catch {
    /* storage full — drop silently, telemetry must never break the cockpit */
  }
}

export function snapshotToRow(snapshot: TelemetrySnapshot): Record<string, number | string> {
  const row: Record<string, number | string> = { t: new Date(snapshot.at).toISOString() };
  for (const key of SIGNAL_KEYS) {
    const sig = snapshot.signals[key];
    row[key] =
      sig.status === "live" || sig.status === "calculated" ? Number(sig.value.toFixed(3)) : "";
  }
  row["regen"] = snapshot.flags.regen;
  row["fan"] = snapshot.flags.fanOn ? 1 : 0;
  return row;
}

export function tripToCsv(trip: TripLog): string {
  if (trip.rows.length === 0) return "";
  const headers = Object.keys(trip.rows[0] ?? {});
  const lines = [headers.join(",")];
  for (const row of trip.rows) lines.push(headers.map((h) => String(row[h] ?? "")).join(","));
  return lines.join("\n");
}

export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
