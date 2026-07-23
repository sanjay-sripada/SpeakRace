"use client";

import type { MetricScores } from "@/lib/types";

const METRICS: { key: keyof Omit<MetricScores, "overall">; label: string }[] = [
  { key: "pronunciation", label: "Pronunciation" },
  { key: "accuracy", label: "Accuracy" },
  { key: "pace", label: "Speed" },
  { key: "fluency", label: "Fluency" },
  { key: "expression", label: "Expression" },
];

type LiveScorePanelProps = {
  scores: MetricScores;
  userWpm: number;
  targetWpm: number;
  active: boolean;
};

export function LiveScorePanel({
  scores,
  userWpm,
  targetWpm,
  active,
}: LiveScorePanelProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
      <div className="flex flex-col items-center justify-center rounded-2xl bg-[#14181f] px-4 py-5 ring-1 ring-white/10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
          {active ? "Current" : "Overall"}
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-5xl leading-none text-amber-300">
          {scores.overall}
          <span className="text-2xl text-amber-300/70">%</span>
        </p>
      </div>

      <div className="rounded-2xl bg-[#14181f] px-4 py-4 ring-1 ring-white/10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-white/60">
          <span>
            AI {targetWpm} WPM
            <span className="mx-2 text-white/25">·</span>
            You {userWpm || "—"} WPM
          </span>
          <span className="text-teal-300/90">
            Speed match {scores.pace}%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {METRICS.map((m) => (
            <div key={m.key} className="rounded-lg bg-white/5 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/40">
                {m.label}
              </p>
              <p className="mt-0.5 text-lg font-semibold text-white">
                {scores[m.key]}%
              </p>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-400 to-amber-300 transition-all duration-500"
                  style={{ width: `${scores[m.key]}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
