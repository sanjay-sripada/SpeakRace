import { normalizeWord } from "./scoring";
import type { SpeechRecognitionLike } from "./speech";

type SpeechGrammarListLike = NonNullable<SpeechRecognitionLike["grammars"]>;

type SpeechGrammarListCtor = new () => SpeechGrammarListLike;

function escapeJsgfWord(word: string): string {
  return word.replace(/[|*+(){}[\]\\]/g, "\\$&");
}

/** Bias browser STT toward passage vocabulary (Chrome / Edge). */
export function applyPassageGrammar(
  recognition: SpeechRecognitionLike,
  words: string[],
): boolean {
  if (typeof window === "undefined" || words.length === 0) return false;

  const w = window as Window & {
    SpeechGrammarList?: SpeechGrammarListCtor;
    webkitSpeechGrammarList?: SpeechGrammarListCtor;
  };
  const Ctor = w.SpeechGrammarList ?? w.webkitSpeechGrammarList;
  if (!Ctor) return false;

  const unique = [
    ...new Set(words.map(normalizeWord).filter((word) => word.length > 0)),
  ].slice(0, 200);

  if (unique.length === 0) return false;

  const rule = unique.map(escapeJsgfWord).join(" | ");
  const grammar = `#JSGF V1.0; grammar passage; public <passage> = ${rule} ;`;

  try {
    const list = new Ctor();
    list.addFromString(grammar, 1);
    recognition.grammars = list;
    return true;
  } catch {
    return false;
  }
}
