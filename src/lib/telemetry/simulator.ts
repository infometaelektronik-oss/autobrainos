import { SIGNAL_KEYS, type SignalKey } from "./signals";
import type { FaultKey, SignalMap, TelemetrySnapshot, VehicleFlags } from "./types";

export const UNSUPPORTED_BY_TRIM: Record<string, SignalKey[]> = {
  A: [
    "oilTemp",
    "oilPressure",
    "egt",
    "boost",
    "boostTarget",
    "padWearFront",
    "padWearRear",
    "brakeFluidMoisture",
    "brakePressure",
    "tpmsTempFL",
    "tpmsTempFR",
    "tpmsTempRL",
    "tpmsTempRR",
    "dpfSoot",
    "dpfAsh",
    "dpfDiffPressure",
    "steeringAngle",
    "yawRate",
    "lambda3",
    "lambda4",
    "parasiticDraw",
  ],
  B: [
    "egt",
    "padWearRear",
    "brakeFluidMoisture",
    "tpmsTempRL",
    "tpmsTempRR",
    "dpfAsh",
    "lambda3",
    "lambda4",
    "parasiticDraw",
  ],
  C: ["lambda4", "parasiticDraw"],
  D: [],
};

export function emptySignals(): SignalMap {
  const out = {} as SignalMap;
  for (const key of SIGNAL_KEYS) out[key] = { value: 0, status: "unsupported" };
  return out;
}

const noise = (amp: number) => (Math.random() - 0.5) * 2 * amp;

/**
 * Deterministic-ish driving loop simulator. Produces physically coupled values:
 * MAP follows RPM, boost follows load, temps warm up, wheel speeds track speed.
 */
export class VehicleSimulator {
  private t = 0;
  private coolant = 24;
  private oilTemp = 22;
  private egt = 180;
  private rpm = 820;
  private speed = 0;
  private misfire: [number, number, number, number] = [0, 0, 0, 0];
  private knock = 0;
  private sootLoad = 8.4;
  faults = new Set<FaultKey>();

  constructor(private trim: keyof typeof UNSUPPORTED_BY_TRIM = "D") {}

  setTrim(trim: string) {
    this.trim = trim as keyof typeof UNSUPPORTED_BY_TRIM;
  }

  toggleFault(fault: FaultKey, on?: boolean) {
    const next = on ?? !this.faults.has(fault);
    if (next) this.faults.add(fault);
    else this.faults.delete(fault);
    if (fault === "batteryCollapse" && next) this.crankTimer = 2.4;
    return next;
  }

  private crankTimer = 0;

  tick(dt: number): TelemetrySnapshot {
    this.t += dt;
    const f = this.faults;

    // driving cycle: gentle accelerate / cruise / decelerate sweep
    const cycle = (Math.sin(this.t / 14) + 1) / 2; // 0..1
    const burst = Math.max(0, Math.sin(this.t / 3.3)) * 0.35;
    const targetSpeed = 4 + cycle * 116;
    const targetRpm = 820 + (cycle * 0.78 + burst) * 3700;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 1.1);
    this.rpm += (targetRpm - this.rpm) * Math.min(1, dt * 2.4);

    const rpm = Math.max(0, this.rpm + noise(18));
    const speed = Math.max(0, this.speed + noise(0.4));
    const loadPct = Math.min(100, 12 + (rpm / 4500) * 68 + burst * 40);
    const throttle = Math.min(100, 6 + loadPct * 0.82 + noise(1.5));

    // air path
    const baro = 1008 + noise(1.2);
    const vacuum = f.has("vacuumLeak") ? 0.24 : 0;
    const boost = Math.max(-0.9, (loadPct / 100) * 1.35 - 0.42 - vacuum + noise(0.02));
    const boostTarget = Math.max(-0.9, (loadPct / 100) * 1.4 - 0.4);
    const map = Math.max(0.18, baro / 1000 + boost + noise(0.01));
    const maf = Math.max(1.2, (rpm / 1000) * (map * 9.4) + noise(0.8));
    const iat = 26 + (boost > 0 ? boost * 22 : 0) + noise(0.6);

    // fuel & combustion
    const ltft = f.has("vacuumLeak") ? 18.5 + noise(1.4) : 1.6 + noise(1.1);
    const stft = f.has("vacuumLeak") ? 9.4 + noise(2.6) : noise(3.4);
    const lambda1 = 1 + (f.has("vacuumLeak") ? 0.06 : 0) + noise(0.035);
    const afr = 14.7 * lambda1;
    const railPressure = 320 + (loadPct / 100) * 1280 + noise(14);
    const injPulse = 1.6 + (loadPct / 100) * 7.4 + noise(0.12);

    // thermal
    const overheat = f.has("overheat");
    const coolantTarget = overheat ? 108 : 88 + (loadPct / 100) * 8;
    this.coolant += (coolantTarget - this.coolant) * Math.min(1, dt * (overheat ? 0.5 : 0.12));
    const fanOn = this.coolant > 97;
    this.oilTemp += (this.coolant + 14 - this.oilTemp) * Math.min(1, dt * 0.09);
    const egtTarget = 210 + (loadPct / 100) * 620;
    this.egt += (egtTarget - this.egt) * Math.min(1, dt * 0.35);
    const oilPressure = f.has("oilPressureLoss")
      ? 0.12 + noise(0.05)
      : Math.min(6.2, 0.9 + (rpm / 1000) * 0.78 + noise(0.05));

    // ignition
    if (f.has("misfire")) {
      this.misfire[2] += Math.random() < 0.4 ? 1 : 0;
      this.misfire[0] += Math.random() < 0.05 ? 1 : 0;
    }
    if (f.has("misfire") || loadPct > 88) this.knock = Math.min(50, this.knock + (Math.random() < 0.2 ? 1 : 0));
    const timingAdv = 12 + (rpm / 1000) * 2.4 - (f.has("misfire") ? 4 : 0) + noise(0.5);
    const knockRetard = f.has("misfire") ? 4.6 + noise(0.8) : Math.max(0, noise(0.6));

    // brakes
    const braking = Math.max(0, -Math.cos(this.t / 14)) > 0.94 ? 1 : 0;
    const brakePedal = braking ? 42 + noise(8) : Math.max(0, noise(1));
    const brakePressure = (brakePedal / 100) * 110 + noise(0.6);
    const brakeFluidLevel = f.has("brakeFluidLoss") ? 18 + noise(1.5) : 82 + noise(0.6);

    // chassis
    const absDrop = f.has("absDropout");
    const slip = braking ? 1.6 : 0;
    const steeringAngle = Math.sin(this.t / 6) * 120 + noise(2);
    const gLat = (steeringAngle / 540) * (speed / 120) * 1.7 + noise(0.02);
    const gLong = ((targetSpeed - this.speed) / 30) * 0.6 - braking * 0.7 + noise(0.02);

    // electrical
    if (this.crankTimer > 0) this.crankTimer -= dt;
    const cranking = this.crankTimer > 0;
    const voltage = f.has("batteryCollapse")
      ? cranking
        ? 9.2 + noise(0.15)
        : 12.05 + noise(0.08)
      : 14.35 + noise(0.06);
    const ripple = f.has("alternatorRipple") ? 420 + noise(60) : 42 + noise(14);

    // emissions
    this.sootLoad = f.has("dpfBlocked")
      ? Math.min(48, this.sootLoad + dt * 0.35)
      : Math.max(4, this.sootLoad + dt * 0.02 - (this.egt > 600 ? dt * 0.06 : 0));
    const regen: VehicleFlags["regen"] = f.has("dpfBlocked")
      ? "blocked"
      : this.sootLoad > 22
        ? "active"
        : this.egt > 520
          ? "passive"
          : "none";

    const raw: Record<SignalKey, number> = {
      rpm,
      speed,
      load: loadPct,
      throttle,
      map,
      boost,
      boostTarget,
      baro,
      iat,
      maf,
      lambda1,
      lambda2: lambda1 + noise(0.02),
      lambda3: 1 + noise(0.03),
      lambda4: 1 + noise(0.03),
      afr,
      stft,
      ltft,
      railPressure,
      injPulse,
      knock: this.knock,
      fuelLevel: Math.max(6, 64 - (this.t / 600) * 3),
      fuelTemp: 32 + this.coolant * 0.18 + noise(0.4),
      coolant: this.coolant,
      oilTemp: this.oilTemp,
      oilPressure,
      egt: this.egt,
      timingAdv,
      knockRetard,
      misfire1: this.misfire[0],
      misfire2: this.misfire[1],
      misfire3: this.misfire[2],
      misfire4: this.misfire[3],
      brakePressure,
      brakePedal,
      brakeFluidLevel,
      brakeFluidMoisture: 1.4 + noise(0.05),
      padWearFront: 46,
      padWearRear: 61,
      wssFL: absDrop ? 0 : Math.max(0, speed - slip + noise(0.3)),
      wssFR: Math.max(0, speed + noise(0.3)),
      wssRL: Math.max(0, speed + noise(0.3)),
      wssRR: Math.max(0, speed - slip * 0.4 + noise(0.3)),
      steeringAngle,
      gLat,
      gLong,
      yawRate: (gLat * 180) / Math.PI / 3 + noise(0.4),
      tpmsFL: 2.32 + noise(0.01),
      tpmsFR: 2.29 + noise(0.01),
      tpmsRL: 2.24 + noise(0.01),
      tpmsRR: 1.86 + noise(0.01),
      tpmsTempFL: 34 + (speed / 120) * 18 + noise(0.4),
      tpmsTempFR: 34 + (speed / 120) * 18 + noise(0.4),
      tpmsTempRL: 32 + (speed / 120) * 17 + noise(0.4),
      tpmsTempRR: 36 + (speed / 120) * 21 + noise(0.4),
      voltage,
      crankMinVoltage: f.has("batteryCollapse") ? 9.2 : 10.9,
      alternatorRipple: ripple,
      parasiticDraw: 24 + noise(3),
      dpfSoot: this.sootLoad,
      dpfAsh: 18.4,
      dpfDiffPressure: 26 + this.sootLoad * 3.4 + noise(2),
      egrPosition: Math.max(0, 34 - (loadPct / 100) * 30 + noise(1.5)),
      catTemp: 320 + (loadPct / 100) * 420 + noise(6),
      outsideTemp: 21 + noise(0.2),
    };

    const unsupported = new Set(UNSUPPORTED_BY_TRIM[this.trim] ?? []);
    const signals = emptySignals();
    for (const key of SIGNAL_KEYS) {
      if (unsupported.has(key)) {
        signals[key] = { value: NaN, status: "unsupported" };
        continue;
      }
      if (absDrop && key === "wssFL") {
        signals[key] = { value: NaN, status: "stale" };
        continue;
      }
      signals[key] = { value: raw[key], status: "live" };
    }

    return {
      signals,
      flags: {
        fanOn,
        cranking,
        mil: f.has("misfire") || f.has("overheat") || f.has("vacuumLeak"),
        absActive: braking === 1,
        regen,
      },
      at: Date.now(),
    };
  }
}
