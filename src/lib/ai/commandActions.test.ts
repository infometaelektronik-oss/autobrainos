import { describe, expect, it, vi } from "vitest";

import { executeCommand, type CommandActions } from "@/lib/ai/commandActions";
import { interpretCommand } from "@/lib/ai/copilot";
import { emptySignals } from "@/lib/telemetry/simulator";
import type { TelemetrySnapshot } from "@/lib/telemetry/types";

function snapshot(): TelemetrySnapshot {
  return {
    signals: emptySignals(),
    flags: { fanOn: false, cranking: false, mil: false, absActive: false, regen: "none" },
    at: 1_000,
  };
}

function actions(): CommandActions {
  return {
    setClimate: vi.fn(),
    findChargingStations: vi.fn(),
    showNavigation: vi.fn(),
    showDiagnostics: vi.fn(),
    media: { playing: false, toggle: vi.fn(), next: vi.fn(), prev: vi.fn() },
  };
}

describe("sesli komut eylem haritası", () => {
  it("Klimayı 22 dereceye ayarla komutunda klima hedefini gerçekten 22 yapar", () => {
    const handlers = actions();
    const result = interpretCommand("Klimayı 22 dereceye ayarla", snapshot());

    expect(executeCommand(result, handlers)).toBe("climate");
    expect(handlers.setClimate).toHaveBeenCalledExactlyOnceWith(22);
  });

  it("şarj istasyonu komutunda şarj aramasını başlatır", () => {
    const handlers = actions();
    const result = interpretCommand("En yakın şarj istasyonunu bul", snapshot());

    expect(executeCommand(result, handlers)).toBe("charging");
    expect(handlers.findChargingStations).toHaveBeenCalledOnce();
  });
});
