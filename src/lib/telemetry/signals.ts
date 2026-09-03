/**
 * Canonical signal catalogue for AutoBrain OS.
 * Every telemetry value in the app is described here exactly once:
 * label (Turkish), unit, physical range, warn/danger thresholds and group.
 */

export type SignalGroup =
  | "engine"
  | "fuel"
  | "cooling"
  | "ignition"
  | "brakes"
  | "chassis"
  | "electrical"
  | "emissions"
  | "ambient";

export type SignalStatus = "live" | "calculated" | "unsupported" | "stale";

export interface SignalMeta {
  label: string;
  short?: string;
  unit: string;
  min: number;
  max: number;
  decimals: number;
  group: SignalGroup;
  /** value above (or below, when invert) which the signal turns amber */
  warn?: number;
  /** value above (or below, when invert) which the signal turns red */
  danger?: number;
  /** thresholds compare with "<" instead of ">" (e.g. oil pressure, voltage) */
  invert?: boolean;
  /** OBD-2 mode 01 PID when the value is a standard PID */
  pid?: string;
}

export const SIGNALS = {
  // --- engine / air & boost -------------------------------------------------
  rpm: {
    label: "Motor Devri",
    short: "RPM",
    unit: "rpm",
    min: 0,
    max: 7000,
    decimals: 0,
    group: "engine",
    warn: 5200,
    danger: 6300,
    pid: "010C",
  },
  speed: {
    label: "Araç Hızı",
    short: "Hız",
    unit: "km/h",
    min: 0,
    max: 240,
    decimals: 0,
    group: "chassis",
    pid: "010D",
  },
  load: {
    label: "Motor Yükü",
    unit: "%",
    min: 0,
    max: 100,
    decimals: 0,
    group: "engine",
    pid: "0104",
  },
  throttle: {
    label: "Gaz Kelebeği",
    unit: "%",
    min: 0,
    max: 100,
    decimals: 0,
    group: "engine",
    pid: "0111",
  },
  map: {
    label: "Emme Manifold Basıncı",
    short: "MAP",
    unit: "bar",
    min: 0,
    max: 3.5,
    decimals: 2,
    group: "engine",
    pid: "010B",
  },
  boost: {
    label: "Turbo Basıncı",
    short: "Boost",
    unit: "bar",
    min: -1,
    max: 2.5,
    decimals: 2,
    group: "engine",
    warn: 1.6,
    danger: 2.1,
  },
  boostTarget: {
    label: "Hedef Turbo Basıncı",
    unit: "bar",
    min: -1,
    max: 2.5,
    decimals: 2,
    group: "engine",
  },
  baro: {
    label: "Atmosfer Basıncı",
    short: "BARO",
    unit: "mbar",
    min: 700,
    max: 1100,
    decimals: 0,
    group: "ambient",
    pid: "0133",
  },
  iat: {
    label: "Emme Havası Sıcaklığı",
    short: "IAT",
    unit: "°C",
    min: -20,
    max: 120,
    decimals: 0,
    group: "engine",
    warn: 65,
    danger: 85,
    pid: "010F",
  },
  maf: {
    label: "Hava Kütle Akışı",
    short: "MAF",
    unit: "g/s",
    min: 0,
    max: 250,
    decimals: 1,
    group: "engine",
    pid: "0110",
  },

  // --- fuel & combustion ---------------------------------------------------
  lambda1: { label: "Lambda B1S1", unit: "λ", min: 0.7, max: 1.3, decimals: 3, group: "fuel" },
  lambda2: { label: "Lambda B1S2", unit: "λ", min: 0.7, max: 1.3, decimals: 3, group: "fuel" },
  lambda3: { label: "Lambda B2S1", unit: "λ", min: 0.7, max: 1.3, decimals: 3, group: "fuel" },
  lambda4: { label: "Lambda B2S2", unit: "λ", min: 0.7, max: 1.3, decimals: 3, group: "fuel" },
  afr: {
    label: "Hava/Yakıt Oranı",
    short: "AFR",
    unit: ":1",
    min: 10,
    max: 19,
    decimals: 1,
    group: "fuel",
  },
  stft: {
    label: "Kısa Dönem Yakıt Trimi",
    short: "STFT",
    unit: "%",
    min: -30,
    max: 30,
    decimals: 1,
    group: "fuel",
    warn: 12,
    danger: 20,
    pid: "0106",
  },
  ltft: {
    label: "Uzun Dönem Yakıt Trimi",
    short: "LTFT",
    unit: "%",
    min: -30,
    max: 30,
    decimals: 1,
    group: "fuel",
    warn: 10,
    danger: 18,
    pid: "0107",
  },
  railPressure: {
    label: "Yakıt Rampa Basıncı",
    unit: "bar",
    min: 0,
    max: 2000,
    decimals: 0,
    group: "fuel",
    pid: "0123",
  },
  injPulse: {
    label: "Enjektör Vuruş Süresi",
    unit: "ms",
    min: 0,
    max: 25,
    decimals: 2,
    group: "fuel",
  },
  knock: {
    label: "Vuruntu Sensörü",
    unit: "olay",
    min: 0,
    max: 50,
    decimals: 0,
    group: "ignition",
    warn: 3,
    danger: 10,
  },
  fuelLevel: {
    label: "Yakıt Seviyesi",
    unit: "%",
    min: 0,
    max: 100,
    decimals: 0,
    group: "fuel",
    invert: true,
    warn: 15,
    danger: 7,
    pid: "012F",
  },
  fuelTemp: {
    label: "Yakıt Sıcaklığı",
    unit: "°C",
    min: -20,
    max: 110,
    decimals: 0,
    group: "fuel",
    warn: 75,
    danger: 90,
  },

  // --- lubrication & cooling ----------------------------------------------
  coolant: {
    label: "Soğutma Suyu Sıcaklığı",
    short: "Hararet",
    unit: "°C",
    min: -20,
    max: 130,
    decimals: 0,
    group: "cooling",
    warn: 100,
    danger: 105,
    pid: "0105",
  },
  oilTemp: {
    label: "Motor Yağı Sıcaklığı",
    unit: "°C",
    min: -20,
    max: 160,
    decimals: 0,
    group: "cooling",
    warn: 120,
    danger: 135,
    pid: "015C",
  },
  oilPressure: {
    label: "Motor Yağ Basıncı",
    unit: "bar",
    min: 0,
    max: 8,
    decimals: 2,
    group: "cooling",
    invert: true,
    warn: 1.0,
    danger: 0.4,
  },
  egt: {
    label: "Egzoz Gazı Sıcaklığı",
    short: "EGT",
    unit: "°C",
    min: 0,
    max: 1000,
    decimals: 0,
    group: "cooling",
    warn: 780,
    danger: 880,
    pid: "0178",
  },

  // --- ignition & cylinders ------------------------------------------------
  timingAdv: {
    label: "Ateşleme Avansı",
    unit: "°",
    min: -20,
    max: 50,
    decimals: 1,
    group: "ignition",
    pid: "010E",
  },
  knockRetard: {
    label: "Vuruntu Geri Çekmesi",
    unit: "°",
    min: 0,
    max: 15,
    decimals: 1,
    group: "ignition",
    warn: 3,
    danger: 7,
  },
  misfire1: {
    label: "Silindir 1 Tekleme",
    unit: "sayım",
    min: 0,
    max: 500,
    decimals: 0,
    group: "ignition",
    warn: 5,
    danger: 30,
  },
  misfire2: {
    label: "Silindir 2 Tekleme",
    unit: "sayım",
    min: 0,
    max: 500,
    decimals: 0,
    group: "ignition",
    warn: 5,
    danger: 30,
  },
  misfire3: {
    label: "Silindir 3 Tekleme",
    unit: "sayım",
    min: 0,
    max: 500,
    decimals: 0,
    group: "ignition",
    warn: 5,
    danger: 30,
  },
  misfire4: {
    label: "Silindir 4 Tekleme",
    unit: "sayım",
    min: 0,
    max: 500,
    decimals: 0,
    group: "ignition",
    warn: 5,
    danger: 30,
  },

  // --- brakes ---------------------------------------------------------------
  brakePressure: {
    label: "Fren Hidrolik Basıncı",
    unit: "bar",
    min: 0,
    max: 160,
    decimals: 1,
    group: "brakes",
  },
  brakePedal: {
    label: "Fren Pedal Pozisyonu",
    unit: "%",
    min: 0,
    max: 100,
    decimals: 0,
    group: "brakes",
  },
  brakeFluidLevel: {
    label: "Fren Hidrolik Seviyesi",
    unit: "%",
    min: 0,
    max: 100,
    decimals: 0,
    group: "brakes",
    invert: true,
    warn: 45,
    danger: 25,
  },
  brakeFluidMoisture: {
    label: "Fren Yağı Nem Oranı",
    unit: "%",
    min: 0,
    max: 6,
    decimals: 2,
    group: "brakes",
    warn: 2.5,
    danger: 3.5,
  },
  padWearFront: {
    label: "Ön Balata Kalınlığı",
    unit: "%",
    min: 0,
    max: 100,
    decimals: 0,
    group: "brakes",
    invert: true,
    warn: 25,
    danger: 12,
  },
  padWearRear: {
    label: "Arka Balata Kalınlığı",
    unit: "%",
    min: 0,
    max: 100,
    decimals: 0,
    group: "brakes",
    invert: true,
    warn: 25,
    danger: 12,
  },

  // --- chassis / wheels ----------------------------------------------------
  wssFL: {
    label: "Sol Ön Tekerlek Hızı",
    unit: "km/h",
    min: 0,
    max: 240,
    decimals: 0,
    group: "chassis",
  },
  wssFR: {
    label: "Sağ Ön Tekerlek Hızı",
    unit: "km/h",
    min: 0,
    max: 240,
    decimals: 0,
    group: "chassis",
  },
  wssRL: {
    label: "Sol Arka Tekerlek Hızı",
    unit: "km/h",
    min: 0,
    max: 240,
    decimals: 0,
    group: "chassis",
  },
  wssRR: {
    label: "Sağ Arka Tekerlek Hızı",
    unit: "km/h",
    min: 0,
    max: 240,
    decimals: 0,
    group: "chassis",
  },
  steeringAngle: {
    label: "Direksiyon Açısı",
    short: "SAS",
    unit: "°",
    min: -540,
    max: 540,
    decimals: 0,
    group: "chassis",
  },
  gLat: { label: "Yanal G Kuvveti", unit: "G", min: -1.5, max: 1.5, decimals: 2, group: "chassis" },
  gLong: {
    label: "Boyuna G Kuvveti",
    unit: "G",
    min: -1.5,
    max: 1.5,
    decimals: 2,
    group: "chassis",
  },
  yawRate: {
    label: "Yaw (Dönüş) Hızı",
    unit: "°/s",
    min: -90,
    max: 90,
    decimals: 1,
    group: "chassis",
  },
  tpmsFL: {
    label: "Sol Ön Lastik Basıncı",
    unit: "bar",
    min: 0,
    max: 4,
    decimals: 2,
    group: "chassis",
    invert: true,
    warn: 2.0,
    danger: 1.7,
  },
  tpmsFR: {
    label: "Sağ Ön Lastik Basıncı",
    unit: "bar",
    min: 0,
    max: 4,
    decimals: 2,
    group: "chassis",
    invert: true,
    warn: 2.0,
    danger: 1.7,
  },
  tpmsRL: {
    label: "Sol Arka Lastik Basıncı",
    unit: "bar",
    min: 0,
    max: 4,
    decimals: 2,
    group: "chassis",
    invert: true,
    warn: 2.0,
    danger: 1.7,
  },
  tpmsRR: {
    label: "Sağ Arka Lastik Basıncı",
    unit: "bar",
    min: 0,
    max: 4,
    decimals: 2,
    group: "chassis",
    invert: true,
    warn: 2.0,
    danger: 1.7,
  },
  tpmsTempFL: {
    label: "Sol Ön Lastik Sıcaklığı",
    unit: "°C",
    min: -20,
    max: 110,
    decimals: 0,
    group: "chassis",
    warn: 75,
    danger: 90,
  },
  tpmsTempFR: {
    label: "Sağ Ön Lastik Sıcaklığı",
    unit: "°C",
    min: -20,
    max: 110,
    decimals: 0,
    group: "chassis",
    warn: 75,
    danger: 90,
  },
  tpmsTempRL: {
    label: "Sol Arka Lastik Sıcaklığı",
    unit: "°C",
    min: -20,
    max: 110,
    decimals: 0,
    group: "chassis",
    warn: 75,
    danger: 90,
  },
  tpmsTempRR: {
    label: "Sağ Arka Lastik Sıcaklığı",
    unit: "°C",
    min: -20,
    max: 110,
    decimals: 0,
    group: "chassis",
    warn: 75,
    danger: 90,
  },

  // --- electrical ----------------------------------------------------------
  voltage: {
    label: "Akü / Şarj Voltajı",
    short: "Voltaj",
    unit: "V",
    min: 8,
    max: 16,
    decimals: 2,
    group: "electrical",
    invert: true,
    warn: 12.2,
    danger: 11.6,
    pid: "0142",
  },
  crankMinVoltage: {
    label: "Marş Anı Min. Voltaj",
    unit: "V",
    min: 6,
    max: 14,
    decimals: 2,
    group: "electrical",
    invert: true,
    warn: 10.2,
    danger: 9.5,
  },
  alternatorRipple: {
    label: "Dinamo AC Dalgalanması",
    short: "Ripple",
    unit: "mV",
    min: 0,
    max: 900,
    decimals: 0,
    group: "electrical",
    warn: 180,
    danger: 350,
  },
  parasiticDraw: {
    label: "Kaçak Akım",
    unit: "mA",
    min: 0,
    max: 900,
    decimals: 0,
    group: "electrical",
    warn: 80,
    danger: 200,
  },

  // --- emissions -----------------------------------------------------------
  dpfSoot: {
    label: "DPF Kurum Yükü",
    unit: "g",
    min: 0,
    max: 60,
    decimals: 1,
    group: "emissions",
    warn: 24,
    danger: 40,
  },
  dpfAsh: {
    label: "DPF Kül Yükü",
    unit: "g",
    min: 0,
    max: 100,
    decimals: 1,
    group: "emissions",
    warn: 60,
    danger: 85,
  },
  dpfDiffPressure: {
    label: "DPF Fark Basıncı",
    unit: "mbar",
    min: 0,
    max: 300,
    decimals: 0,
    group: "emissions",
    warn: 120,
    danger: 200,
  },
  egrPosition: {
    label: "EGR Valf Pozisyonu",
    unit: "%",
    min: 0,
    max: 100,
    decimals: 0,
    group: "emissions",
  },
  catTemp: {
    label: "Katalizör Sıcaklığı",
    unit: "°C",
    min: 0,
    max: 1000,
    decimals: 0,
    group: "emissions",
    warn: 820,
    danger: 900,
    pid: "013C",
  },

  // --- ambient -------------------------------------------------------------
  outsideTemp: {
    label: "Dış Hava Sıcaklığı",
    unit: "°C",
    min: -30,
    max: 55,
    decimals: 0,
    group: "ambient",
  },
} as const satisfies Record<string, SignalMeta>;

export type SignalKey = keyof typeof SIGNALS;

export const SIGNAL_META: Record<SignalKey, SignalMeta> = SIGNALS;

export const SIGNAL_KEYS = Object.keys(SIGNALS) as SignalKey[];

export const GROUP_LABELS: Record<SignalGroup, string> = {
  engine: "Motor, Hava ve Turbo",
  fuel: "Yakıt ve Yanma",
  cooling: "Yağlama ve Soğutma",
  ignition: "Ateşleme ve Silindirler",
  brakes: "Fren Sistemi",
  chassis: "Şasi, Tekerlek ve Lastik",
  electrical: "Elektrik ve Şarj",
  emissions: "Emisyon (DPF / EGR)",
  ambient: "Ortam",
};

export type Severity = "normal" | "warn" | "danger";

export function severityOf(key: SignalKey, value: number): Severity {
  const meta = SIGNALS[key] as SignalMeta;
  const { warn, danger, invert } = meta;
  if (danger !== undefined && (invert ? value <= danger : value >= danger)) return "danger";
  if (warn !== undefined && (invert ? value <= warn : value >= warn)) return "warn";
  return "normal";
}

export function formatSignal(key: SignalKey, value: number): string {
  const meta = SIGNALS[key] as SignalMeta;
  return value.toFixed(meta.decimals);
}
