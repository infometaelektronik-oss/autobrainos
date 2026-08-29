# AutoBrain OS — Automotive Cockpit & Telemetry OS

A dark, Tesla-style cockpit PWA that turns any touchscreen (Android SBC/TV box, tablet, phone, Raspberry Pi display) into a vehicle telemetry and diagnostic unit. Everything runs client-side: no backend, no accounts.

Because this is a very large system, it is built in phases. Phase 1 delivers a fully working cockpit driven by the simulator, so every gauge, alert and panel is visible and testable immediately; later phases attach real hardware and the deeper diagnostic modules.

## Phase 1 — Cockpit shell, data core, simulator

- Dark cockpit design system (near-black surfaces, neon cyan/amber/red accents, condensed technical type, large touch targets, works at 7", 10" and phone widths).
- Layout: top status bar (voltage, coolant, connection mode, clock, outside temp) / left-center gauge cluster / right media + navigation panel / persistent bottom AI diagnostic bar.
- Central telemetry store: one typed vehicle-state model covering every sensor group in the brief, with per-signal availability flags (`live` / `calculated` / `unsupported`) so missing sensors are greyed out rather than showing 0/255 garbage.
- Data source selector modal + status-bar switch: USB (WebSerial), Bluetooth (Web Bluetooth), Demo. Phase 1 wires Demo fully and shows capability detection for the other two.
- Simulator engine: RPM 800–4500 sweep, speed 0–120 km/h, MAP building with RPM, temps warming up, coupled realistic noise.
- Animated SVG gauges (speed, RPM, boost/MAP, coolant, oil pressure, G-force) plus compact readout tiles.
- Fault injection panel: vacuum leak, overheat 102°C, battery collapse 9.2V, ABS sensor dropout, incoming call from "Ahmet Yılmaz".
- AI diagnostic engine v1 (offline rules, Turkish messages) feeding the bottom bar, plus full-screen flashing critical overlay with Web Audio warning tone for >105°C, zero oil pressure, brake fluid loss.
- Incoming-call overlay with Accept/Decline and automatic media ducking.

## Phase 2 — Real hardware connectivity

- WebSerial transport for FTDI/CH340/CP2102/STN adapters: ELM327 AT init handshake, PID polling loop with adaptive rate, reconnect handling.
- Web Bluetooth transport for ELM327/BLE dongles over the same transport interface.
- Mode 09 VIN query + VIN decoder (WMI → manufacturer, year, engine hints) and protocol auto-detection.
- Sensor availability handshake: probe supported PID bitmasks (0100/0120/0140), mark unsupported signals, filter out-of-range values.

## Phase 3 — Deep protocol + subsystem modules

- Protocol layer: standard Mode 01, UDS/KWP2000 manufacturer requests, legacy K-Line/ALDL profiles (Fiat IAW/Marelli, VAG TP2.0, Renault Clip, Opel Multec) as declarative PID/service maps.
- Trim matrix (A/B/C/D) with per-trim sensor expectations and calculated substitutes.
- Dedicated detail screens: Engine & Boost, Fuel & Combustion (lambda, AFR, trims, rail pressure, injector width, knock), Lubrication & Cooling (oil, ECT, EGT, fuel temp, fan), Ignition & Misfire per cylinder, Brakes (pressure, fluid moisture, pad wear), Chassis (4× WSS, steering angle, yaw/G, TPMS with tire temps), Electrical (voltage, crank drop capture, alternator ripple FFT-style analysis), Emissions (DPF soot/ash, regen status, EGR position).

## Phase 4 — Media, audio, controls, logging

- Media player: USB/local MP3 playback, album art, scrubber, large controls; Bluetooth-audio state display.
- Web Audio input chain for external mic with echo cancellation / noise suppression constraints, and output routing notes for 3.5mm/DAC line-out.
- Steering-wheel Bluetooth ring controller mapping UI (volume, track, call accept/reject) bound to app actions.
- ECU coding module: safe hidden-feature toggles (needle sweep, American park lights, speed auto-lock) gated by trim, clearly marked simulated-until-verified.
- Theme engine (Classic Analog / Tesla Minimal / Race Grid) and a selector to pick the 4 primary cockpit gauges.
- Trip logging to local storage with CSV/JSON export.

## Technical notes

- TanStack Start routes: `/` cockpit, plus `/telemetry/*` detail routes, `/settings`, `/logs`, `/coding`. Shared cockpit chrome in a layout route.
- State: a React context + store module owning the vehicle-state snapshot at ~10 Hz, with a transport interface (`connect`, `poll`, `disconnect`) implemented by Serial, Bluetooth and Simulator adapters — swappable at runtime.
- WebSerial/Web Bluetooth and Web Audio are browser-only: all access happens in effects/handlers behind hydration-safe guards, with capability fallback UI on unsupported browsers.
- Persistence via local storage only (settings, theme, gauge layout, trip logs). No backend needed unless cloud sync is requested later.
- All colors as semantic tokens in `src/styles.css`; gauges rendered as animated SVG with `requestAnimationFrame` value smoothing.
- PWA manifest + fullscreen/kiosk-friendly display, plus ignition-power-loss state saving on `visibilitychange`/`pagehide`.

## Honest scope note

Real ECU coding writes, HFP call answering, and Bluetooth audio streaming are not reachable from a browser sandbox: the browser cannot act as an HFP audio gateway or write to an ECU. Those surfaces are built as complete, driver-ready UI with simulated backing state and clear indicators, ready to bind to a native Android bridge (WebView JS interface) if you later ship a kiosk wrapper.
