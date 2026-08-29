import type { BytePipe } from "./elm327";

/* -------------------------------------------------------------------------- */
/* Capability detection (browser-only, call from effects/handlers)             */
/* -------------------------------------------------------------------------- */

export function hasWebSerial(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export function hasWebBluetooth(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

/* -------------------------------------------------------------------------- */
/* WebSerial pipe — FTDI / CH340 / CP2102 / STN OTG cables                     */
/* -------------------------------------------------------------------------- */

interface SerialLike {
  requestPort(): Promise<SerialPortLike>;
}
interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}

export async function openSerialPipe(baudRate = 38400): Promise<BytePipe> {
  const serial = (navigator as unknown as { serial?: SerialLike }).serial;
  if (!serial) throw new Error("Bu tarayıcı WebSerial desteklemiyor (Chrome / Edge gerekli).");
  const port = await serial.requestPort();
  await port.open({ baudRate });
  if (!port.readable || !port.writable) throw new Error("Seri port akışları açılamadı.");
  const reader = port.readable.getReader();
  const writer = port.writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  return {
    async write(data) {
      await writer.write(encoder.encode(data));
    },
    async readUntilPrompt(timeoutMs = 2500) {
      const deadline = Date.now() + timeoutMs;
      while (!buffer.includes(">") && Date.now() < deadline) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) buffer += decoder.decode(value, { stream: true });
      }
      const cut = buffer.indexOf(">");
      const out = cut >= 0 ? buffer.slice(0, cut) : buffer;
      buffer = cut >= 0 ? buffer.slice(cut + 1) : "";
      return out;
    },
    async close() {
      try {
        reader.releaseLock();
        writer.releaseLock();
        await port.close();
      } catch {
        /* port already gone */
      }
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Web Bluetooth pipe — ELM327 / Vgate BLE dongles                            */
/* -------------------------------------------------------------------------- */

const BLE_SERVICES = [
  "0000fff0-0000-1000-8000-00805f9b34fb", // common ELM327 BLE clones
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Vgate iCar Pro
];

interface BluetoothLike {
  requestDevice(options: unknown): Promise<{
    name?: string;
    gatt?: {
      connect(): Promise<{
        getPrimaryServices(): Promise<
          Array<{ getCharacteristics(): Promise<BluetoothCharacteristicLike[]> }>
        >;
        disconnect(): void;
      }>;
    };
  }>;
}
interface BluetoothCharacteristicLike {
  properties: { write: boolean; writeWithoutResponse: boolean; notify: boolean };
  writeValueWithoutResponse?(data: BufferSource): Promise<void>;
  writeValue(data: BufferSource): Promise<void>;
  startNotifications(): Promise<unknown>;
  addEventListener(type: string, listener: (event: Event) => void): void;
}

export async function openBluetoothPipe(): Promise<BytePipe> {
  const bluetooth = (navigator as unknown as { bluetooth?: BluetoothLike }).bluetooth;
  if (!bluetooth) throw new Error("Bu tarayıcı Web Bluetooth desteklemiyor.");
  const device = await bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: BLE_SERVICES,
  });
  const gatt = await device.gatt?.connect();
  if (!gatt) throw new Error("BLE GATT bağlantısı kurulamadı.");
  const services = await gatt.getPrimaryServices();
  let writeChar: BluetoothCharacteristicLike | null = null;
  let notifyChar: BluetoothCharacteristicLike | null = null;
  for (const service of services) {
    for (const characteristic of await service.getCharacteristics()) {
      if (!writeChar && (characteristic.properties.write || characteristic.properties.writeWithoutResponse)) {
        writeChar = characteristic;
      }
      if (!notifyChar && characteristic.properties.notify) notifyChar = characteristic;
    }
  }
  if (!writeChar || !notifyChar) throw new Error("ELM327 BLE karakteristikleri bulunamadı.");

  const decoder = new TextDecoder();
  let buffer = "";
  await notifyChar.startNotifications();
  notifyChar.addEventListener("characteristicvaluechanged", (event) => {
    const target = event.target as unknown as { value?: DataView };
    if (target.value) buffer += decoder.decode(target.value);
  });

  const encoder = new TextEncoder();
  return {
    async write(data) {
      const payload = encoder.encode(data);
      if (writeChar!.properties.writeWithoutResponse && writeChar!.writeValueWithoutResponse) {
        await writeChar!.writeValueWithoutResponse(payload);
      } else {
        await writeChar!.writeValue(payload);
      }
    },
    async readUntilPrompt(timeoutMs = 2500) {
      const deadline = Date.now() + timeoutMs;
      while (!buffer.includes(">") && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 12));
      }
      const cut = buffer.indexOf(">");
      const out = cut >= 0 ? buffer.slice(0, cut) : buffer;
      buffer = cut >= 0 ? buffer.slice(cut + 1) : "";
      return out;
    },
    async close() {
      try {
        device.gatt && (await device.gatt.connect()).disconnect();
      } catch {
        /* already disconnected */
      }
    },
  };
}
