import type { Passage } from "./types";

export const PASSAGES: Passage[] = [
  {
    id: "fox",
    title: "The Fox",
    level: "easy",
    targetWpm: 100,
    text: "The quick brown fox jumps over the lazy dog.",
  },
  {
    id: "sunrise",
    title: "Sunrise",
    level: "easy",
    targetWpm: 110,
    text: "The sun rises in the east and paints the sky with gold. Birds sing as a new day begins.",
  },
  {
    id: "confidence",
    title: "Speak with Confidence",
    level: "medium",
    targetWpm: 120,
    text: "Confidence grows when you practice every day. Take a breath, keep a steady pace, and trust your voice.",
  },
  {
    id: "journey",
    title: "The Long Road",
    level: "medium",
    targetWpm: 125,
    text: "Every long journey starts with a single step. Keep moving forward even when the road feels difficult.",
  },
  {
    id: "presentation",
    title: "Presentation Ready",
    level: "hard",
    targetWpm: 130,
    text: "When you present your ideas, speak clearly and pause between sentences. Strong delivery helps your audience remember your message.",
  },
];

export function getPassage(id: string): Passage | undefined {
  return PASSAGES.find((p) => p.id === id);
}
