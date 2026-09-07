import { useEffect, useRef, useState } from "react";

import type { TelemetrySnapshot } from "./types";

/** Telemetri yenileme hızı ve arayüz gecikmesi ölçümleri. */
export interface PerfMetrics {
  /** Saniyedeki telemetri yenilemesi. */
  dataHz: number;
  /** Son verinin yaşı (ms). */
  dataLatency: number;
  /** Arayüz kare hızı. */
  fps: number;
  /** En yavaş kare süresi (ms). */
  worstFrame: number;
  /** Kaçırılan / gecikmiş yenileme oranı (%). */
  dropRate: number;
}

const EMPTY: PerfMetrics = {
  dataHz: 0,
  dataLatency: 0,
  fps: 0,
  worstFrame: 0,
  dropRate: 0,
};

export function usePerfMetrics(snapshot: TelemetrySnapshot): PerfMetrics {
  const [metrics, setMetrics] = useState<PerfMetrics>(EMPTY);
  const ticks = useRef<number[]>([]);
  const frames = useRef<number[]>([]);
  const worst = useRef(0);
  const latency = useRef(0);

  // Telemetri tikleri
  useEffect(() => {
    const now = Date.now();
    ticks.current.push(now);
    if (ticks.current.length > 120) ticks.current.shift();
    latency.current = snapshot.at ? Math.max(0, now - snapshot.at) : 0;
  }, [snapshot]);

  // Kare süreleri + saniyelik özet
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (time: number) => {
      const delta = time - last;
      last = time;
      frames.current.push(delta);
      if (frames.current.length > 180) frames.current.shift();
      if (delta > worst.current) worst.current = delta;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const summary = window.setInterval(() => {
      const now = Date.now();
      const recent = ticks.current.filter((t) => now - t <= 1000);
      const gaps: number[] = [];
      const window1s = ticks.current.filter((t) => now - t <= 3000);
      for (let i = 1; i < window1s.length; i += 1) {
        const a = window1s[i - 1];
        const b = window1s[i];
        if (a !== undefined && b !== undefined) gaps.push(b - a);
      }
      const median = gaps.length > 0 ? [...gaps].sort((x, y) => x - y)[gaps.length >> 1] ?? 0 : 0;
      const dropped = median > 0 ? gaps.filter((g) => g > median * 1.8).length : 0;
      const frameList = frames.current;
      const avgFrame =
        frameList.length > 0 ? frameList.reduce((s, v) => s + v, 0) / frameList.length : 0;

      setMetrics({
        dataHz: recent.length,
        dataLatency: latency.current,
        fps: avgFrame > 0 ? Math.min(120, 1000 / avgFrame) : 0,
        worstFrame: worst.current,
        dropRate: gaps.length > 0 ? (dropped / gaps.length) * 100 : 0,
      });
      worst.current = 0;
    }, 1000);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(summary);
    };
  }, []);

  return metrics;
}
