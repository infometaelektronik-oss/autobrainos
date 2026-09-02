import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import { AIBar } from "./AIBar";
import { CallOverlay, CriticalOverlay } from "./Overlays";
import { SourceModal } from "./SourceModal";
import { StatusBar } from "./StatusBar";

const SECTIONS = [
  { to: "/telemetry/engine", label: "Motor" },
  { to: "/telemetry/fuel", label: "Yakıt" },
  { to: "/telemetry/cooling", label: "Soğutma" },
  { to: "/telemetry/ignition", label: "Ateşleme" },
  { to: "/telemetry/brakes", label: "Fren" },
  { to: "/telemetry/chassis", label: "Şasi" },
  { to: "/telemetry/electrical", label: "Elektrik" },
  { to: "/telemetry/emissions", label: "Emisyon" },
  { to: "/coding", label: "ECU Kodlama" },
  { to: "/logs", label: "Kayıtlar" },
];

/** Persistent cockpit chrome: status bar, page body, AI bar and overlays. */
export function CockpitShell({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  const [sourceOpen, setSourceOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col gap-2 p-2 sm:gap-3 sm:p-3">
      <StatusBar onOpenSource={() => setSourceOpen(true)} />
      {nav && (
        <nav className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {SECTIONS.map((section) => (
            <Link
              key={section.to}
              to={section.to}
              activeProps={{ className: "border-primary bg-primary/15 text-primary" }}
              className="shrink-0 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground"
            >
              {section.label}
            </Link>
          ))}
        </nav>
      )}
      <main className="min-h-0 flex-1">{children}</main>
      <AIBar />
      <SourceModal open={sourceOpen} onClose={() => setSourceOpen(false)} />
      <CallOverlay />
      <CriticalOverlay />
    </div>
  );
}
