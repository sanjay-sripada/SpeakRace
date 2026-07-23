"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Passage, SessionStats, WordResult } from "@/lib/types";
import {
  buildSessionStats,
  computeScores,
  emptyScores,
  normalizeWord,
  tokenize,
  wordSimilarity,
} from "@/lib/scoring";
import {
  getSpeechRecognitionCtor,
  pauseSpeaking,
  resumeSpeaking,
  speakText,
  speechSupported,
  stopSpeaking,
  wpmToRate,
  type SpeechRecognitionLike,
} from "@/lib/speech";

const PAUSE_MS = 2500;
const MATCH_THRESHOLD = 0.72;

export function useRaceEngine(passage: Passage) {
  const wordsRef = useRef<string[]>(tokenize(passage.text));
  const [words, setWords] = useState<WordResult[]>(() =>
    wordsRef.current.map((expected) => ({ expected, state: "pending" as const })),
  );
  const [status, setStatus] = useState<
    "idle" | "racing" | "stopped" | "complete"
  >("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stops, setStops] = useState(0);
  const [coachMessage, setCoachMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [userWpm, setUserWpm] = useState(0);
  const [session, setSession] = useState<SessionStats | null>(null);
  const [support] = useState(() => speechSupported());

  const startedAtRef = useRef<number | null>(null);
  const pauseEventsRef = useRef(0);
  const lastAdvanceRef = useRef<number>(Date.now());
  const statusRef = useRef(status);
  const indexRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const heardBufferRef = useRef<string[]>([]);
  const consumedHeardRef = useRef(0);
  const intentionalStopRef = useRef(false);

  statusRef.current = status;
  indexRef.current = currentIndex;

  const scores = computeScores({
    words,
    stops,
    userWpm: userWpm || passage.targetWpm,
    targetWpm: passage.targetWpm,
    pauseEvents: pauseEventsRef.current,
  });

  const progress =
    words.length === 0 ? 0 : Math.min(1, currentIndex / words.length);

  const updateWpm = useCallback(() => {
    if (!startedAtRef.current) return;
    const elapsedMin = (Date.now() - startedAtRef.current) / 60000;
    if (elapsedMin <= 0) return;
    const spoken = indexRef.current;
    setUserWpm(Math.round(spoken / elapsedMin));
  }, []);

  const redLight = useCallback(
    (message: string, markError = true) => {
      if (statusRef.current === "complete" || statusRef.current === "idle") return;
      pauseSpeaking();
      setStatus("stopped");
      setStops((s) => s + 1);
      setCoachMessage(message);
      if (markError) {
        setWords((prev) => {
          const next = [...prev];
          const i = indexRef.current;
          if (next[i] && next[i].state !== "correct") {
            next[i] = { ...next[i], state: "error" };
          }
          return next;
        });
      }
    },
    [],
  );

  const advanceWord = useCallback(
    (spoken?: string) => {
      const i = indexRef.current;
      setWords((prev) => {
        const next = [...prev];
        if (next[i]) {
          next[i] = { ...next[i], state: "correct", spoken };
        }
        if (next[i + 1]) {
          next[i + 1] = { ...next[i + 1], state: "current" };
        }
        return next;
      });
      const nextIndex = i + 1;
      setCurrentIndex(nextIndex);
      indexRef.current = nextIndex;
      lastAdvanceRef.current = Date.now();
      setCoachMessage(null);
      updateWpm();

      if (nextIndex >= wordsRef.current.length) {
        intentionalStopRef.current = true;
        stopSpeaking();
        recognitionRef.current?.stop();
        setStatus("complete");
        const durationMs = startedAtRef.current
          ? Date.now() - startedAtRef.current
          : 0;
        const finalWpm =
          durationMs > 0
            ? Math.round(wordsRef.current.length / (durationMs / 60000))
            : passage.targetWpm;
        setUserWpm(finalWpm);
        setWords((latest) => {
          const finalized = latest.map((w) =>
            w.state === "pending" || w.state === "current"
              ? { ...w, state: "correct" as const }
              : w,
          );
          setSession(
            buildSessionStats({
              words: finalized,
              stops,
              userWpm: finalWpm,
              targetWpm: passage.targetWpm,
              durationMs,
              pauseEvents: pauseEventsRef.current,
            }),
          );
          return finalized;
        });
      } else if (statusRef.current === "stopped") {
        setStatus("racing");
        resumeSpeaking();
      }
    },
    [passage.targetWpm, stops, updateWpm],
  );

  const tryMatchHeard = useCallback(() => {
    if (statusRef.current !== "racing" && statusRef.current !== "stopped") {
      return;
    }
    const expectedList = wordsRef.current;
    let i = indexRef.current;
    const buffer = heardBufferRef.current.slice(consumedHeardRef.current);

    for (let b = 0; b < buffer.length; b++) {
      const heard = buffer[b];
      const expected = expectedList[i];
      if (!expected) break;
      const sim = wordSimilarity(expected, heard);
      if (sim >= MATCH_THRESHOLD) {
        consumedHeardRef.current += 1;
        if (statusRef.current === "stopped") {
          setStatus("racing");
          resumeSpeaking();
          setCoachMessage(null);
        }
        advanceWord(heard);
        i = indexRef.current;
      } else if (sim < 0.4 && heard.length >= 2) {
        // Clear wrong attempt from buffer and red-light
        consumedHeardRef.current += 1;
        redLight(
          `Red light! "${expected}" wasn't clear. Say it once more to continue.`,
          true,
        );
        break;
      } else {
        // ambiguous — wait for more audio
        break;
      }
    }
  }, [advanceWord, redLight]);

  const startRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    intentionalStopRef.current = false;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = "";
      let finalChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res[0]?.transcript ?? "";
        if (res.isFinal) finalChunk += ` ${text}`;
        else interim += ` ${text}`;
      }
      const display = `${finalChunk} ${interim}`.trim();
      if (display) setTranscript(display);

      if (finalChunk.trim()) {
        const parts = finalChunk
          .trim()
          .split(/\s+/)
          .map(normalizeWord)
          .filter(Boolean);
        heardBufferRef.current.push(...parts);
        tryMatchHeard();
      } else if (interim.trim()) {
        // Soft-match interim for snappier car movement
        const last = normalizeWord(interim.trim().split(/\s+/).pop() || "");
        const expected = wordsRef.current[indexRef.current];
        if (
          last &&
          expected &&
          wordSimilarity(expected, last) >= MATCH_THRESHOLD &&
          (statusRef.current === "racing" || statusRef.current === "stopped")
        ) {
          // Don't consume from buffer; wait for final — but nudge coach
          if (statusRef.current === "stopped") {
            setCoachMessage("Nice — keep going!");
          }
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") return;
      if (event.error === "aborted") return;
      setCoachMessage(`Mic issue: ${event.error}. Check permissions and try Chrome.`);
    };

    recognition.onend = () => {
      if (
        !intentionalStopRef.current &&
        (statusRef.current === "racing" || statusRef.current === "stopped")
      ) {
        try {
          recognition.start();
        } catch {
          /* already started */
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      /* ignore */
    }
  }, [tryMatchHeard]);

  const startRace = useCallback(() => {
    stopSpeaking();
    recognitionRef.current?.abort();
    wordsRef.current = tokenize(passage.text);
    const initial: WordResult[] = wordsRef.current.map((expected, i) => ({
      expected,
      state: i === 0 ? "current" : "pending",
    }));
    setWords(initial);
    setCurrentIndex(0);
    indexRef.current = 0;
    setStops(0);
    setCoachMessage(null);
    setTranscript("");
    setUserWpm(0);
    setSession(null);
    heardBufferRef.current = [];
    consumedHeardRef.current = 0;
    pauseEventsRef.current = 0;
    startedAtRef.current = Date.now();
    lastAdvanceRef.current = Date.now();
    setStatus("racing");

    startRecognition();

    speakText(passage.text, {
      rate: wpmToRate(passage.targetWpm),
      onEnd: () => {
        // If user hasn't finished, keep listening until they catch up or timeout via pause watcher
      },
    });
  }, [passage, startRecognition]);

  const skipWord = useCallback(() => {
    const i = indexRef.current;
    setWords((prev) => {
      const next = [...prev];
      if (next[i]) next[i] = { ...next[i], state: "skipped" };
      if (next[i + 1]) next[i + 1] = { ...next[i + 1], state: "current" };
      return next;
    });
    const nextIndex = i + 1;
    setCurrentIndex(nextIndex);
    indexRef.current = nextIndex;
    lastAdvanceRef.current = Date.now();
    setCoachMessage("Skipped — catch the next word to keep rolling.");
    setStatus("racing");
    resumeSpeaking();
    if (nextIndex >= wordsRef.current.length) {
      intentionalStopRef.current = true;
      stopSpeaking();
      recognitionRef.current?.stop();
      setStatus("complete");
      const durationMs = startedAtRef.current
        ? Date.now() - startedAtRef.current
        : 0;
      const finalWpm =
        durationMs > 0
          ? Math.round(wordsRef.current.length / (durationMs / 60000))
          : passage.targetWpm;
      setUserWpm(finalWpm);
      setWords((latest) => {
        setSession(
          buildSessionStats({
            words: latest,
            stops,
            userWpm: finalWpm,
            targetWpm: passage.targetWpm,
            durationMs,
            pauseEvents: pauseEventsRef.current,
          }),
        );
        return latest;
      });
    }
  }, [passage.targetWpm, stops]);

  const resetRace = useCallback(() => {
    intentionalStopRef.current = true;
    stopSpeaking();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setStatus("idle");
    setCurrentIndex(0);
    setStops(0);
    setCoachMessage(null);
    setTranscript("");
    setUserWpm(0);
    setSession(null);
    setWords(
      tokenize(passage.text).map((expected, i) => ({
        expected,
        state: i === 0 ? "current" : "pending",
      })),
    );
  }, [passage.text]);

  // Pause watchdog
  useEffect(() => {
    if (status !== "racing") return;
    const id = window.setInterval(() => {
      if (statusRef.current !== "racing") return;
      if (Date.now() - lastAdvanceRef.current > PAUSE_MS) {
        pauseEventsRef.current += 1;
        const expected = wordsRef.current[indexRef.current];
        redLight(
          expected
            ? `Yellow light — long pause. Say "${normalizeWord(expected)}" to continue.`
            : "Yellow light — keep speaking to move the car.",
          false,
        );
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [status, redLight]);

  // Cleanup
  useEffect(() => {
    return () => {
      intentionalStopRef.current = true;
      stopSpeaking();
      recognitionRef.current?.abort();
    };
  }, []);

  // Re-sync words when passage changes
  useEffect(() => {
    wordsRef.current = tokenize(passage.text);
    resetRace();
  }, [passage.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    support,
    status,
    words,
    currentIndex,
    progress,
    stops,
    coachMessage,
    transcript,
    scores: status === "idle" ? emptyScores() : scores,
    userWpm,
    targetWpm: passage.targetWpm,
    session,
    startRace,
    skipWord,
    resetRace,
  };
}
