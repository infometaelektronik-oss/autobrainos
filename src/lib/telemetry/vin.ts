import type { VehicleIdentity } from "./types";

const WMI: Record<string, { make: string; protocol: string }> = {
  WVW: { make: "Volkswagen (VAG)", protocol: "VAG TP2.0 / UDS over CAN" },
  WAU: { make: "Audi (VAG)", protocol: "VAG TP2.0 / UDS over CAN" },
  TMB: { make: "Skoda (VAG)", protocol: "VAG TP2.0 / UDS over CAN" },
  VSS: { make: "SEAT (VAG)", protocol: "VAG TP2.0 / UDS over CAN" },
  ZFA: { make: "Fiat", protocol: "Fiat IAW / Marelli KWP2000" },
  ZAR: { make: "Alfa Romeo", protocol: "Fiat IAW / Marelli KWP2000" },
  VF1: { make: "Renault", protocol: "Renault CLIP / DDT2000" },
  VF3: { make: "Peugeot (PSA)", protocol: "PSA KWP2000 / CAN" },
  VF7: { make: "Citroën (PSA)", protocol: "PSA KWP2000 / CAN" },
  WF0: { make: "Ford", protocol: "Ford FEPS / ISO15765-4 CAN" },
  WBA: { make: "BMW", protocol: "BMW ISTA / UDS over CAN" },
  WDB: { make: "Mercedes-Benz", protocol: "Mercedes HHT-WIN / UDS" },
  W0L: { make: "Opel", protocol: "Opel Multec / GM-LAN" },
  NM0: { make: "Ford Otosan", protocol: "ISO15765-4 CAN" },
  TMA: { make: "Hyundai", protocol: "KWP2000 / UDS over CAN" },
  KNA: { make: "Kia", protocol: "KWP2000 / UDS over CAN" },
  JTD: { make: "Toyota", protocol: "Toyota TIS / ISO15765-4" },
  VNK: { make: "Toyota Türkiye", protocol: "Toyota TIS / ISO15765-4" },
};

const YEAR_CODES = "ABCDEFGHJKLMNPRSTVWXY123456789";

export function decodeVin(vin: string): VehicleIdentity {
  const clean = vin.trim().toUpperCase();
  const wmi = clean.slice(0, 3);
  const known = WMI[wmi];
  const yearChar = clean.charAt(9);
  const idx = YEAR_CODES.indexOf(yearChar);
  // 30-year cycle: codes repeat, resolve into the most recent plausible year
  let year: number | null = null;
  if (idx >= 0) {
    const base = 1980 + idx;
    year = base;
    while (year + 30 <= new Date().getFullYear()) year += 30;
  }

  return {
    vin: clean.length >= 11 ? clean : null,
    make: known?.make ?? "Bilinmeyen Üretici",
    model: clean.slice(3, 8) || "—",
    year,
    engineCode: clean.slice(7, 9) || "—",
    protocol: known?.protocol ?? "ISO15765-4 CAN (11bit/500k)",
    trim: "C",
    fuel: "dizel",
  };
}

export const DEMO_IDENTITY: VehicleIdentity = {
  vin: "WVWZZZ1KZAW123456",
  make: "Volkswagen (VAG)",
  model: "Golf 1.6 TDI",
  year: 2016,
  engineCode: "CAYC",
  protocol: "VAG TP2.0 / UDS over CAN (500 kbit)",
  trim: "C",
  fuel: "dizel",
};
