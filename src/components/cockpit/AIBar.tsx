import { Brain, ChevronRight } from "lucide-react";

import { useTelemetry } from "@/lib/telemetry/store";
import { cn } from "@/lib/utils";

export function AIBar() {
  const { diagnostics } = useTelemetry();

  return (
    <section
      aria-label="Yapay zeka teşhis akışı"
      className="panel flex items-stretch gap-3 overflow-hidden p-0"
    >
      <div className="flex shrink-0 items-center gap-2 bg-primary/12 px-3 py-2.5 text-primary">
        <Brain className="h-4 w-4 shrink-0" />
        <span className="label-xs !text-primary hidden sm:inline">AI Teşhis</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto px-1 py-2 [scrollbar-width:none]">
        {diagnostics.map((message) => (
          <div key={message.id} className="flex min-w-0 shrink-0 items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                message.severity === "critical"
                  ? "bg-destructive flash-alert"
                  : message.severity === "warn"
                    ? "bg-warn"
                    : "bg-ok",
              )}
            />
            <p
              className={cn(
                "whitespace-nowrap text-sm",
                message.severity === "critical"
                  ? "text-destructive font-semibold"
                  : message.severity === "warn"
                    ? "text-warn"
                    : "text-muted-foreground",
              )}
              title={message.detail}
            >
              {message.text}
            </p>
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          </div>
        ))}
      </div>
    </section>
  );
}
