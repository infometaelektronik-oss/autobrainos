import type { SignalKey, SignalStatus } from "./signals";

export type SourceMode = "usb" | "bluetooth" | "demo";

export type ConnectionState = "disconnected" | "connecting" | "handshaking" | "connected" | "error";

export interface Signal {
  value: number;
  status: SignalStatus;
}

export type SignalMap = Record<SignalKey, Signal>;

export type RegenStatus = "none" | "passive" | "active" | "blocked";

export interface VehicleFlags {
  fanOn: boolean;
  cranking: boolean;
  mil: boolean;
  absActive: boolean;
  regen: RegenStatus;
}

export interface VehicleIdentity {
  vin: string | null;
  make: string;
  model: string;
  year: number | null;
  engineCode: string;
  protocol: string;
  trim: TrimLevel;
  fuel: "benzin" | "dizel";
}

/** Factory trim matrix: A/B are base packages, C/D fully loaded. */
export type TrimLevel = "A" | "B" | "C" | "D";

export interface DiagnosticMessage {
  id: string;
  severity: "info" | "warn" | "critical";
  text: string;
  detail?: string;
  at: number;
}

export interface CallState {
  active: boolean;
  status: "incoming" | "in-call" | "idle";
  name: string;
  number: string;
  startedAt: number | null;
}

export type FaultKey =
  | "vacuumLeak"
  | "overheat"
  | "batteryCollapse"
  | "absDropout"
  | "alternatorRipple"
  | "oilPressureLoss"
  | "brakeFluidLoss"
  | "misfire"
  | "dpfBlocked";

export interface TelemetrySnapshot {
  signals: SignalMap;
  flags: VehicleFlags;
  at: number;
}
