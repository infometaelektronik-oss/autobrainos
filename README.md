# AutoBrain Cockpit

Build a full-scale, production-ready, ultra-professional Automotive Cockpit & Telemetry Operating System called "AutoBrain OS". The system must turn any touchscreen (Embedded Android SBCs like Allwinner H3/H616 TV Box boards, Tablets, or Smartphones) into a complete, AI-powered vehicle control unit. Construct the code using React, Tailwind CSS, Lucide React icons, WebSerial API, Web Bluetooth API, and Web Audio API.



### 1. GENERAL SYSTEM PHILOSOPHY & TESLA-STYLE COCKPIT UI

- Design a high-contrast Dark Cockpit interface (Tesla/Race Telemetry style) optimized for 7", 10", and mobile touchscreens.

- Zero-latency responsive layout divided into: Top Status Bar, Main Gauges Section (Left/Center), Media & Navigation Panel (Right), and Persistent Bottom AI Diagnostic Bar.



### 2. HARDWARE PLATFORM AGNOSTICISM & EMBEDDED SBC SUPPORT

- Ensure 100% compatibility with embedded Android SBCs (TV Box mainboards running AOSP/AVM in kiosk mode) powered directly by ignition power (eliminating lithium battery swelling risks).

- Full support for Android tablets, smartphones, and custom Linux/Raspberry Pi displays in full-screen PWA mode.



### 3. DUAL-CONNECTIVITY DATA SOURCE SELECTOR

- Create a modal and status bar selector with 3 modes:

  1. USB Cable Mode (Primary): Uses Chrome WebSerial API for direct OTG cable connection to OBD interface (FTDI/STN/CH340 chips) for zero-latency data.

  2. Bluetooth Mode: Uses Web Bluetooth API for ELM327 / BLE OBD adapters.

  3. Demo / Simulation Mode: Full offline simulator generating realistic dynamic sensor loops.



### 4. DYNAMIC VEHICLE IDENTIFICATION & VIN DECODER

- Implement auto-VIN querying (OBD Mode 09) upon connection.

- Automatically resolve car manufacturer (VAG, Fiat/PSA, Renault, Ford, BMW/Opel, etc.), model year, engine code, and specific ECU protocols.



### 5. AUTOMOTIVE TRIM MATRIX (A, B, C, D PACKAGES) & SENSOR HANDSHAKE

- Support Base (A/B) vs Fully-Loaded (C/D) factory trim levels.

- Perform an initial sensor availability handshake: If a base package lacks specific sensors (e.g., Oil Temp, Brake Pad Wear), dynamically hide/disable those gauges or substitute with calculated values instead of rendering corrupt "0" or "255" garbage data.



### 6. MULTI-PROTOCOL OEM DECODER (OBD1, OBD2, CAN-BUS, UDS)

- Build a protocol parser supporting:

  - Standard OBD2 CAN-Bus (Mode 01 PIDs).

  - Deep UDS (Unified Diagnostic Services) and KWP2000 for manufacturer-specific addresses.

  - Legacy OBD1 K-Line / ALDL protocols (Fiat IAW / Marelli, VAG TP2.0, Renault Clip, Opel Multec).



### 7. ENGINE AIR & BOOST PRESSURE TELEMETRY

- Live digital/analog gauges for:

  - MAP (Manifold Absolute Pressure in Bar/PSI).

  - Turbo / Supercharger Boost Pressure (Target vs Actual).

  - Barometric Atmospheric Pressure (BARO).

  - Intake Air Temperature (IAT) and Mass Air Flow (MAF in g/s).



### 8. COMBUSTION & FUEL SYSTEM MONITORING

- Track Lambda / Oxygen Sensors (Bank 1/2, Sensor 1/2) for real-time Air-Fuel Ratio (Rich/Lean).

- Fuel Rail Pressure (High-pressure pump & injector rail).

- Short Term & Long Term Fuel Trims (STFT / LTFT) percentage shifts.

- Injector Pulse Width (ms) and Knock Sensor triggers.



### 9. LUBRICATION & COOLING SYSTEM HEALTH

- Engine Oil Pressure (Bar) and Oil Temperature (°C) monitoring.

- Coolant Temperature (ECT) and Exhaust Gas Temperature (EGT) for Turbo/DPF safety.

- Fuel Temperature and radiator fan status indicators.



### 10. IGNITION & CYLINDER HEALTH

- Cylinder Misfire Counters (individual live counts for Cylinders 1, 2, 3, 4).

- Spark timing advance degrees and knock retard detection per cylinder.



### 11. BRAKE SYSTEM TELEMETRY & FLUID HEALTH

- Brake Master Cylinder Hydraulic Pressure (Bar).

- Brake Fluid Level and Moisture/Quality percentage sensor readings.

- Front/Rear Brake Pad Wear percentage status and pad-to-disc contact warnings.



### 12. CHASSIS, WHEELS & SUSPENSION DYNAMICS

- 4-Wheel Speed Sensors (WSS) reading directly from ABS/ESP module (individual tekerlek hızları).

- Steering Angle Sensor (SAS in degrees) and Yanal/Dikey G-Force (Yaw Rate) meter.

- Tire Pressure Monitoring System (TPMS) reading PSI/Bar and inner tire temperatures for all 4 wheels.



### 13. ELECTRICAL SYSTEM & ALTERNATOR RIPPLE ANALYSIS

- Real-time battery voltage (V).

- Starter Crank Voltage Drop monitoring (capturing minimum voltage collapse during ignition).

- Alternator Diode Ripple Analysis: Detect AC voltage fluctuations caused by failing alternator diodes or voltage regulators.



### 14. EMISSION & EXHAUST SYSTEM (DPF & EGR)

- DPF (Diesel Particulate Filter) Soot & Ash Load grams monitoring.

- DPF Regeneration Status (Active/Passive/Blocked).

- EGR (Exhaust Gas Recirculation) Valve position percentage and error tracking.



### 15. BLUETOOTH HANDS-FREE (HFP) CALL OVERLAY

- Full-screen incoming call pop-up overlay:

  - Display caller name, phone number, and driver-focused large "Accept" and "Decline" touch buttons.

  - Automatic Media Ducking: Instantly mute or lower music volume when a call is active.

  - Steering wheel ring controller integration for hands-free call answering.



### 16. AUDIO ROUTING, NOISE CANCELLATION & MIKROFON

- Support external 3.5mm / USB directional microphone input via Web Audio API.

- Integrated Acoustic Echo Cancellation (AEC) and noise-suppression filter preventing speaker feedback.

- Clean analog audio routing via 3.5mm AUX / DAC output directly to vehicle head unit or amplifier, preventing ECU/BCM electrical interference.



### 17. MEDIA PLAYER & NAVIGATION SPLIT-PANEL

- Integrated minimalist Media Player supporting USB MP3 and Bluetooth Audio playback with album art, track scrubbers, and large touch controls.

- Dedicated panel container for embedded offline/online Navigation Maps.



### 18. FACTORY HIDDEN FEATURE TOGGLE (ECU CODING MODULE)

- A dedicated diagnostic utility panel allowing users to view and toggle safe factory-hidden features based on trim levels (e.g., Gauge Needle Sweep/Selamlama, American Park lights, Auto door lock on speed).



### 19. ON-DEVICE AI PREDICTIVE DIAGNOSTIC ENGINE

- Build a offline client-side decision logic engine cross-referencing sensor inputs to output natural, plain Turkish diagnostic advice on the Bottom AI Bar:

  - "⚠️ Emme manifoldunda veya vakum hortumunda hava kaçağı var." (When MAP drops while LTFT spikes).

  - "⚠️ Motor Soğutma Suyu 98°C, radyatör fanı devrede." (High coolant temp).

  - "⚠️ Akü marş voltajı 9.2V'a düştü, akü şarj tutmuyor." (Starter voltage drop).

  - "⚠️ Sol ön tekerlek ABS hız sensörü veri vermiyor." (Wheel speed sensor mismatch).

  - "⚠️ Şarj dinamosu voltajında dalgalanma var, diyot tablası arızalı olabilir." (Alternator ripple detected).



20. CRITICAL FAULT VISUAL & AUDIBLE WARNING OVERLAYS

- Full-screen flashing emergency alerts with audible warning sounds for high overheat (>105°C), zero oil pressure, or critical brake fluid loss.



### 21. STEERING WHEEL BLUETOOTH RING CONTROLLER MAPPING

- Configurable button-mapping settings interface allowing direksiyon Bluetooth kumanda rings (Volume Up/Down, Track Skip, Call Accept/Reject) to control software actions.



### 22. COMPREHENSIVE DEMO / SIMULATOR CONTROLLERS

- Demo mode control panel with realistic dynamic loops (RPM sweeping 800-4500, Speed 0-120 km/h, MAP pressure building with RPM).

- Interactive "Simulate Fault" triggers:

  - Vacuum Leak Simulation

  - Overheat Trigger (102°C)

  - Low Battery Starter Collapse (9.2V)

  - ABS Sensor Disconnect

  - Simulated Incoming Call ("Ahmet Yılmaz")



### 23. MULTI-GAUGE CUSTOMIZATION & THEME ENGINE

- Customizable dashboard themes: Classic Analog Gauges, Futuristic Tesla Minimal, or Full Race Telemetry Grid.

- Drag-and-drop / selector modal to change which 4 main sensors appear on the primary cockpit view.



### 24. DATA LOGGING & EXPORT ENGINE

- Local storage telemetry recorder saving trip logs (RPM, MAP, Temps, Faults) in CSV/JSON format for post-drive diagnostics and performance graphing.



### 25. INITIAL CODE BASE & UI STRUCTURE

- Generate the layout using React components, Tailwind CSS styling, Lucide React icons, WebSerial connection handlers, and animated SVG/Canvas gauge components.



Build a production-ready, highly sophisticated Automotive Cockpit, Diagnostic, and Telemetry Operating System named "AutoBrain OS". The system is a Web Application / PWA designed to transform any touchscreen—including Android SBCs (TV Box mainboards like Allwinner H3/H616 running AOSP/AVM in kiosk mode), Tablets, or Smartphones—into a full-fledged, AI-powered vehicle control unit.



---



### 1. PLATFORM AGNOSTICISM & HARDWARE ARCHITECTURE

- Vehicle-Grade Hardware Support: Fully optimized to run on embedded Android SBCs powered directly by ignition power (eliminating lithium battery swelling/fire risks present in tablets).

- Multi-Device PWA: Responsive layouts adapting dynamically to 7", 10", and smartphone touchscreen aspect ratios.

- Audio Output Line-Out: Pure analog audio routing via 3.5mm AUX / DAC directly to the vehicle's head unit or external amplifier, completely isolated to prevent electrical feedback or ECU/BCM board damage.



---



### 2. DUAL-CONNECTIVITY & DATA INPUT LAYER

Provide a dedicated Modal & Status Bar Data Source Selector supporting 3 distinct modes:

1. USB Cable Mode (Primary): Uses Chrome WebSerial API for zero-latency direct OTG cable connection to OBD interfaces (FTDI, STN, CH340 chips).

2. Bluetooth Mode: Uses Web Bluetooth API for wireless ELM327 / BLE OBD dongles.

3. Demo / Simulation Mode: Comprehensive built-in offline simulator generating realistic dynamic sensor data loops for testing without a vehicle.



---



### 3. AUTOMOTIVE TRIM MATRIX (A, B, C, D PACKAGES) & DYNAMIC PROTOCOL DECODER

- Dynamic VIN & Protocol Auto-Detection: Query Vehicle Identification Number (Mode 09) upon connection to identify car brand (VAG, Fiat/PSA, Renault, Ford, BMW, Opel), engine code, and specific ECU protocols.

- Multi-Protocol Support: Standard OBD2 CAN-Bus (Mode 01 PIDs), UDS (Unified Diagnostic Services), KWP2000, and legacy OBD1 K-Line / ALDL protocols (Fiat IAW / Marelli, VAG TP2.0, Renault Clip, Opel Multec).

- Trim Package Handshake (A, B, C, D Trim Levels): Gracefully handle missing/disabled sensors on lower-tier trim packages (e.g., if a Base A/B package lacks Oil Temp or Brake Pad Wear sensors, automatically hide/disable those widgets or substitute calculated values instead of rendering corrupt "0" or "255" garbage data).

- Factory Hidden Feature Toggle (ECU Coding Module): Diagnostic interface placeholder to view and toggle safe factory-hidden features (e.g., Gauge Needle Sweep/Selamlama, American Park lights, Speed-sensitive Auto Lock).



---



### 4. FULL VEHICLE TELEMETRY & ORGAN MONITORING



A. ENGINE, AIR & BOOST PRESSURE:

- Live gauges for MAP (Manifold Absolute Pressure in Bar/PSI) and Turbo Boost (Target vs Actual).

- Barometric Pressure (BARO), Intake Air Temp (IAT), and Mass Air Flow (MAF in g/s).



B. COMBUSTION & FUEL SYSTEM:

- Lambda / Oxygen Sensors (Bank 1/2, Sensor 1/2) for real-time Air-Fuel Ratio (Rich/Lean).

- Fuel Rail Pressure (High-pressure pump & injector rail).

- Short Term & Long Term Fuel Trims (STFT / LTFT) percentage shifts.

- Injector Pulse Width (ms) and Knock Sensor triggers.



C. LUBRICATION & COOLING:

- Engine Oil Pressure (Bar) and Oil Temperature (°C).

- Coolant Temperature (ECT) and Exhaust Gas Temperature (EGT) for DPF/Turbo protection.

- Fuel Temperature and Radiator Fan relay status.



D. IGNITION & CYLINDER HEALTH:

- Cylinder Misfire Counters (individual live counts for Cylinders 1, 2, 3, 4).

- Spark timing advance degrees and knock retard per cylinder.



E. BRAKE SYSTEM & FLUID HEALTH:

- Master Cylinder Hydraulic Brake Pressure (Bar) and Brake Pedal Position Sensor.

- Brake Fluid Level and Moisture/Quality percentage sensor inputs.

- Front and Rear Brake Pad Wear percentage status and pad-to-disc contact warnings.



F. CHASSIS, WHEELS & SUSPENSION:

- 4-Wheel Speed Sensors (WSS) reading directly from ABS/ESP modules (individual wheel speeds for slip/skid detection).

- Steering Angle Sensor (SAS in degrees) and Yanal/Dikey G-Force (Yaw Rate) meter.

- Tire Pressure Monitoring System (TPMS) reading PSI/Bar and inner tire temperatures for all 4 wheels.



G. ELECTRICAL SYSTEM & ALTERNATOR RIPPLE ANALYSIS:

- Real-time Battery Voltage (V).

- Starter Crank Voltage Drop monitoring (capturing minimum voltage collapse during ignition start).

- Alternator Diode Ripple Analysis (detecting AC voltage fluctuations caused by failing alternator diodes/regulators).



H. EMISSIONS & EXHAUST (DPF & EGR):

- DPF (Diesel Particulate Filter) Soot & Ash Load grams monitoring and Regeneration Status (Active/Passive).

- EGR (Exhaust Gas Recirculation) Valve position percentage and error tracking.



---



### 5. BLUETOOTH HANDS-FREE (HFP) CALLS & MEDIA SYSTEM

- Incoming Call Pop-up Overlay: Displays caller name/number with large touch-friendly "Accept" and "Decline" buttons.

- Automatic Media Ducking: Instantly mutes or lowers background music/engine sounds when a call is active.

- Noise-Canceling Microphone Input: Supports external 3.5mm/USB directional microphones via Web Audio API with Acoustic Echo Cancellation (AEC).

- Steering Wheel Ring Controller Mapping: Settings panel to map Bluetooth ring controllers (Volume Up/Down, Track Skip, Call Accept/Reject) to software triggers.

- Split-Screen Media Panel: Minimalist player supporting USB MP3 and Bluetooth Audio with album art and track scrubbers alongside navigation map containers.



---



### 6. ON-DEVICE AI PREDICTIVE DIAGNOSTIC ENGINE (OFFLINE TURKISH ALERTS)

Implement a client-side decision logic engine cross-referencing live sensor data to deliver human-readable, plain Turkish diagnostic advice on a persistent Bottom AI Bar:

- "⚠️ Emme manifoldunda veya vakum hortumunda hava kaçağı var." (When MAP drops while LTFT spikes).

- "⚠️ Soğutma suyu sıcaklığı 98°C, radyatör fanı devrede." (High coolant temp alert).

- "⚠️ Akü marş voltajı 9.2V'a düştü, akü şarj tutmuyor." (Starter voltage collapse alert).

- "⚠️ Sol ön tekerlek ABS hız sensörü veri vermiyor." (Wheel speed sensor mismatch).

- "⚠️ Şarj dinamosu voltajında dalgalanma var, diyot tablası arızalı olabilir." (Alternator ripple detected).

- Full-Screen Visual/Audible Emergency Alerts: Flashing red overlays and warning tones for extreme overheat (>105°C), zero oil pressure, or critical brake fluid loss.



---



### 7. TESLA-STYLE SPLIT-SCREEN DASHBOARD LAYOUT

- Top Status Bar: Live Voltage (V), Coolant Temp (°C), Connection Mode (USB/BT/Demo), Clock, Outside Air Temp.

- Main Gauges (Left/Center): Large digital/analog gauges for Speed, RPM, Boost/MAP, Hararet, Voltaj, and G-Force.

- Media & Nav Panel (Right): Media player, navigation container, and steering ring shortcuts.

- Bottom AI Bar: Real-time Turkish Diagnostic & Predictive Maintenance stream.



---



### 8. FULL SIMULATION / DEMO CONTROLLER

Include a comprehensive Demo Mode panel with:

- Realistic sweeping loops for RPM (800-4500), Speed (0-120 km/h), MAP Pressure, and Temperatures.

- Interactive "Simulate Fault" Triggers: Vacuum Leak, Overheat (102°C), Low Battery (9.2V), ABS Sensor Disconnect.

- "Simulate Incoming Call" Trigger: Simulates an incoming call from "Ahmet Yılmaz" to test media ducking and call pop-up overlay.



---



### 9. INITIAL CODE BASE & STYLING

Generate the application using React components, Tailwind CSS (Dark Cockpit Theme), Lucide React icons, WebSerial connection handlers, and animated SVG/Canvas gauge components.

Build a production-ready, ultra-professional, and exhaustive Automotive Cockpit, Telemetry, and Diagnostic Operating System named "AutoBrain OS". The system is a Progressive Web App (PWA) built with React, Tailwind CSS, Lucide React icons, WebSerial API, Web Bluetooth API, and Web Audio API. It is engineered to turn any touchscreen display—specifically embedded Android SBCs (TV Box mainboards such as Allwinner H3, H616, H96 Max running AOSP/AVM in kiosk mode), Android tablets, smartphones, or custom Linux/Raspberry Pi displays—into a complete, AI-powered vehicle control unit and interactive cockpit interface.



---



### 1. SYSTEM PHILOSOPHY & TESLA-STYLE SPLIT-SCREEN COCKPIT UI

- Theme: Ultra-modern Dark Cockpit UI with high-contrast neon accents (Tesla, Cyberpunk, and Motorsport Telemetry style) for crystal-clear readability under daylight and night driving conditions.

- Touch Optimization: Large touch targets, gesture controls, and zero clutter designed for 7-inch, 10-inch, and mobile screen ratios.

- Split-Screen Layout Architecture:

  1. TOP STATUS BAR: Live Battery Voltage (V), Coolant Temp (°C), Connection Mode Indicator (USB / Bluetooth / Demo), Digital Clock, and Outside Air Temperature.

  2. LEFT / CENTER COCKPIT PANEL: Main gauges featuring RPM, Vehicle Speed (GPS/OBD), Turbo/MAP pressure, Coolant Temp, Oil Pressure, and G-Force.

  3. RIGHT MEDIA & NAVIGATION PANEL: Minimalist music player, Navigation map placeholder, and Hands-Free calling pop-up layer.

  4. BOTTOM PERSISTENT AI BAR: Live stream of plain Turkish predictive diagnostic messages and system status alerts.



---



### 2. HARDWARE PLATFORM AGNOSTICISM & EMBEDDED SBC INTEGRATION

- Embedded SBC Direct-Power Support: Engineered to run natively on lithium-battery-less Android SBC TV Box boards powered directly by vehicle ignition (ACC power line), completely removing lithium battery explosion/swelling risks in hot vehicles.

- Power State Handling: Gracefully save local state and configurations when ignition power drops.

- Safe Audio Output & Wiring Isolation:

  - Route all system and call audio via clean 3.5mm AUX / DAC line-out directly to the vehicle's head unit or external amplifier.

  - Hardware & Software Isolation: Ensure no voltage spikes or signal feedback reach the vehicle's body control module (BCM), ECU, or head unit circuitry, eliminating the risk of burning factory audio receivers or car electronics.



---



### 3. DUAL-CONNECTIVITY & DATA INPUT LAYER

Provide a dedicated Modal and Status Bar "Data Source Selector" allowing seamless switching between:

1. USB Cable Mode (Primary): Uses Chrome WebSerial API for direct OTG cable connections to hardware interfaces (FTDI, STN, CH340, CP2102 chips) delivering zero-latency, raw serial data transmission.

2. Bluetooth Mode: Uses Web Bluetooth API for wireless ELM327, Vgate, or BLE OBD2 dongles.

3. Demo / Simulation Mode: Full offline simulator generating dynamic, realistic, smoothly oscillating dummy sensor data loops for testing and presentation without needing a physical vehicle connection.



---



### 4. DYNAMIC VEHICLE IDENTIFICATION & MULTI-PROTOCOL DECODER

- Auto-VIN Decoding: Query Vehicle Identification Number (OBD Mode 09) upon connection to automatically resolve vehicle make (VAG Group, Fiat/PSA, Renault, Ford, BMW, Mercedes, Opel, etc.), model year, engine code, and factory ECU specifications.

- Deep Multi-Protocol Engine:

  - OBD2 CAN-Bus (Standard Mode 01 PIDs).

  - Deep UDS (Unified Diagnostic Services) and KWP2000 for manufacturer-specific memory addresses.

  - Legacy OBD1 K-Line and ALDL protocols (Fiat IAW / Marelli, VAG TP2.0, Renault Clip, Opel Multec).



---



### 5. AUTOMOTIVE TRIM MATRIX (A, B, C, D PACKAGES) & SENSOR HANDSHAKE

- Trim Level Handshake: Automatically detect or allow user selection of vehicle trim packages (Base A/B packages vs Fully-Loaded C/D packages).

- Dynamic Sensor Availability Verification:

  - Upon connection, test every sensor PID for response.

  - If a base trim level (A/B package) lacks physical hardware sensors (e.g., Engine Oil Temp, Brake Pad Wear, or Turbo Boost), dynamically grey out, hide, or calculate estimated values for those widgets.

  - Garbage Data Filter: Strictly filter out corrupted Hex data or default error readings (e.g., -40°C, 255°C, or 0 Bar anomalies) to prevent incorrect telemetry display.

- ECU Coding & Factory Hidden Feature Toggle Module:

  - A dedicated diagnostic utility screen allowing users to safely view and toggle support

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://autobrainos.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/53a15a62-6926-4750-b146-f30330d16c31).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
