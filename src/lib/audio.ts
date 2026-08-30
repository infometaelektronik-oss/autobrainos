/** Web Audio helpers: warning tones, media ducking and noise-cancelled mic input. */

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  void ctx.resume();
  return ctx;
}

/** Short two-tone cockpit alarm. `level` picks urgency. */
export function playAlarm(level: "warn" | "critical" = "warn") {
  const ac = context();
  if (!ac) return;
  const now = ac.currentTime;
  const beeps = level === "critical" ? [880, 1180, 880, 1180] : [720, 520];
  beeps.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    const start = now + i * 0.18;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level === "critical" ? 0.22 : 0.12, start + 0.02);
    gain.gain.linearRampToValueAtTime(0, start + 0.16);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + 0.18);
  });
}

export function playRingtone() {
  playAlarm("warn");
}

export interface MicSession {
  stop(): void;
  level(): number;
}

/**
 * Opens the external 3.5mm / USB directional microphone with AEC and
 * noise-suppression enabled, and exposes a live input level meter.
 */
export async function openMicrophone(deviceId?: string): Promise<MicSession> {
  const ac = context();
  if (!ac) throw new Error("Web Audio bu cihazda kullanılamıyor.");
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    },
  });
  const source = ac.createMediaStreamSource(stream);
  const analyser = ac.createAnalyser();
  analyser.fftSize = 512;
  const highpass = ac.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 110; // cuts engine rumble / road noise
  source.connect(highpass).connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);

  return {
    stop() {
      stream.getTracks().forEach((t) => t.stop());
      source.disconnect();
    },
    level() {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (const value of data) sum += value;
      return sum / data.length / 255;
    },
  };
}

export async function listMicrophones(): Promise<Array<{ id: string; label: string }>> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((d) => d.kind === "audioinput")
    .map((d, i) => ({ id: d.deviceId, label: d.label || `Mikrofon ${i + 1}` }));
}
