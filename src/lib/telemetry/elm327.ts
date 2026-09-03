import { SIGNAL_KEYS, SIGNALS, type SignalKey } from "./signals";
import { emptySignals } from "./simulator";
import type { SignalMap, TelemetrySnapshot } from "./types";

/** Low level byte pipe implemented by the WebSerial and Web Bluetooth transports. */
export interface BytePipe {
  write(data: string): Promise<void>;
  /** resolves with everything received until the ELM327 ">" prompt (or timeout) */
  readUntilPrompt(timeoutMs?: number): Promise<string>;
  close(): Promise<void>;
}

const KEY_BY_PID = new Map<string, SignalKey>();
for (const key of SIGNAL_KEYS) {
  const pid = (SIGNALS[key] as { pid?: string }).pid;
  if (pid) KEY_BY_PID.set(pid, key);
}

/** Decoders for the standard mode 01 PIDs we poll. A/B/C/D are the data bytes. */
const DECODERS: Record<string, (b: number[]) => number> = {
  "010C": (b) => ((b[0] ?? 0) * 256 + (b[1] ?? 0)) / 4,
  "010D": (b) => b[0] ?? 0,
  "0104": (b) => ((b[0] ?? 0) * 100) / 255,
  "0111": (b) => ((b[0] ?? 0) * 100) / 255,
  "010B": (b) => (b[0] ?? 0) / 100, // kPa -> bar
  "0133": (b) => (b[0] ?? 0) * 10, // kPa -> mbar
  "010F": (b) => (b[0] ?? 0) - 40,
  "0110": (b) => ((b[0] ?? 0) * 256 + (b[1] ?? 0)) / 100,
  "0105": (b) => (b[0] ?? 0) - 40,
  "015C": (b) => (b[0] ?? 0) - 40,
  "0106": (b) => ((b[0] ?? 0) - 128) * (100 / 128),
  "0107": (b) => ((b[0] ?? 0) - 128) * (100 / 128),
  "0123": (b) => ((b[0] ?? 0) * 256 + (b[1] ?? 0)) * 0.1, // 10 kPa -> bar
  "012F": (b) => ((b[0] ?? 0) * 100) / 255,
  "010E": (b) => (b[0] ?? 0) / 2 - 64,
  "0142": (b) => ((b[0] ?? 0) * 256 + (b[1] ?? 0)) / 1000,
  "013C": (b) => ((b[0] ?? 0) * 256 + (b[1] ?? 0)) / 10 - 40,
  "0178": (b) => ((b[0] ?? 0) * 256 + (b[1] ?? 0)) / 10 - 40,
};

export const POLL_PIDS = Object.keys(DECODERS);

function parseHexBytes(response: string, pid: string): number[] | null {
  const mode = pid.slice(0, 2);
  const pidByte = pid.slice(2);
  const expected = `${(parseInt(mode, 16) + 0x40).toString(16).toUpperCase().padStart(2, "0")}${pidByte}`;
  const flat = response.replace(/[\r\n>]/g, " ").toUpperCase();
  if (flat.includes("NO DATA") || flat.includes("UNABLE") || flat.includes("?")) return null;
  const tokens = flat.split(/\s+/).filter((t) => /^[0-9A-F]{2}$/.test(t));
  const joined = tokens.join("");
  const at = joined.indexOf(expected);
  if (at < 0) return null;
  const rest = joined.slice(at + expected.length);
  const bytes: number[] = [];
  for (let i = 0; i + 1 < rest.length; i += 2) bytes.push(parseInt(rest.slice(i, i + 2), 16));
  return bytes;
}

function plausible(key: SignalKey, value: number): boolean {
  const meta = SIGNALS[key];
  if (!Number.isFinite(value)) return false;
  // garbage filter: -40 sentinel on temps, out-of-range hex noise
  if (value < meta.min - 0.001 || value > meta.max + 0.001) return false;
  if (meta.unit === "°C" && value <= -39.5) return false;
  return true;
}

/**
 * ELM327 / STN command layer shared by the USB (WebSerial) and BLE transports.
 */
export class Elm327Client {
  private supported = new Set<string>();

  constructor(private pipe: BytePipe) {}

  private async cmd(command: string, timeoutMs = 2500): Promise<string> {
    await this.pipe.write(`${command}\r`);
    return this.pipe.readUntilPrompt(timeoutMs);
  }

  /** AT initialisation sequence used by virtually every ELM327 clone. */
  async initialise(): Promise<{ protocol: string; supportedPids: string[] }> {
    await this.cmd("ATZ", 4000);
    await this.cmd("ATE0");
    await this.cmd("ATL0");
    await this.cmd("ATS0");
    await this.cmd("ATH0");
    await this.cmd("ATSP0", 4000);
    const proto = (await this.cmd("ATDPN", 3000)).replace(/[^0-9A]/g, "") || "0";
    await this.probeSupport();
    return { protocol: describeProtocol(proto), supportedPids: [...this.supported] };
  }

  /** Mode 01 PID 00/20/40 support bitmasks -> sensor availability handshake. */
  private async probeSupport() {
    this.supported.clear();
    for (const base of ["0100", "0120", "0140"]) {
      const bytes = parseHexBytes(await this.cmd(base), base);
      if (!bytes || bytes.length < 4) continue;
      const offset = parseInt(base.slice(2), 16);
      for (let i = 0; i < 4; i++) {
        const byte = bytes[i] ?? 0;
        for (let bit = 0; bit < 8; bit++) {
          if (byte & (0x80 >> bit)) {
            const pidNum = offset + i * 8 + bit + 1;
            this.supported.add(`01${pidNum.toString(16).toUpperCase().padStart(2, "0")}`);
          }
        }
      }
    }
  }

  /** OBD mode 09 PID 02 — Vehicle Identification Number. */
  async readVin(): Promise<string | null> {
    const raw = (await this.cmd("0902", 4000)).toUpperCase();
    const tokens = raw
      .replace(/[\r\n>]/g, " ")
      .split(/\s+/)
      .filter((t) => /^[0-9A-F]{2}$/.test(t));
    const chars: string[] = [];
    for (const token of tokens) {
      const code = parseInt(token, 16);
      if (code >= 0x30 && code <= 0x5a) chars.push(String.fromCharCode(code));
    }
    const vin = chars.join("").replace(/[IOQ]/g, "");
    return vin.length >= 11 ? vin.slice(-17) : null;
  }

  async pollOnce(previous?: SignalMap): Promise<TelemetrySnapshot> {
    const signals = previous ? { ...previous } : emptySignals();
    for (const pid of POLL_PIDS) {
      const key = KEY_BY_PID.get(pid);
      if (!key) continue;
      if (this.supported.size > 0 && !this.supported.has(pid)) {
        signals[key] = { value: NaN, status: "unsupported" };
        continue;
      }
      const bytes = parseHexBytes(await this.cmd(pid, 1200), pid);
      if (!bytes) {
        signals[key] = { value: NaN, status: "stale" };
        continue;
      }
      const decoder = DECODERS[pid];
      const value = decoder ? decoder(bytes) : NaN;
      signals[key] = plausible(key, value)
        ? { value, status: "live" }
        : { value: NaN, status: "stale" };
    }
    // derive values the standard PID set does not expose directly
    const map = signals.map;
    const baro = signals.baro;
    if (map.status === "live" && baro.status === "live") {
      signals.boost = { value: map.value - baro.value / 1000, status: "calculated" };
    }
    const lambdaBase = signals.stft.status === "live" ? 1 + signals.stft.value / 100 : NaN;
    if (Number.isFinite(lambdaBase)) {
      signals.lambda1 = { value: lambdaBase, status: "calculated" };
      signals.afr = { value: lambdaBase * 14.7, status: "calculated" };
    }
    const speed = signals.speed;
    if (speed.status === "live") {
      for (const key of ["wssFL", "wssFR", "wssRL", "wssRR"] as const) {
        signals[key] = { value: speed.value, status: "calculated" };
      }
    }
    return {
      signals,
      flags: {
        fanOn: signals.coolant.status === "live" && signals.coolant.value > 97,
        cranking: signals.voltage.status === "live" && signals.voltage.value < 10.5,
        mil: false,
        absActive: false,
        regen: "none",
      },
      at: Date.now(),
    };
  }

  async close() {
    await this.pipe.close();
  }
}

export function describeProtocol(code: string): string {
  const table: Record<string, string> = {
    "1": "SAE J1850 PWM (41.6 kbaud)",
    "2": "SAE J1850 VPW (10.4 kbaud)",
    "3": "ISO 9141-2 K-Line (5 baud init)",
    "4": "ISO 14230-4 KWP2000 (5 baud init)",
    "5": "ISO 14230-4 KWP2000 (hızlı init)",
    "6": "ISO 15765-4 CAN (11 bit, 500 kbit)",
    "7": "ISO 15765-4 CAN (29 bit, 500 kbit)",
    "8": "ISO 15765-4 CAN (11 bit, 250 kbit)",
    "9": "ISO 15765-4 CAN (29 bit, 250 kbit)",
    A: "SAE J1939 CAN (29 bit, 250 kbit)",
  };
  return table[code] ?? "Otomatik algılanan protokol";
}
