import { createFileRoute } from "@tanstack/react-router";
import { Download, Play, Square, Trash2 } from "lucide-react";

import { CockpitShell } from "@/components/cockpit/Shell";
import { downloadFile, tripToCsv } from "@/lib/telemetry/logging";
import { useTelemetry } from "@/lib/telemetry/store";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Sürüş Kayıtları ve Veri Dışa Aktarma — AutoBrain OS" },
      {
        name: "description",
        content: "Trip telemetri kayıtlarını görüntüleyin, CSV veya JSON olarak dışa aktarın ve arıza geçmişini inceleyin.",
      },
      { property: "og:title", content: "Sürüş Kayıtları — AutoBrain OS" },
      { property: "og:description", content: "Yerel telemetri kaydedici ile sürüş sonrası analiz ve dışa aktarma." },
    ],
  }),
  component: LogsPage,
});

function LogsPage() {
  const { trips, activeTrip, startTrip, endTrip, deleteTrip } = useTelemetry();

  return (
    <CockpitShell>
      <div className="flex flex-col gap-3">
        <header className="panel grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
          <div className="min-w-0">
            <span className="label-xs">Veri Kaydı</span>
            <h1 className="mt-1 text-2xl font-bold">Sürüş Kayıtları</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeTrip
                ? `Kayıt sürüyor · ${activeTrip.rows.length} satır`
                : "Kayıt kapalı. Yeni bir sürüş kaydı başlatabilirsiniz."}
            </p>
          </div>
          <button
            onClick={activeTrip ? endTrip : startTrip}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
              activeTrip ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
            }`}
          >
            {activeTrip ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {activeTrip ? "Kaydı Bitir" : "Kaydı Başlat"}
          </button>
        </header>

        {trips.length === 0 && !activeTrip && (
          <p className="panel p-6 text-center text-sm text-muted-foreground">
            Henüz kayıt yok. Kaydı başlatın; RPM, MAP, sıcaklıklar ve tespit edilen arızalar saniye bazında yazılır.
          </p>
        )}

        <div className="grid gap-2 sm:gap-3 lg:grid-cols-2">
          {[...trips].reverse().map((trip) => (
            <article key={trip.id} className="panel p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{trip.vehicle}</h2>
                  <p className="text-xs text-muted-foreground">
                    {new Date(trip.startedAt).toLocaleString("tr-TR")} · kaynak: {trip.source} · {trip.rows.length}{" "}
                    satır
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    aria-label="CSV indir"
                    onClick={() => downloadFile(`${trip.id}.csv`, tripToCsv(trip), "text/csv")}
                    className="grid h-10 w-10 place-items-center rounded-lg bg-muted"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="JSON indir"
                    onClick={() =>
                      downloadFile(`${trip.id}.json`, JSON.stringify(trip, null, 2), "application/json")
                    }
                    className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-[10px] font-bold"
                  >
                    JS
                  </button>
                  <button
                    aria-label="Kaydı sil"
                    onClick={() => deleteTrip(trip.id)}
                    className="grid h-10 w-10 place-items-center rounded-lg bg-destructive/15 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {trip.faults.length > 0 && (
                <p className="mt-3 text-xs text-warn">Tespit edilen arızalar: {trip.faults.join(", ")}</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </CockpitShell>
  );
}
