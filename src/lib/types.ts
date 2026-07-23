export type RaceStatus =
  | "idle"
  | "listening"
  | "racing"
  | "stopped"
  | "complete";

export type Passage = {
  id: string;
  title: string;
  level: "easy" | "medium" | "hard";
  targetWpm: number;
  text: string;
};

export type WordState = "pending" | "current" | "correct" | "error" | "skipped";

export type WordResult = {
  expected: string;
  spoken?: string;
  state: WordState;
};

export type MetricScores = {
  pronunciation: number;
  accuracy: number;
  pace: number;
  fluency: number;
  expression: number;
  overall: number;
};

export type SessionStats = {
  totalWords: number;
  correctWords: number;
  skippedWords: number;
  mispronouncedWords: number;
  stops: number;
  userWpm: number;
  targetWpm: number;
  durationMs: number;
  scores: MetricScores;
  coachLines: string[];
};

export type LiveRaceState = {
  status: RaceStatus;
  words: WordResult[];
  currentIndex: number;
  progress: number;
  stops: number;
  coachMessage: string | null;
  scores: MetricScores;
  userWpm: number;
  startedAt: number | null;
  transcript: string;
};
