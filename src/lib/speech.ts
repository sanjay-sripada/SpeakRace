type SpeechGrammarListLike = {
  addFromString: (grammar: string, weight: number) => void;
  length: number;
};

export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  grammars?: SpeechGrammarListLike;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: { transcript: string; confidence: number };
    };
  };
};

type RecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported(): {
  tts: boolean;
  stt: boolean;
} {
  if (typeof window === "undefined") return { tts: false, stt: false };
  return {
    tts: "speechSynthesis" in window,
    stt: Boolean(getSpeechRecognitionCtor()),
  };
}

/** Map target WPM to speechSynthesis rate (approx). */
export function wpmToRate(wpm: number): number {
  // Default synth ~150–180 wpm at rate 1. Clamp 0.6–1.4
  const base = 160;
  return Math.max(0.6, Math.min(1.4, wpm / base));
}

export function speakText(
  text: string,
  opts: {
    rate?: number;
    onBoundary?: (charIndex: number) => void;
    onEnd?: () => void;
    onStart?: () => void;
  } = {},
): SpeechSynthesisUtterance {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = opts.rate ?? 1;
  utter.lang = "en-US";
  utter.onstart = () => opts.onStart?.();
  utter.onend = () => opts.onEnd?.();
  utter.onboundary = (e) => {
    if (e.name === "word" || e.charIndex >= 0) {
      opts.onBoundary?.(e.charIndex);
    }
  };
  window.speechSynthesis.speak(utter);
  return utter;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function pauseSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.pause();
  }
}

export function resumeSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.resume();
  }
}
