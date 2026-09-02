import { createFileRoute, notFound } from "@tanstack/react-router";

import { CockpitShell } from "@/components/cockpit/Shell";
import { SignalTile } from "@/components/cockpit/SignalTile";
import { GROUP_LABELS, SIGNAL_KEYS, SIGNAL_META, type SignalGroup } from "@/lib/telemetry/signals";
import { useTelemetry } from "@/lib/telemetry/store";

const SECTIONS: Record<string, { group: SignalGroup; title: string; blurb: string }> = {
  engine: { group: "engine", title: "Motor, Hava ve Turbo", blurb: "MAP, turbo basıncı, emme havası ve hava kütle akışı telemetrisi." },
  fuel: { group: "fuel", title: "Yakıt ve Yanma", blurb: "Lambda sensörleri, hava/yakıt oranı, yakıt trimleri ve rampa basıncı." },
  cooling: { group: "cooling", title: "Yağlama ve Soğutma", blurb: "Yağ basıncı/sıcaklığı, hararet ve egzoz gazı sıcaklığı." },
  ignition: { group: "ignition", title: "Ateşleme ve Silindirler", blurb: "Silindir bazlı tekleme sayımları, avans ve vuruntu geri çekmesi." },
  brakes: { group: "brakes", title: "Fren Sistemi", blurb: "Hidrolik basınç, fren yağı seviyesi/nemi ve balata aşınması." },
  chassis: { group: "chassis", title: "Şasi, Tekerlek ve Lastik", blurb: "4 tekerlek hız sensörü, direksiyon açısı, G kuvveti ve TPMS." },
  electrical: { group: "electrical", title: "Elektrik ve Şarj", blurb: "Akü voltajı, marş çöküşü ve dinamo diyot dalgalanma analizi." },
  emissions: { group: "emissions", title: "Emisyon (DPF / EGR)", blurb: "DPF kurum/kül yükü, rejenerasyon durumu ve EGR valf pozisyonu." },
  ambient: { group: "ambient", title: "Ortam", blurb: "Atmosfer basıncı ve dış hava sıcaklığı." },
};

export const Route = createFileRoute("/telemetry/$section")({
  loader: ({ params }) => {
    const section = SECTIONS[params.section];
    if (!section) throw notFound();
    return { section };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Telemetri bulunamadı — AutoBrain OS" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.section.title} Telemetrisi — AutoBrain OS`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.section.blurb },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.section.blurb },
      ],
    };
  },
  component: TelemetrySection,
});

function TelemetrySection() {
  const { section } = Route.useLoaderData();
  const { snapshot, identity, unsupported } = useTelemetry();

  const keys = SIGNAL_KEYS.filter((key) => SIGNAL_META[key].group === section.group);
  const missing = keys.filter((key) => unsupported.has(key));

  return (
    <CockpitShell>
      <div className="flex flex-col gap-3">
        <header className="panel p-4">
          <span className="label-xs">{GROUP_LABELS[section.group]}</span>
          <h1 className="mt-1 text-2xl font-bold">{section.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{section.blurb}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {identity.make} {identity.model} · Paket {identity.trim} · {keys.length - missing.length}/{keys.length}{" "}
            sensör aktif
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
          {keys.map((key) => (
            <SignalTile key={key} signalKey={key} signal={snapshot.signals[key]} />
          ))}
        </div>

        {missing.length > 0 && (
          <p className="panel p-4 text-xs text-muted-foreground">
            Paket {identity.trim} donanımında bulunmayan sensörler devre dışı:{" "}
            {missing.map((key) => SIGNAL_META[key].label).join(", ")}. Bu değerler bozuk veri göstermemek için
            gizlenir; mümkün olduğunda hesaplanmış değerle beslenir.
          </p>
        )}
      </div>
    </CockpitShell>
  );
}
