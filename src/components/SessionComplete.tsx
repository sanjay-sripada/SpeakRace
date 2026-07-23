"use client";

import Link from "next/link";
import type { SessionStats } from "@/lib/types";

type SessionCompleteProps = {
  stats: SessionStats;
  passageTitle: string;
  onRaceAgain: () => void;
};

export function SessionComplete({
  stats,
  passageTitle,
  onRaceAgain,
}: SessionCompleteProps) {
  const mins = Math.floor(stats.durationMs / 60000);
  const secs = Math.round((stats.durationMs % 60000) / 1000);
  const badges = buildBadges(stats);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300/80">
          Session Complete
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-5xl text-white sm:text-6xl">
          Finish!
        </h2>
        <p className="mt-2 text-white/55">{passageTitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Overall" value={`${stats.scores.overall}%`} highlight />
        <Stat label="Distance" value="100%" />
        <Stat label="Travel time" value={`${mins}m ${secs}s`} />
        <Stat label="Smooth driving" value={`${stats.scores.fluency}%`} />
        <Stat label="Stops" value={String(stats.stops)} />
        <Stat label="Top speed" value={`${stats.userWpm} WPM`} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(
          [
            ["Pronunciation", stats.scores.pronunciation],
            ["Accuracy", stats.scores.accuracy],
            ["Speed", stats.scores.pace],
            ["Fluency", stats.scores.fluency],
            ["Expression", stats.scores.expression],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl bg-[#14181f] px-3 py-3 text-center ring-1 ring-white/10"
          >
            <p className="text-[10px] uppercase tracking-wide text-white/40">
              {label}
            </p>
            <p className="mt-1 text-xl font-semibold text-white">{value}%</p>
          </div>
        ))}
      </div>

      {badges.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {badges.map((b) => (
            <span
              key={b}
              className="rounded-full bg-amber-300/15 px-3 py-1 text-xs font-medium text-amber-200 ring-1 ring-amber-300/25"
            >
              {b}
            </span>
          ))}
        </div>
      )}

      <div className="rounded-2xl bg-[#14181f] px-5 py-5 ring-1 ring-white/10">
        <h3 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-white">
          AI Coach
        </h3>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-white/70">
          {stats.coachLines.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="text-teal-300">▸</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onRaceAgain}
          className="rounded-full bg-amber-300 px-8 py-3 text-sm font-bold uppercase tracking-wider text-[#14181f] transition hover:bg-amber-200"
        >
          Race Again
        </button>
        <Link
          href="/"
          className="rounded-full border border-white/15 px-8 py-3 text-center text-sm font-semibold uppercase tracking-wider text-white/80 transition hover:border-white/30 hover:bg-white/5"
        >
          Choose Passage
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl px-4 py-4 ring-1 ${
        highlight
          ? "bg-amber-300/15 ring-amber-300/30"
          : "bg-[#14181f] ring-white/10"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-white/45">{label}</p>
      <p
        className={`mt-1 font-[family-name:var(--font-display)] text-3xl ${
          highlight ? "text-amber-300" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function buildBadges(stats: SessionStats): string[] {
  const out: string[] = [];
  if (stats.scores.accuracy >= 100) out.push("🥇 100% Accuracy");
  if (Math.abs(stats.userWpm - stats.targetWpm) / stats.targetWpm <= 0.05) {
    out.push("⚡ Perfect Pace");
  }
  if (stats.scores.pronunciation >= 95) out.push("🎤 Pronunciation Pro");
  if (stats.stops === 0) out.push("🛣 Smooth Driver");
  return out;
}
