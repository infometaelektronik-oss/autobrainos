import type { CommandResult } from "@/lib/ai/copilot";

export interface CommandMediaActions {
  playing: boolean;
  toggle: () => void;
  next: () => void;
  prev: () => void;
}

export interface CommandActions {
  setClimate: (target: number) => void;
  findChargingStations: () => void;
  showNavigation: () => void;
  showDiagnostics: () => void;
  media: CommandMediaActions;
}

export type CommandAction =
  | "climate"
  | "charging"
  | "navigation"
  | "diagnostics"
  | "media-next"
  | "media-prev"
  | "media-play"
  | "media-pause"
  | "none";

/**
 * Niyetleri tek merkezden gerçek kokpit eylemlerine bağlar.
 * Sesli komut ve ekrandaki hazır komut düğmeleri aynı haritayı kullanır.
 */
export function executeCommand(result: CommandResult, actions: CommandActions): CommandAction {
  switch (result.intent) {
    case "climate":
      if (result.climateTarget === undefined) return "none";
      actions.setClimate(result.climateTarget);
      return "climate";
    case "charging":
      actions.findChargingStations();
      return "charging";
    case "navigation":
      actions.showNavigation();
      return "navigation";
    case "diagnostics":
      actions.showDiagnostics();
      return "diagnostics";
    case "media":
      if (result.mediaAction === "next") {
        actions.media.next();
        return "media-next";
      }
      if (result.mediaAction === "prev") {
        actions.media.prev();
        return "media-prev";
      }
      if (result.mediaAction === "pause") {
        if (actions.media.playing) actions.media.toggle();
        return "media-pause";
      }
      if (!actions.media.playing) actions.media.toggle();
      return "media-play";
    case "status":
    case "unknown":
      return "none";
  }
}
