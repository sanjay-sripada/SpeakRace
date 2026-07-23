import type { Passage } from "./types";

export const CUSTOM_PASSAGE_KEY = "speakrace:custom-passage";
export const MAX_RACE_WORDS = 150;

export type CustomPassagePayload = {
  title: string;
  text: string;
  targetWpm: number;
  sourceName: string;
  truncated: boolean;
  wordCount: number;
};

export function prepareRaceText(raw: string): {
  text: string;
  truncated: boolean;
  wordCount: number;
} {
  const cleaned = cleanExtractedText(raw);
  const words = cleaned.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  if (words.length <= MAX_RACE_WORDS) {
    return { text: cleaned, truncated: false, wordCount };
  }
  return {
    text: words.slice(0, MAX_RACE_WORDS).join(" ") + ".",
    truncated: true,
    wordCount,
  };
}

export function cleanExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function saveCustomPassage(payload: CustomPassagePayload): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CUSTOM_PASSAGE_KEY, JSON.stringify(payload));
}

export function loadCustomPassage(): CustomPassagePayload | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(CUSTOM_PASSAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CustomPassagePayload;
  } catch {
    return null;
  }
}

export function customPayloadToPassage(payload: CustomPassagePayload): Passage {
  return {
    id: "custom",
    title: payload.title,
    level: "medium",
    targetWpm: payload.targetWpm,
    text: payload.text,
  };
}

export function estimateTargetWpm(wordCount: number): number {
  if (wordCount < 40) return 100;
  if (wordCount < 80) return 110;
  if (wordCount < 120) return 120;
  return 125;
}
