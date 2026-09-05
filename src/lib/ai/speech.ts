/** Web Speech API köprüsü: sesli anlatım (TTS) + sesli komut dinleme (STT). */

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
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Türkçe sesli bildirim. */
export function speak(text: string) {
  if (!speechSupported()) {
    emit(true, text);
    window.setTimeout(() => emit(false, ""), 1800);
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "tr-TR";
  utterance.rate = 1;
  utterance.pitch = 1.02;
  utterance.onstart = () => emit(true, text);
  utterance.onend = () => emit(false, "");
  utterance.onerror = () => emit(false, "");
  window.speechSynthesis.speak(utterance);
}

export function cancelSpeech() {
  if (speechSupported()) window.speechSynthesis.cancel();
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
