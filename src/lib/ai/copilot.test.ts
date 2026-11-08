import { beforeEach, describe, expect, it } from "vitest";

import { buildInsights, driveModeOf, resetDriveMode } from "@/lib/ai/copilot";
import { resetTrends } from "@/lib/ai/trends";
import { emptySignals } from "@/lib/telemetry/simulator";
import type { TelemetrySnapshot } from "@/lib/telemetry/types";

function at(speedKmh: number, time: number): TelemetrySnapshot {
  const signals = emptySignals();
  signals.speed = { value: speedKmh, status: "live" };
  signals.rpm = { value: speedKmh < 2 ? 800 : 2200, status: "live" };
  return {
    signals,
    flags: { fanOn: false, cranking: false, mil: false, absActive: false, regen: "none" },
    at: time,
  };
}

beforeEach(() => {
  resetDriveMode();
  resetTrends();
});

describe("Odak / Otoyol Modu", () => {
  it("100 km/s eşiğini beş saniye koruyunca odak moduna girer", () => {
    expect(driveModeOf(at(100, 1_000))).toBe("city");
    expect(driveModeOf(at(100, 5_999))).toBe("city");
    expect(driveModeOf(at(100, 6_000))).toBe("highway");
  });

  it("92 km/s üzerinde odakta kalır, altını beş saniye koruyunca çıkar", () => {
    driveModeOf(at(100, 1_000));
    expect(driveModeOf(at(100, 6_000))).toBe("highway");
    expect(driveModeOf(at(93, 7_000))).toBe("highway");
    expect(driveModeOf(at(91, 8_000))).toBe("highway");
    expect(driveModeOf(at(91, 12_999))).toBe("highway");
    expect(driveModeOf(at(91, 13_000))).toBe("city");
  });
});

describe("eşik tabanlı doğal dil uyarıları", () => {
  it("11,5 V değerini kritik elektrik sistemi uyarısına çevirir", () => {
    const current = at(0, 1_000);
    current.signals.voltage = { value: 11.5, status: "live" };

    const warning = buildInsights(current, []).find((item) => item.id === "ai-voltage");
    expect(warning?.severity).toBe("critical");
    expect(warning?.message).toContain("11.5V");
    expect(warning?.message).toContain("alternatör");
  });
});
