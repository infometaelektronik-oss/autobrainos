import { createFileRoute } from "@tanstack/react-router";

/**
 * ChatGPT sesi (OpenAI TTS) köprüsü.
 * İstemci metni gönderir, ses SSE akışı olarak parça parça geri döner.
 * LOVABLE_API_KEY yalnızca sunucuda okunur.
 */
export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return new Response(JSON.stringify({ error: "TTS yapılandırılmadı." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: { text?: unknown; voice?: unknown; style?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response(JSON.stringify({ error: "Geçersiz istek." }), { status: 400 });
        }

        const text = typeof body.text === "string" ? body.text.trim().slice(0, 900) : "";
        if (!text) {
          return new Response(JSON.stringify({ error: "Metin boş." }), { status: 400 });
        }
        const voice = typeof body.voice === "string" && body.voice ? body.voice : "alloy";
        const style = body.style === "boot" ? "boot" : "assistant";

        const instructions =
          style === "boot"
            ? "Türkçe konuş. Sakin, sıcak ve kendinden emin bir araç asistanı gibi; sinematik bir işletim sistemi açılışını anlatıyormuş gibi ölçülü tempo, net telaffuz, hafif nefes ve doğal tonlama kullan. Robotik veya haber spikeri tonundan kaçın."
            : "Türkçe konuş. Sürücüye yardımcı olan, sakin, güven veren ve doğal bir insan tonu kullan; kısa, net, arkadaş canlısı. Robotik tonlamadan kaçın.";

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: text,
            voice,
            instructions,
            speed: style === "boot" ? 0.96 : 1,
            stream_format: "sse",
            response_format: "pcm",
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          return new Response(JSON.stringify({ error: detail || "Ses üretilemedi." }), {
            status: upstream.status || 502,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(upstream.body, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
