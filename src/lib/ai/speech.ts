/**
 * Sesli anlatım (ChatGPT sesi) + sesli komut dinleme (Web Speech API).
 * Ses sunucudaki /api/tts uç noktasından SSE ile akar ve Web Audio ile çalar.
 * Bağlantı kurulamazsa tarayıcının yerleşik sesine düşer.
 */

type Listener = (speaking: boolean, text: string) => void;

const listeners = new Set<Listener>();
let speaking = false;
let current = "";

export function subscribeSpeech(listener: Listener) {
  listeners.add(listener);
  listener(speaking, current);
  return () => listeners.delete(listener);
}

function emit(next: boolean, text: string) {
  speaking = next;
  current = text;
  for (const listener of listeners) listener(next, text);
}

export function speechSupported() {
  return typeof window !== "undefined";
}

/* ------------------------------------------------------------------ audio */

const SAMPLE_RATE = 24000;
/** Aynı metin (açılış cümleleri gibi) yeniden üretilmez. */
const cache = new Map<string, Float32Array<ArrayBuffer>>();

let ctx: AudioContext | null = null;
let controller: AbortController | null = null;
let sources: AudioBufferSourceNode[] = [];

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor({ sampleRate: SAMPLE_RATE });
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}

/** İlk kullanıcı dokunuşunda çağrılır; otomatik oynatma kilidini açar. */
export function unlockAudio() {
  audioContext();
}

function playFloat(ac: AudioContext, floats: Float32Array<ArrayBuffer>, at: number) {
  const buffer = ac.createBuffer(1, floats.length, SAMPLE_RATE);
  buffer.copyToChannel(floats, 0);
  const source = ac.createBufferSource();
  source.buffer = buffer;
  source.connect(ac.destination);
  source.start(at);
  sources.push(source);
  source.onended = () => {
    sources = sources.filter((s) => s !== source);
  };
  return buffer.duration;
}

function pcmToFloat(
  bytes: Uint8Array<ArrayBuffer>,
  carry: Uint8Array<ArrayBuffer>,
): { floats: Float32Array<ArrayBuffer>; rest: Uint8Array<ArrayBuffer> } {
  const merged = new Uint8Array(carry.length + bytes.length);
  merged.set(carry);
  merged.set(bytes, carry.length);
  const usable = merged.length - (merged.length % 2);
  const rest = new Uint8Array(merged.length - usable);
  rest.set(merged.subarray(usable));
  if (usable === 0) return { floats: new Float32Array(0), rest };
  const view = new DataView(merged.buffer, merged.byteOffset, usable);
  const floats = new Float32Array(usable / 2);
  for (let i = 0; i < floats.length; i += 1) floats[i] = view.getInt16(i * 2, true) / 32768;
  return { floats, rest };
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, Math.max(0, ms)));
}

/** Tarayıcının yerleşik sesi — yedek yol. */
function fallbackSpeak(text: string): Promise<void> {
  return new Promise((resolve) => {
    const hasSynth = typeof window !== "undefined" && "speechSynthesis" in window;
    if (!hasSynth) {
      setTimeout(resolve, Math.min(6000, 900 + text.length * 55));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = 0.98;
    utterance.pitch = 1.02;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
    window.setTimeout(finish, 2000 + text.length * 90);
  });
}

export interface SpeakOptions {
  /** Açılış anlatımı için daha sinematik tonlama. */
  style?: "assistant" | "boot";
  /** Sabit metinleri cihazda sakla. */
  remember?: boolean;
}

/** ChatGPT sesiyle konuşur; bitişini bekleyebilirsin. */
export async function speakAsync(text: string, options: SpeakOptions = {}): Promise<void> {
  const clean = text.trim();
  if (!clean) return;
  emit(true, clean);

  const ac = audioContext();
  if (!ac) {
    await fallbackSpeak(clean);
    emit(false, "");
    return;
  }

  const key = `${options.style ?? "assistant"}::${clean}`;
  const cached = cache.get(key);
  if (cached) {
    const duration = playFloat(ac, cached, ac.currentTime + 0.05);
    await wait((duration + 0.1) * 1000);
    emit(false, "");
    return;
  }

  controller?.abort();
  const abort = new AbortController();
  controller = abort;

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean, style: options.style ?? "assistant" }),
      signal: abort.signal,
    });
    if (!response.ok || !response.body) throw new Error(`TTS ${response.status}`);

    let playhead = 0;
    let carry: Uint8Array<ArrayBuffer> = new Uint8Array(0);
    let buffered = "";
    const collected: Float32Array<ArrayBuffer>[] = [];

    const handleEvent = (payload: string) => {
      let parsed: { type?: string; audio?: string };
      try {
        parsed = JSON.parse(payload) as typeof parsed;
      } catch {
        return;
      }
      if (parsed.type !== "speech.audio.delta" || !parsed.audio) return;
      const binary = atob(parsed.audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const { floats, rest } = pcmToFloat(bytes, carry);
      carry = rest;
      if (floats.length === 0) return;
      if (options.remember) collected.push(floats);
      const at = playhead === 0 ? ac.currentTime + 0.12 : Math.max(playhead, ac.currentTime);
      playhead = at + playFloat(ac, floats, at);
    };

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffered += value;
      const parts = buffered.split("\n");
      buffered = parts.pop() ?? "";
      for (const line of parts) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data:")) handleEvent(trimmed.slice(5).trim());
      }
    }

    if (playhead === 0) throw new Error("Ses verisi gelmedi");

    if (options.remember && collected.length > 0) {
      const total = collected.reduce((sum, part) => sum + part.length, 0);
      const merged = new Float32Array(total);
      let offset = 0;
      for (const part of collected) {
        merged.set(part, offset);
        offset += part.length;
      }
      cache.set(key, merged);
    }

    await wait((playhead - ac.currentTime + 0.15) * 1000);
    emit(false, "");
  } catch (error) {
    if (abort.signal.aborted) {
      emit(false, "");
      return;
    }
    console.warn("ChatGPT sesi kullanılamadı, tarayıcı sesine düşülüyor:", error);
    await fallbackSpeak(clean);
    emit(false, "");
  } finally {
    if (controller === abort) controller = null;
  }
}

/** Ateşle-ve-devam et: konuşmayı başlatır, beklemez. */
export function speak(text: string, options?: SpeakOptions) {
  void speakAsync(text, options);
}

export function cancelSpeech() {
  controller?.abort();
  controller = null;
  for (const source of sources) {
    try {
      source.stop();
    } catch {
      /* zaten bitmiş */
    }
  }
  sources = [];
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  emit(false, "");
}

/* ---------------- Speech to text ---------------- */

interface RecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface RecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: RecognitionResultLike };
}
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
}

function recognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function recognitionSupported() {
  return recognitionCtor() !== null;
}

export interface RecognitionHandle {
  stop: () => void;
}

/** Sürekli dinleme; ara sonuçları (interim) ve nihai komutu bildirir. */
export function listen(handlers: {
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}): RecognitionHandle | null {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    handlers.onError?.("Bu tarayıcı sesli komutu desteklemiyor.");
    return null;
  }
  const recognition = new Ctor();
  recognition.lang = "tr-TR";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (!result) continue;
      const transcript = result[0].transcript.trim();
      if (result.isFinal) handlers.onFinal(transcript);
      else handlers.onInterim?.(transcript);
    }
  };
  recognition.onend = () => handlers.onEnd?.();
  recognition.onerror = (event) =>
    handlers.onError?.(
      event.error === "not-allowed" ? "Mikrofon izni verilmedi." : "Ses algılanamadı.",
    );
  recognition.start();
  return { stop: () => recognition.stop() };
}
