import { normalizeWord, wordSimilarity } from "./scoring";

/** Minimum score to advance the car on a final transcript token. */
export const MATCH_THRESHOLD = 0.68;

/** Advance on interim results when the match is very strong. */
export const INTERIM_MATCH_THRESHOLD = 0.88;

/** Below this score on a confident token → red light. */
export const WRONG_WORD_THRESHOLD = 0.35;

export type AlignAction =
  | { type: "advance"; spoken: string }
  | { type: "skip_noise"; token: string }
  | { type: "wrong"; spoken: string }
  | { type: "wait" };

/** Consonant skeleton for pronunciation-tolerant matching. */
function consonantSkeleton(word: string): string {
  const n = normalizeWord(word);
  if (!n) return "";
  return n
    .replace(/ph/g, "f")
    .replace(/ck/g, "k")
    .replace(/gh/g, "")
    .replace(/[aeiouy]+/g, "")
    .replace(/(.)\1+/g, "$1");
}

export function phoneticSimilarity(a: string, b: string): number {
  const skA = consonantSkeleton(a);
  const skB = consonantSkeleton(b);
  if (!skA || !skB) return 0;
  if (skA === skB) return 1;
  if (skA.startsWith(skB) || skB.startsWith(skA)) {
    return Math.min(skA.length, skB.length) / Math.max(skA.length, skB.length);
  }
  return wordSimilarity(skA, skB);
}

/** Blend spelling + pronunciation similarity for read-aloud matching. */
export function matchWord(expected: string, heard: string): number {
  const ortho = wordSimilarity(expected, heard);
  const phon = phoneticSimilarity(expected, heard);
  return Math.max(ortho, ortho * 0.45 + phon * 0.55);
}

export function bestMatchForExpected(
  expected: string,
  alternatives: string[],
): { token: string; score: number } | null {
  let best: { token: string; score: number } | null = null;
  for (const alt of alternatives) {
    for (const raw of alt.split(/\s+/)) {
      const token = normalizeWord(raw);
      if (!token) continue;
      const score = matchWord(expected, token);
      if (!best || score > best.score) {
        best = { token, score };
      }
    }
  }
  return best;
}

/** Pick heard tokens from alternatives, biased toward upcoming expected words. */
export function tokensFromAlternatives(
  alternatives: string[],
  expectedWords: string[],
  fromIndex: number,
): string[] {
  const primary = alternatives[0]?.trim();
  if (!primary) return [];

  const rawTokens = primary
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean);

  return rawTokens.map((token, offset) => {
    const expected = expectedWords[fromIndex + offset];
    if (!expected) return token;
    const best = bestMatchForExpected(expected, alternatives);
    if (best && best.score >= MATCH_THRESHOLD) return best.token;
    return token;
  });
}

export function nextAlignAction(
  expectedWords: string[],
  currentIndex: number,
  heardBuffer: string[],
  consumed: number,
): AlignAction {
  const pending = heardBuffer.slice(consumed);
  if (pending.length === 0 || currentIndex >= expectedWords.length) {
    return { type: "wait" };
  }

  const expected = expectedWords[currentIndex];
  const heard = pending[0];
  const score = matchWord(expected, heard);

  if (score >= MATCH_THRESHOLD) {
    return { type: "advance", spoken: heard };
  }

  // Drop stray STT tokens that don't match the current word or the next one.
  if (pending.length > 1 && score < 0.3) {
    const nextScore = matchWord(expected, pending[1]);
    if (nextScore >= MATCH_THRESHOLD) {
      return { type: "skip_noise", token: heard };
    }
  }

  if (score < WRONG_WORD_THRESHOLD && heard.length >= 2) {
    return { type: "wrong", spoken: heard };
  }

  return { type: "wait" };
}

/** Align a transcript chunk and return how many words to advance from `fromIndex`. */
export function alignTranscriptChunk(
  expectedWords: string[],
  fromIndex: number,
  heardTokens: string[],
): Array<{ expectedIndex: number; spoken: string; score: number }> {
  const matches: Array<{ expectedIndex: number; spoken: string; score: number }> =
    [];
  let i = fromIndex;
  let h = 0;

  while (h < heardTokens.length && i < expectedWords.length) {
    const heard = heardTokens[h];
    const score = matchWord(expectedWords[i], heard);

    if (score >= MATCH_THRESHOLD) {
      matches.push({ expectedIndex: i, spoken: heard, score });
      i += 1;
      h += 1;
      continue;
    }

    if (score < 0.28 && h + 1 < heardTokens.length) {
      const nextScore = matchWord(expectedWords[i], heardTokens[h + 1]);
      if (nextScore >= MATCH_THRESHOLD) {
        h += 1;
        continue;
      }
    }

    break;
  }

  return matches;
}
