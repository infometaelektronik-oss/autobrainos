/** Web Audio helpers: warning tones, media ducking and noise-cancelled mic input. */

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

/**
 * Sinematik işletim sistemi açılış imzası:
 * derinden yükselen alt ton + dijital tarama katmanı + parlak kapanış vuruşu.
 */
export function playBootChime() {
  const ac = context();
  if (!ac) return;
  const now = ac.currentTime + 0.05;
  const master = ac.createGain();
  master.gain.value = 0.9;
  master.connect(ac.destination);

  // 1) Derin alt ton süpürmesi
  const sub = ac.createOscillator();
  const subGain = ac.createGain();
  sub.type = "sine";
  sub.frequency.setValueAtTime(42, now);
  sub.frequency.exponentialRampToValueAtTime(128, now + 2.4);
  subGain.gain.setValueAtTime(0.0001, now);
  subGain.gain.exponentialRampToValueAtTime(0.32, now + 1.6);
  subGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
  sub.connect(subGain).connect(master);
  sub.start(now);
  sub.stop(now + 3.3);

  // 2) Yükselen ışık katmanı (iki detuned testere)
  [220, 223.5].forEach((base, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const filter = ac.createBiquadFilter();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(base, now + 0.4);
    osc.frequency.exponentialRampToValueAtTime(base * 2.5, now + 2.5);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(320, now + 0.4);
    filter.frequency.exponentialRampToValueAtTime(5200, now + 2.5);
    gain.gain.setValueAtTime(0.0001, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(i === 0 ? 0.1 : 0.07, now + 2.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.1);
    osc.connect(filter).connect(gain).connect(master);
    osc.start(now + 0.4);
    osc.stop(now + 3.2);
  });

  // 3) Dijital tarama gürültüsü
  const noiseBuffer = ac.createBuffer(1, Math.floor(ac.sampleRate * 2), ac.sampleRate);
  const channel = noiseBuffer.getChannelData(0);
  for (let i = 0; i < channel.length; i += 1) {
    channel[i] = (Math.random() * 2 - 1) * (1 - i / channel.length) * 0.6;
  }
  const noise = ac.createBufferSource();
  const noiseFilter = ac.createBiquadFilter();
  const noiseGain = ac.createGain();
  noise.buffer = noiseBuffer;
  noiseFilter.type = "bandpass";
  noiseFilter.Q.value = 1.4;
  noiseFilter.frequency.setValueAtTime(900, now + 0.6);
  noiseFilter.frequency.exponentialRampToValueAtTime(7200, now + 2.4);
  noiseGain.gain.setValueAtTime(0.0001, now + 0.6);
  noiseGain.gain.exponentialRampToValueAtTime(0.09, now + 1.8);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
  noise.connect(noiseFilter).connect(noiseGain).connect(master);
  noise.start(now + 0.6);
  noise.stop(now + 2.8);

  // 4) Kapanış imza akoru
  [523.25, 784, 1046.5].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const start = now + 2.5 + i * 0.045;
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.13, start + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.9);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + 2);
  });
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
