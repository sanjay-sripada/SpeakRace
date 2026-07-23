"use client";

type CoachBannerProps = {
  message: string | null;
  status: "idle" | "racing" | "stopped" | "complete";
};

export function CoachBanner({ message, status }: CoachBannerProps) {
  if (status === "idle") {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-sm text-white/60">
        Put on headphones if you can. Press Start Race, listen to the AI, and
        read along. Keep the car moving — mistakes only pause you, they never
        end the race.
      </div>
    );
  }

  if (!message && status === "racing") {
    return (
      <div className="rounded-2xl bg-teal-400/10 px-4 py-3 text-sm text-teal-200 ring-1 ring-teal-300/20">
        Smooth driving — stay with the AI&apos;s pace.
      </div>
    );
  }

  if (!message) return null;

  const danger = status === "stopped";
  return (
    <div
      className={`rounded-2xl px-4 py-3 text-sm ring-1 ${
        danger
          ? "bg-red-500/15 text-red-100 ring-red-400/30"
          : "bg-amber-400/10 text-amber-100 ring-amber-300/25"
      }`}
    >
      {message}
    </div>
  );
}
