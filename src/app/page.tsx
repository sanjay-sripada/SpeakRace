import Link from "next/link";
import { UploadTrack } from "@/components/UploadTrack";
import { PASSAGES } from "@/lib/passages";

const LEVEL_COLOR = {
  easy: "text-teal-300",
  medium: "text-amber-300",
  hard: "text-orange-300",
} as const;

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_0%,_rgba(245,183,0,0.18),_transparent),radial-gradient(ellipse_60%_40%_at_90%_20%,_rgba(45,212,168,0.12),_transparent)]" />
        <div
          className="absolute inset-x-0 bottom-0 h-40 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 40px, rgba(245,183,0,0.15) 40px 42px)",
          }}
        />
      </div>

      <section className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-14 sm:px-8 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-teal-300/90">
          Read aloud · Build confidence
        </p>
        <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-6xl leading-[0.92] tracking-wide text-white sm:text-8xl">
          SpeakRace
        </h1>
        <p className="mt-5 max-w-xl text-lg text-white/65 sm:text-xl">
          Keep the car moving. Read with the AI. Mistakes pause the race — not
          your progress.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href={`/race?passage=${PASSAGES[0].id}`}
            className="rounded-full bg-amber-300 px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-[#14181f] shadow-[0_12px_40px_rgba(245,183,0,0.25)] transition hover:bg-amber-200"
          >
            Start First Race
          </Link>
          <Link
            href="/#upload"
            className="rounded-full border border-white/15 px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-white/80 transition hover:border-amber-300/40 hover:text-amber-200"
          >
            Upload Your File
          </Link>
          <p className="text-sm text-white/40">Chrome recommended · Mic required</p>
        </div>

        <div className="mt-14 max-w-xl">
          <div className="relative h-14 overflow-hidden rounded-xl bg-[#14181f] ring-1 ring-white/10">
            <div
              className="absolute inset-x-6 top-1/2 h-[2px] -translate-y-1/2 opacity-60"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, #f5b700 0 14px, transparent 14px 28px)",
              }}
            />
            <div className="absolute left-[12%] top-1/2 -translate-y-1/2 text-2xl animate-[cruise_3s_ease-in-out_infinite]">
              🏎️
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xl">
              🏁
            </div>
          </div>
        </div>
      </section>

      <section
        id="upload"
        className="relative border-t border-white/10 bg-[#10141a]/80 px-5 py-12 backdrop-blur sm:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <UploadTrack />
        </div>
      </section>

      <section className="relative border-t border-white/10 px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-white">
            Choose your track
          </h2>
          <p className="mt-2 text-white/50">
            Pick a built-in passage — or upload your own above.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PASSAGES.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/race?passage=${p.id}`}
                  className="group block rounded-2xl bg-[#14181f] p-5 ring-1 ring-white/10 transition hover:ring-amber-300/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${LEVEL_COLOR[p.level]}`}
                    >
                      {p.level}
                    </span>
                    <span className="text-xs text-white/35">{p.targetWpm} WPM</span>
                  </div>
                  <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-wide text-white group-hover:text-amber-200">
                    {p.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/45">
                    {p.text}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
