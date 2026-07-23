"use client";

type RaceTrackProps = {
  progress: number;
  status: "idle" | "racing" | "stopped" | "complete";
};

export function RaceTrack({ progress, status }: RaceTrackProps) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  const stopped = status === "stopped";
  const idle = status === "idle";

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#14181f] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex items-center justify-between px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300/80">
        <span>Start</span>
        <span className="text-teal-300/80">Finish</span>
      </div>

      <div className="relative mx-3 mb-4 mt-2 h-20 rounded-xl bg-gradient-to-b from-[#2a303a] to-[#1b2028] ring-1 ring-black/40">
        {/* Road surface stripes */}
        <div
          className="pointer-events-none absolute inset-x-4 top-1/2 h-[3px] -translate-y-1/2 opacity-70"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, #f5b700 0 18px, transparent 18px 34px)",
          }}
        />

        {/* Finish flag */}
        <div className="absolute right-3 top-1/2 flex h-10 w-8 -translate-y-1/2 items-center justify-center">
          <span className="text-2xl" aria-hidden>
            🏁
          </span>
        </div>

        {/* Car */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 transition-[left] duration-300 ease-out ${
            stopped ? "animate-pulse" : ""
          }`}
          style={{ left: `calc(${pct}% * 0.82 + 4%)` }}
        >
          <div
            className={`relative -translate-x-1/2 transition-transform ${
              status === "racing" ? "translate-y-0" : ""
            } ${stopped ? "scale-95" : "scale-100"}`}
          >
            <MiniCar stopped={stopped} idle={idle} />
            {stopped && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-red-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                Stop
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniCar({ stopped, idle }: { stopped: boolean; idle: boolean }) {
  return (
    <svg
      width="56"
      height="28"
      viewBox="0 0 56 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Race car"
      className={`drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)] ${
        !idle && !stopped ? "animate-[nudge_0.4s_ease-in-out_infinite]" : ""
      }`}
    >
      <path
        d="M8 18h40l-3-7c-1-2-3-4-6-4H18c-3 0-5 2-6 4L8 18z"
        fill={stopped ? "#94a3b8" : "#f5b700"}
      />
      <path
        d="M18 8h14c2 0 3.5 1.2 4 3l1 3H15l1-3c.5-1.8 2-3 4-3z"
        fill="#0f141a"
        opacity="0.35"
      />
      <circle cx="16" cy="20" r="4" fill="#0f141a" />
      <circle cx="40" cy="20" r="4" fill="#0f141a" />
      <circle cx="16" cy="20" r="1.6" fill="#e2e8f0" />
      <circle cx="40" cy="20" r="1.6" fill="#e2e8f0" />
      <rect x="44" y="14" width="4" height="2" rx="1" fill="#2dd4a8" />
    </svg>
  );
}
