import type { MetricScores, SessionStats, WordResult } from "./types";

export function tokenize(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^\p{L}\p{N}']/gu, "")
    .trim();
}

/** Lightweight similarity for near-miss pronunciation (e.g. jump vs jumps). */
export function wordSimilarity(a: string, b: string): number {
  const x = normalizeWord(a);
  const y = normalizeWord(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.startsWith(y) || y.startsWith(x)) {
    return Math.min(x.length, y.length) / Math.max(x.length, y.length);
  }
  const dist = levenshtein(x, y);
  return Math.max(0, 1 - dist / Math.max(x.length, y.length));
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

export function emptyScores(): MetricScores {
  return {
    pronunciation: 100,
    accuracy: 100,
    pace: 100,
    fluency: 100,
    expression: 100,
    overall: 100,
  };
}

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Pace score from SpeaksRace speed-match table idea:
 * closer to target WPM → higher score.
 */
export function paceScore(userWpm: number, targetWpm: number): number {
  if (targetWpm <= 0) return 100;
  const ratio = Math.abs(userWpm - targetWpm) / targetWpm;
  return clampScore((1 - ratio) * 100);
}

export function computeScores(args: {
  words: WordResult[];
  stops: number;
  userWpm: number;
  targetWpm: number;
  pauseEvents: number;
}): MetricScores {
  const { words, stops, userWpm, targetWpm, pauseEvents } = args;
  const total = words.length || 1;
  const correct = words.filter((w) => w.state === "correct").length;
  const errored = words.filter((w) => w.state === "error").length;
  const skipped = words.filter((w) => w.state === "skipped").length;

  const accuracy = clampScore(((correct) / total) * 100);

  // Pronunciation: exact matches score high; near-misses from similarity
  let pronSum = 0;
  let pronCount = 0;
  for (const w of words) {
    if (w.state === "pending" || w.state === "current") continue;
    pronCount++;
    if (w.state === "correct") {
      const sim = w.spoken ? wordSimilarity(w.expected, w.spoken) : 1;
      pronSum += 70 + sim * 30;
    } else if (w.state === "error" && w.spoken) {
      pronSum += wordSimilarity(w.expected, w.spoken) * 70;
    } else {
      pronSum += 40;
    }
  }
  const pronunciation = clampScore(pronCount ? pronSum / pronCount : 100);

  const pace = paceScore(userWpm || targetWpm, targetWpm);

  const fluency = clampScore(
    100 - stops * 6 - pauseEvents * 4 - skipped * 3,
  );

  // Expression heuristic until pitch analysis lands in Phase 2
  const expression = clampScore(
    88 + (accuracy > 90 ? 6 : 0) + (pace > 90 ? 4 : 0) - stops * 2,
  );

  const overall = clampScore(
    pronunciation * 0.35 +
      accuracy * 0.3 +
      pace * 0.15 +
      fluency * 0.1 +
      expression * 0.1,
  );

  return {
    pronunciation,
    accuracy,
    pace,
    fluency,
    expression,
    overall,
  };
}

export function buildCoachSummary(stats: SessionStats): string[] {
  const lines: string[] = [];
  const { scores, correctWords, totalWords, skippedWords, stops, userWpm, targetWpm } =
    stats;

  if (scores.overall >= 90) lines.push("Great progress! You kept the race flowing.");
  else if (scores.overall >= 75) lines.push("Solid run — a few stops, but you finished strong.");
  else lines.push("Keep going. Every stop is practice that builds confidence.");

  lines.push(
    `You matched the AI's pace ${scores.pace}% of the time (${userWpm} vs ${targetWpm} WPM).`,
  );
  lines.push(`You pronounced ${correctWords} of ${totalWords} words correctly.`);
  if (skippedWords > 0) lines.push(`You skipped ${skippedWords} word${skippedWords === 1 ? "" : "s"}.`);
  if (stops > 0) {
    lines.push(`You hit ${stops} red light${stops === 1 ? "" : "s"} — try longer phrases with a steadier pace.`);
  } else {
    lines.push("Smooth driving — no red lights this race!");
  }

  if (scores.pronunciation < 85) {
    lines.push("Recommendation: Tap tricky words and practice them before the next race.");
  } else if (scores.pace < 85) {
    lines.push("Recommendation: Stay within ±5% of the AI speed to unlock Perfect Pace.");
  } else {
    lines.push("Recommendation: Try a harder passage or bump the target speed.");
  }

  return lines;
}

export function buildSessionStats(args: {
  words: WordResult[];
  stops: number;
  userWpm: number;
  targetWpm: number;
  durationMs: number;
  pauseEvents: number;
}): SessionStats {
  const scores = computeScores(args);
  const correctWords = args.words.filter((w) => w.state === "correct").length;
  const skippedWords = args.words.filter((w) => w.state === "skipped").length;
  const mispronouncedWords = args.words.filter((w) => w.state === "error").length;

  const stats: SessionStats = {
    totalWords: args.words.length,
    correctWords,
    skippedWords,
    mispronouncedWords,
    stops: args.stops,
    userWpm: args.userWpm,
    targetWpm: args.targetWpm,
    durationMs: args.durationMs,
    scores,
    coachLines: [],
  };
  stats.coachLines = buildCoachSummary(stats);
  return stats;
}
