"use client";

import { useRaceEngine } from "@/hooks/useRaceEngine";
import type { Passage } from "@/lib/types";
import { RaceTrack } from "@/components/RaceTrack";
import { PassageWords } from "@/components/PassageWords";
import { LiveScorePanel } from "@/components/LiveScorePanel";
import { CoachBanner } from "@/components/CoachBanner";
import { SessionComplete } from "@/components/SessionComplete";

type RaceScreenProps = {
  passage: Passage;
};

export function RaceScreen({ passage }: RaceScreenProps) {
  const race = useRaceEngine(passage);

  if (race.status === "complete" && race.session) {
    return (
      <SessionComplete
        stats={race.session}
        passageTitle={passage.title}
        onRaceAgain={race.startRace}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/75">
            SpeakRace · {passage.level}
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl tracking-wide text-white sm:text-5xl">
            {passage.title}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-white/45">Target {passage.targetWpm} WPM</p>
          {race.status !== "idle" && (
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-teal-300/80">
              {race.recognitionMode === "whisper-enhanced"
                ? "Whisper + smart match"
                : race.grammarApplied
                  ? "Passage-tuned browser STT"
                  : "Browser speech match"}
            </p>
          )}
        </div>
      </header>

      {race.whisperAvailable && race.status === "idle" && (
        <div className="rounded-2xl bg-teal-400/10 px-4 py-3 text-sm text-teal-100 ring-1 ring-teal-300/20">
          Whisper enhancement is active — races use OpenAI transcription for
          higher accuracy.
        </div>
      )}

      {!race.whisperAvailable && race.status === "idle" && (
        <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/55 ring-1 ring-white/10">
          Using improved passage-aware matching. Add{" "}
          <code className="rounded bg-black/30 px-1.5 py-0.5 text-teal-200">
            OPENAI_API_KEY
          </code>{" "}
          to <code className="rounded bg-black/30 px-1.5 py-0.5 text-teal-200">.env.local</code>{" "}
          for Whisper-level accuracy.
        </div>
      )}

      {(!race.support.stt || !race.support.tts) && (
        <div className="rounded-2xl bg-amber-400/10 px-4 py-3 text-sm text-amber-100 ring-1 ring-amber-300/25">
          Speech works best in <strong>Chrome</strong> or Edge with microphone
          permission. {!race.support.stt && "Speech recognition unavailable. "}
          {!race.support.tts && "Text-to-speech unavailable."}
        </div>
      )}

      <RaceTrack progress={race.progress} status={race.status} />

      <div className="rounded-2xl bg-[#14181f]/80 px-5 py-5 ring-1 ring-white/10 backdrop-blur">
        <PassageWords words={race.words} />
        {race.transcript && race.status !== "idle" && (
          <p className="mt-4 border-t border-white/10 pt-3 text-sm text-white/40">
            Heard: <span className="text-white/70">{race.transcript}</span>
          </p>
        )}
      </div>

      <CoachBanner message={race.coachMessage} status={race.status} />

      <LiveScorePanel
        scores={race.scores}
        userWpm={race.userWpm}
        targetWpm={race.targetWpm}
        active={race.status === "racing" || race.status === "stopped"}
      />

      <div className="flex flex-wrap items-center gap-3">
        {race.status === "idle" ? (
          <button
            type="button"
            onClick={race.startRace}
            className="rounded-full bg-amber-300 px-8 py-3 text-sm font-bold uppercase tracking-wider text-[#14181f] transition hover:bg-amber-200"
          >
            Start Race
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={race.resetRace}
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white/80 transition hover:bg-white/5"
            >
              Reset
            </button>
            {race.status === "stopped" && (
              <button
                type="button"
                onClick={race.skipWord}
                className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white/60 transition hover:bg-white/5"
              >
                Skip Word
              </button>
            )}
            <span className="text-sm text-white/40">
              Stops: {race.stops}
              {race.status === "stopped" ? " · Waiting for correct word…" : ""}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
