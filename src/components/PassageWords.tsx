"use client";

import type { WordResult } from "@/lib/types";

type PassageWordsProps = {
  words: WordResult[];
};

export function PassageWords({ words }: PassageWordsProps) {
  return (
    <p className="text-xl leading-relaxed text-white/90 sm:text-2xl sm:leading-relaxed">
      {words.map((w, i) => {
        const cls =
          w.state === "correct"
            ? "text-teal-300"
            : w.state === "error"
              ? "text-red-400 underline decoration-red-400/80"
              : w.state === "skipped"
                ? "text-white/30 line-through"
                : w.state === "current"
                  ? "bg-amber-300/20 text-amber-200 ring-1 ring-amber-300/40 rounded px-1"
                  : "text-white/55";
        return (
          <span key={`${w.expected}-${i}`} className={`${cls} transition-colors`}>
            {w.expected}
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </p>
  );
}
