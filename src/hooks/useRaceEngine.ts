"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Passage, SessionStats, WordResult } from "@/lib/types";
import {
  alignTranscriptChunk,
  nextAlignAction,
  tokensFromAlternatives,
} from "@/lib/alignment";
import {
  buildSessionStats,
  computeScores,
  emptyScores,
  normalizeWord,
  tokenize,
} from "@/lib/scoring";
import { applyPassageGrammar } from "@/lib/speechGrammar";
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
import {
  WhisperRefiner,
  fetchWhisperAvailability,
  type WhisperAvailability,
} from "@/lib/whisperClient";

const PAUSE_MS = 2500;

export type RecognitionMode = "browser" | "whisper-enhanced";

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
  const [support, setSupport] = useState({ tts: false, stt: false });
  const [recognitionMode, setRecognitionMode] =
    useState<RecognitionMode>("browser");
  const [grammarApplied, setGrammarApplied] = useState(false);
  const [whisperStatus, setWhisperStatus] = useState<WhisperAvailability>({
    available: false,
  });

  const startedAtRef = useRef<number | null>(null);
  const pauseEventsRef = useRef(0);
  const lastAdvanceRef = useRef<number>(Date.now());
  const statusRef = useRef(status);
  const indexRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const whisperRefinerRef = useRef<WhisperRefiner | null>(null);
  const heardBufferRef = useRef<string[]>([]);
  const consumedHeardRef = useRef(0);
  const intentionalStopRef = useRef(false);
  const stopsRef = useRef(0);

  statusRef.current = status;
  indexRef.current = currentIndex;
  stopsRef.current = stops;

  useEffect(() => {
    setSupport(speechSupported());
  }, []);

  useEffect(() => {
    void fetchWhisperAvailability().then(setWhisperStatus);
  }, []);

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

  const finishRace = useCallback(() => {
    intentionalStopRef.current = true;
    stopSpeaking();
    recognitionRef.current?.stop();
    whisperRefinerRef.current?.stop();
    whisperRefinerRef.current = null;
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
          stops: stopsRef.current,
          userWpm: finalWpm,
          targetWpm: passage.targetWpm,
          durationMs,
          pauseEvents: pauseEventsRef.current,
        }),
      );
      return finalized;
    });
  }, [passage.targetWpm]);

  const redLight = useCallback(
    (message: string, markError = true) => {
      if (statusRef.current === "complete" || statusRef.current === "idle") {
        return;
      }
      pauseSpeaking();
      setStatus("stopped");
      setStops((s) => {
        stopsRef.current = s + 1;
        return s + 1;
      });
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
        finishRace();
      } else if (statusRef.current === "stopped") {
        setStatus("racing");
        resumeSpeaking();
      }
    },
    [finishRace, updateWpm],
  );

  const processHeardBuffer = useCallback(() => {
    while (
      statusRef.current === "racing" ||
      statusRef.current === "stopped"
    ) {
      const action = nextAlignAction(
        wordsRef.current,
        indexRef.current,
        heardBufferRef.current,
        consumedHeardRef.current,
      );

      if (action.type === "advance") {
        consumedHeardRef.current += 1;
        if (statusRef.current === "stopped") {
          setStatus("racing");
          resumeSpeaking();
          setCoachMessage(null);
        }
        advanceWord(action.spoken);
      } else if (action.type === "skip_noise") {
        consumedHeardRef.current += 1;
      } else if (action.type === "wrong") {
        consumedHeardRef.current += 1;
        const expected = wordsRef.current[indexRef.current];
        redLight(
          `Red light! "${expected}" wasn't clear. Say it once more to continue.`,
          true,
        );
        break;
      } else {
        break;
      }
    }
  }, [advanceWord, redLight]);

  const ingestHeardTokens = useCallback(
    (tokens: string[]) => {
      if (tokens.length === 0) return;
      if (statusRef.current !== "racing" && statusRef.current !== "stopped") {
        return;
      }
      heardBufferRef.current.push(...tokens);
      processHeardBuffer();
    },
    [processHeardBuffer],
  );

  const applyWhisperTokens = useCallback(
    (tokens: string[]) => {
      if (statusRef.current !== "racing" && statusRef.current !== "stopped") {
        return;
      }

      const matches = alignTranscriptChunk(
        wordsRef.current,
        indexRef.current,
        tokens,
      );

      for (const match of matches) {
        if (match.expectedIndex !== indexRef.current) break;
        if (statusRef.current === "stopped") {
          setStatus("racing");
          resumeSpeaking();
          setCoachMessage(null);
        }
        advanceWord(match.spoken);
      }
    },
    [advanceWord],
  );

  const stopWhisperRefiner = useCallback(() => {
    whisperRefinerRef.current?.stop();
    whisperRefinerRef.current = null;
  }, []);

  const startWhisperRefiner = useCallback(async () => {
    if (!whisperStatus.available) return false;

    stopWhisperRefiner();
    const refiner = new WhisperRefiner({
      prompt: passage.text,
      onTokens: applyWhisperTokens,
      onError: (message) => {
        if (statusRef.current === "racing" || statusRef.current === "stopped") {
          setCoachMessage(message);
        }
      },
    });

    const started = await refiner.start();
    if (started) {
      whisperRefinerRef.current = refiner;
      setRecognitionMode("whisper-enhanced");
    }
    return started;
  }, [applyWhisperTokens, passage.text, stopWhisperRefiner, whisperStatus.available]);

  const startRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    intentionalStopRef.current = false;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 5;

    const grammarOk = applyPassageGrammar(recognition, wordsRef.current);
    setGrammarApplied(grammarOk);
    if (!whisperStatus.available) {
      setRecognitionMode("browser");
    }

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
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (!res.isFinal) continue;

          const alternatives: string[] = [];
          for (let j = 0; j < res.length; j++) {
            alternatives.push(res[j]?.transcript ?? "");
          }

          const tokens = tokensFromAlternatives(
            alternatives.length > 0 ? alternatives : [finalChunk.trim()],
            wordsRef.current,
            indexRef.current,
          );
          ingestHeardTokens(tokens);
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
  }, [ingestHeardTokens, whisperStatus.available]);

  const startRace = useCallback(async () => {
    stopSpeaking();
    recognitionRef.current?.abort();
    stopWhisperRefiner();

    wordsRef.current = tokenize(passage.text);
    const initial: WordResult[] = wordsRef.current.map((expected, i) => ({
      expected,
      state: i === 0 ? "current" : "pending",
    }));
    setWords(initial);
    setCurrentIndex(0);
    indexRef.current = 0;
    setStops(0);
    stopsRef.current = 0;
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

    if (whisperStatus.available) {
      await startWhisperRefiner();
    }

    speakText(passage.text, {
      rate: wpmToRate(passage.targetWpm),
    });
  }, [
    passage,
    startRecognition,
    startWhisperRefiner,
    stopWhisperRefiner,
    whisperStatus.available,
  ]);

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
      stopWhisperRefiner();
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
            stops: stopsRef.current,
            userWpm: finalWpm,
            targetWpm: passage.targetWpm,
            durationMs,
            pauseEvents: pauseEventsRef.current,
          }),
        );
        return latest;
      });
    }
  }, [finishRace, passage.targetWpm, stopWhisperRefiner]);

  const resetRace = useCallback(() => {
    intentionalStopRef.current = true;
    stopSpeaking();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    stopWhisperRefiner();
    setStatus("idle");
    setCurrentIndex(0);
    setStops(0);
    stopsRef.current = 0;
    setCoachMessage(null);
    setTranscript("");
    setUserWpm(0);
    setSession(null);
    setGrammarApplied(false);
    if (!whisperStatus.available) {
      setRecognitionMode("browser");
    }
    setWords(
      tokenize(passage.text).map((expected, i) => ({
        expected,
        state: i === 0 ? "current" : "pending",
      })),
    );
  }, [passage.text, stopWhisperRefiner, whisperStatus.available]);

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

  useEffect(() => {
    whisperRefinerRef.current?.updatePrompt(passage.text);
  }, [passage.text]);

  useEffect(() => {
    return () => {
      intentionalStopRef.current = true;
      stopSpeaking();
      recognitionRef.current?.abort();
      stopWhisperRefiner();
    };
  }, [stopWhisperRefiner]);

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
    recognitionMode,
    grammarApplied,
    whisperAvailable: whisperStatus.available,
    startRace,
    skipWord,
    resetRace,
  };
}
