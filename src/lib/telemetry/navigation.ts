export interface ChargingStation {
  id: string;
  name: string;
  distanceKm: number;
  powerKw: number;
  available: number;
  total: number;
}

/** Açıkça demo olarak işaretlenen örnek sonuçlar; canlı konum iddiası taşımaz. */
export const DEMO_CHARGING_STATIONS: ChargingStation[] = [
  { id: "demo-1", name: "Demo Şarj Noktası · Açık Otopark", distanceKm: 2.4, powerKw: 120, available: 2, total: 4 },
  { id: "demo-2", name: "Demo Şarj Noktası · AVM", distanceKm: 3.1, powerKw: 60, available: 1, total: 6 },
  { id: "demo-3", name: "Demo Şarj Noktası · Servis", distanceKm: 4.8, powerKw: 180, available: 3, total: 4 },
];

export const LIVE_CHARGING_MAP_URL =
  "https://www.google.com/maps/search/electric+vehicle+charging+station/";
