import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { playAlarm, playRingtone } from "../audio";
import { runDiagnostics } from "./diagnostics";
import { Elm327Client } from "./elm327";
import { loadTrips, saveTrips, snapshotToRow, type TripLog } from "./logging";
import type { SignalKey } from "./signals";
import { UNSUPPORTED_BY_TRIM, VehicleSimulator, emptySignals } from "./simulator";
import { hasWebBluetooth, hasWebSerial, openBluetoothPipe, openSerialPipe } from "./transports";
import type {
  CallState,
  ConnectionState,
  DiagnosticMessage,
  FaultKey,
  SourceMode,
  TelemetrySnapshot,
  TrimLevel,
  VehicleIdentity,
} from "./types";
import { DEMO_IDENTITY, decodeVin } from "./vin";

export type ThemeKey = "tesla" | "analog" | "race";

export interface RingMapping {
  volumeUp: string;
  volumeDown: string;
  nextTrack: string;
  prevTrack: string;
  acceptCall: string;
  rejectCall: string;
}

export interface HiddenFeature {
  id: string;
  label: string;
  description: string;
  minTrim: TrimLevel;
  enabled: boolean;
}

export interface Settings {
  theme: ThemeKey;
  primaryGauges: SignalKey[];
  pressureUnit: "bar" | "psi";
  ring: RingMapping;
  hiddenFeatures: Record<string, boolean>;
  micDeviceId: string;
  logging: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  theme: "tesla",
  primaryGauges: ["speed", "rpm", "boost", "coolant"],
  pressureUnit: "bar",
  ring: {
    volumeUp: "ArrowUp",
    volumeDown: "ArrowDown",
    nextTrack: "ArrowRight",
    prevTrack: "ArrowLeft",
    acceptCall: "Enter",
    rejectCall: "Escape",
  },
  hiddenFeatures: {},
  micDeviceId: "",
  logging: true,
};

export const HIDDEN_FEATURES: HiddenFeature[] = [
  {
    id: "needleSweep",
    label: "Gösterge Selamlaması (Needle Sweep)",
    description: "Kontak açıldığında ibreler tam tur atar.",
    minTrim: "B",
    enabled: false,
  },
  {
    id: "americanPark",
    label: "Amerikan Park Işıkları",
    description: "Sinyal kolu ile tek taraflı park lambası.",
    minTrim: "B",
    enabled: false,
  },
  {
    id: "autoLock",
    label: "Hıza Duyarlı Otomatik Kilit",
    description: "15 km/h üzerinde kapılar otomatik kilitlenir.",
    minTrim: "C",
    enabled: false,
  },
  {
    id: "comingHome",
    label: "Coming / Leaving Home",
    description: "Kontak kapandıktan sonra farlar 30 sn açık kalır.",
    minTrim: "C",
    enabled: false,
  },
  {
    id: "corneringLight",
    label: "Viraj Aydınlatması",
    description: "Direksiyon açısına göre sis farı devreye girer.",
    minTrim: "D",
    enabled: false,
  },
  {
    id: "digitalSpeed",
    label: "Kombine Dijital Hız Göstergesi",
    description: "Gösterge panelinde dijital hız değeri.",
    minTrim: "A",
    enabled: false,
  },
  {
    id: "seatbeltChime",
    label: "Emniyet Kemeri Uyarı Sesi Kapatma",
    description: "Gong sesini devre dışı bırakır.",
    minTrim: "A",
    enabled: false,
  },
  {
    id: "hornBeepOnLock",
    label: "Kilitlemede Korna Sesi",
    description: "Kumanda ile kilitlenince korna kısa bir bip verir.",
    minTrim: "B",
    enabled: false,
  },
  {
    id: "fanRunOn",
    label: "Turbo Soğutma Fanı Devamı",
    description: "Kontak sonrası fan turboyu soğutmaya devam eder.",
    minTrim: "C",
    enabled: false,
  },
];

export interface Track {
  title: string;
  artist: string;
  duration: number;
  art: string;
}

export const DEMO_TRACKS: Track[] = [
  {
    title: "Night Drive",
    artist: "Sürüş Modu",
    duration: 214,
    art: "from-cyan-500/40 to-blue-900/60",
  },
  {
    title: "Anadolu Yolu",
    artist: "Kokpit FM",
    duration: 189,
    art: "from-amber-500/40 to-red-900/60",
  },
  {
    title: "Turbo Spool",
    artist: "Telemetry Sessions",
    duration: 247,
    art: "from-emerald-500/40 to-slate-900/60",
  },
  {
    title: "Asfalt",
    artist: "AutoBrain",
    duration: 202,
    art: "from-fuchsia-500/40 to-indigo-900/60",
  },
];

interface TelemetryContextValue {
  snapshot: TelemetrySnapshot;
  diagnostics: DiagnosticMessage[];
  critical: DiagnosticMessage | null;
  dismissCritical: () => void;
  source: SourceMode;
  connection: ConnectionState;
  connectionError: string | null;
  identity: VehicleIdentity;
  setTrim: (trim: TrimLevel) => void;
  connect: (mode: SourceMode) => Promise<void>;
  disconnect: () => void;
  capabilities: { serial: boolean; bluetooth: boolean };
  faults: FaultKey[];
  toggleFault: (fault: FaultKey) => void;
  call: CallState;
  simulateCall: (name?: string, number?: string) => void;
  acceptCall: () => void;
  declineCall: () => void;
  media: {
    track: Track;
    index: number;
    playing: boolean;
    position: number;
    volume: number;
    ducked: boolean;
    toggle: () => void;
    next: () => void;
    prev: () => void;
    seek: (seconds: number) => void;
    setVolume: (v: number) => void;
  };
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  trips: TripLog[];
  activeTrip: TripLog | null;
  startTrip: () => void;
  endTrip: () => void;
  deleteTrip: (id: string) => void;
  unsupported: Set<SignalKey>;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

const SETTINGS_KEY = "autobrain.settings.v1";

function emptySnapshot(): TelemetrySnapshot {
  return {
    signals: emptySignals(),
    flags: { fanOn: false, cranking: false, mil: false, absActive: false, regen: "none" },
    at: Date.now(),
  };
}

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot>(emptySnapshot);
  const [diagnostics, setDiagnostics] = useState<DiagnosticMessage[]>([]);
  const [critical, setCritical] = useState<DiagnosticMessage | null>(null);
  const dismissedRef = useRef<Set<string>>(new Set());
  const [source, setSource] = useState<SourceMode>("demo");
  const [connection, setConnection] = useState<ConnectionState>("disconnected");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<VehicleIdentity>(DEMO_IDENTITY);
  const [faults, setFaults] = useState<FaultKey[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [capabilities, setCapabilities] = useState({ serial: false, bluetooth: false });
  const [trips, setTrips] = useState<TripLog[]>([]);
  const [activeTrip, setActiveTrip] = useState<TripLog | null>(null);

  const [call, setCall] = useState<CallState>({
    active: false,
    status: "idle",
    name: "",
    number: "",
    startedAt: null,
  });

  const [mediaIndex, setMediaIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [volume, setVolume] = useState(0.7);

  const simulatorRef = useRef<VehicleSimulator | null>(null);
  const clientRef = useRef<Elm327Client | null>(null);
  const loopRef = useRef<number | null>(null);
  const lastLogRef = useRef(0);

  /* ---------------------------------------------------------------- settings */
  useEffect(() => {
    setCapabilities({ serial: hasWebSerial(), bluetooth: hasWebBluetooth() });
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) });
    } catch {
      /* ignore corrupt settings */
    }
    setTrips(loadTrips());
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  /* ------------------------------------------------------------------- trips */
  const persistTrips = useCallback((next: TripLog[]) => {
    setTrips(next);
    saveTrips(next);
  }, []);

  const startTrip = useCallback(() => {
    setActiveTrip({
      id: `trip-${Date.now()}`,
      startedAt: Date.now(),
      endedAt: null,
      source,
      vehicle: `${identity.make} ${identity.model}`,
      rows: [],
      faults: [],
    });
  }, [identity.make, identity.model, source]);

  const endTrip = useCallback(() => {
    setActiveTrip((trip) => {
      if (!trip) return null;
      persistTrips([...loadTrips(), { ...trip, endedAt: Date.now() }]);
      return null;
    });
  }, [persistTrips]);

  const deleteTrip = useCallback(
    (id: string) => persistTrips(loadTrips().filter((t) => t.id !== id)),
    [persistTrips],
  );

  /* ------------------------------------------------------------ data sources */
  const stopLoop = useCallback(() => {
    if (loopRef.current !== null) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
  }, []);

  const applySnapshot = useCallback((next: TelemetrySnapshot) => {
    setSnapshot(next);
    const found = runDiagnostics(next);
    setDiagnostics(found);
    const worst = found.find((d) => d.severity === "critical") ?? null;
    if (worst && !dismissedRef.current.has(worst.id)) {
      setCritical((prev) => {
        if (!prev) playAlarm("critical");
        return prev?.id === worst.id ? prev : worst;
      });
    } else if (!worst) {
      setCritical(null);
      dismissedRef.current.clear();
    }
  }, []);

  const startDemo = useCallback(() => {
    stopLoop();
    const sim = new VehicleSimulator(identity.trim);
    for (const fault of faults) sim.toggleFault(fault, true);
    simulatorRef.current = sim;
    setSource("demo");
    setConnection("connected");
    setIdentity((prev) => ({ ...DEMO_IDENTITY, trim: prev.trim }));
    loopRef.current = window.setInterval(() => {
      applySnapshot(sim.tick(0.1));
    }, 100);
  }, [applySnapshot, faults, identity.trim, stopLoop]);

  const connect = useCallback(
    async (mode: SourceMode) => {
      setConnectionError(null);
      stopLoop();
      simulatorRef.current = null;
      if (clientRef.current) {
        await clientRef.current.close().catch(() => undefined);
        clientRef.current = null;
      }
      if (mode === "demo") {
        startDemo();
        return;
      }
      setSource(mode);
      setConnection("connecting");
      try {
        const pipe = mode === "usb" ? await openSerialPipe() : await openBluetoothPipe();
        const client = new Elm327Client(pipe);
        clientRef.current = client;
        setConnection("handshaking");
        const { protocol } = await client.initialise();
        const vin = await client.readVin().catch(() => null);
        setIdentity((prev) => ({
          ...(vin ? decodeVin(vin) : { ...prev, vin: null }),
          protocol,
          trim: prev.trim,
        }));
        setConnection("connected");
        let previous = emptySignals();
        const poll = async () => {
          if (clientRef.current !== client) return;
          try {
            const next = await client.pollOnce(previous);
            previous = next.signals;
            applySnapshot(next);
          } catch (error) {
            setConnectionError(error instanceof Error ? error.message : "Veri okuma hatası");
          }
        };
        loopRef.current = window.setInterval(() => void poll(), 250);
      } catch (error) {
        setConnection("error");
        setConnectionError(error instanceof Error ? error.message : "Bağlantı kurulamadı");
      }
    },
    [applySnapshot, startDemo, stopLoop],
  );

  const disconnect = useCallback(() => {
    stopLoop();
    simulatorRef.current = null;
    if (clientRef.current) {
      void clientRef.current.close().catch(() => undefined);
      clientRef.current = null;
    }
    setConnection("disconnected");
    setSnapshot(emptySnapshot());
    setDiagnostics([]);
  }, [stopLoop]);

  // boot into demo mode so the cockpit is alive immediately
  useEffect(() => {
    startDemo();
    return () => stopLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTrim = useCallback((trim: TrimLevel) => {
    setIdentity((prev) => ({ ...prev, trim }));
    simulatorRef.current?.setTrim(trim);
  }, []);

  const toggleFault = useCallback((fault: FaultKey) => {
    setFaults((prev) => {
      const on = !prev.includes(fault);
      simulatorRef.current?.toggleFault(fault, on);
      return on ? [...prev, fault] : prev.filter((f) => f !== fault);
    });
  }, []);

  /* -------------------------------------------------------- trip log capture */
  useEffect(() => {
    if (!activeTrip || !settings.logging || connection !== "connected") return;
    if (snapshot.at - lastLogRef.current < 1000) return;
    lastLogRef.current = snapshot.at;
    const row = snapshotToRow(snapshot);
    const faultIds = diagnostics.filter((d) => d.severity !== "info").map((d) => d.id);
    setActiveTrip((trip) =>
      trip
        ? {
            ...trip,
            rows: [...trip.rows.slice(-3600), row],
            faults: [...new Set([...trip.faults, ...faultIds])],
          }
        : trip,
    );
  }, [snapshot, activeTrip, settings.logging, connection, diagnostics]);

  /* ------------------------------------------------------------------- calls */
  const simulateCall = useCallback((name = "Ahmet Yılmaz", number = "+90 532 000 00 00") => {
    setCall({ active: true, status: "incoming", name, number, startedAt: null });
    playRingtone();
  }, []);

  const acceptCall = useCallback(() => {
    setCall((prev) => ({ ...prev, status: "in-call", startedAt: Date.now() }));
  }, []);

  const declineCall = useCallback(() => {
    setCall({ active: false, status: "idle", name: "", number: "", startedAt: null });
  }, []);

  /* ------------------------------------------------------------------- media */
  useEffect(() => {
    if (!playing || call.active) return;
    const id = window.setInterval(() => {
      setPosition((p) => {
        const track = DEMO_TRACKS[mediaIndex] ?? DEMO_TRACKS[0]!;
        if (p + 1 >= track.duration) {
          setMediaIndex((i) => (i + 1) % DEMO_TRACKS.length);
          return 0;
        }
        return p + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing, mediaIndex, call.active]);

  const media = useMemo(
    () => ({
      track: DEMO_TRACKS[mediaIndex] ?? DEMO_TRACKS[0]!,
      index: mediaIndex,
      playing: playing && !call.active,
      position,
      volume: call.active ? volume * 0.15 : volume,
      ducked: call.active,
      toggle: () => setPlaying((p) => !p),
      next: () => {
        setMediaIndex((i) => (i + 1) % DEMO_TRACKS.length);
        setPosition(0);
      },
      prev: () => {
        setMediaIndex((i) => (i - 1 + DEMO_TRACKS.length) % DEMO_TRACKS.length);
        setPosition(0);
      },
      seek: (seconds: number) => setPosition(seconds),
      setVolume: (v: number) => setVolume(Math.min(1, Math.max(0, v))),
    }),
    [mediaIndex, playing, position, volume, call.active],
  );

  /* ------------------------------------------- steering wheel ring shortcuts */
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const { ring } = settings;
      if (event.key === ring.acceptCall && call.status === "incoming") return acceptCall();
      if (event.key === ring.rejectCall && call.active) return declineCall();
      if (event.key === ring.volumeUp) return media.setVolume(volume + 0.05);
      if (event.key === ring.volumeDown) return media.setVolume(volume - 0.05);
      if (event.key === ring.nextTrack) return media.next();
      if (event.key === ring.prevTrack) return media.prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [settings, call.status, call.active, acceptCall, declineCall, media, volume]);

  /* --------------------------------------------- ignition power-loss handling */
  useEffect(() => {
    const persist = () => {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        if (activeTrip) saveTrips([...loadTrips(), { ...activeTrip, endedAt: Date.now() }]);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pagehide", persist);
    return () => window.removeEventListener("pagehide", persist);
  }, [settings, activeTrip]);

  const unsupported = useMemo(
    () => new Set<SignalKey>(UNSUPPORTED_BY_TRIM[identity.trim] ?? []),
    [identity.trim],
  );

  const value: TelemetryContextValue = {
    snapshot,
    diagnostics,
    critical,
    dismissCritical: () => {
      if (critical) dismissedRef.current.add(critical.id);
      setCritical(null);
    },
    source,
    connection,
    connectionError,
    identity,
    setTrim,
    connect,
    disconnect,
    capabilities,
    faults,
    toggleFault,
    call,
    simulateCall,
    acceptCall,
    declineCall,
    media,
    settings,
    updateSettings,
    trips,
    activeTrip,
    startTrip,
    endTrip,
    deleteTrip,
    unsupported,
  };

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry(): TelemetryContextValue {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error("useTelemetry, TelemetryProvider içinde kullanılmalıdır.");
  return ctx;
}

export function useSignal(key: SignalKey) {
  const { snapshot } = useTelemetry();
  return snapshot.signals[key];
}
