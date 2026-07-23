import { RaceScreen } from "@/components/RaceScreen";
import { getPassage, PASSAGES } from "@/lib/passages";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ passage?: string }>;
};

export default async function RacePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const id = params.passage ?? PASSAGES[0].id;
  const passage = getPassage(id);
  if (!passage) notFound();

  return (
    <main className="relative flex-1 px-4 py-8 sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,183,0,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(45,212,168,0.1),_transparent_50%)]" />
      <div className="relative mx-auto mb-6 flex max-w-3xl items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium text-white/50 transition hover:text-amber-300"
        >
          ← SpeakRace
        </Link>
        <span className="font-[family-name:var(--font-display)] text-lg tracking-widest text-white/80">
          READING RACE
        </span>
      </div>
      <div className="relative">
        <RaceScreen passage={passage} />
      </div>
    </main>
  );
}
