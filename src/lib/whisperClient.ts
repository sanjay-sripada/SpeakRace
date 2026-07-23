export type WhisperAvailability = {
  available: boolean;
};

export async function fetchWhisperAvailability(): Promise<WhisperAvailability> {
  try {
    const res = await fetch("/api/transcribe");
    if (!res.ok) return { available: false };
    return (await res.json()) as WhisperAvailability;
  } catch {
    return { available: false };
  }
}

type WhisperRefinerOptions = {
  prompt: string;
  onTokens: (tokens: string[]) => void;
  onError?: (message: string) => void;
  intervalMs?: number;
};

/** Periodically send mic audio to Whisper for higher-accuracy transcripts. */
export class WhisperRefiner {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private busy = false;
  private chunks: Blob[] = [];
  private stopped = true;

  constructor(private options: WhisperRefinerOptions) {}

  async start(): Promise<boolean> {
    if (this.stopped === false) return true;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.options.onError?.("Microphone access is required for Whisper mode.");
      return false;
    }

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    this.recorder = new MediaRecorder(this.stream, { mimeType });
    this.chunks = [];
    this.stopped = false;

    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };

    this.recorder.start(1000);

    const intervalMs = this.options.intervalMs ?? 3500;
    this.timer = setInterval(() => {
      void this.flush();
    }, intervalMs);

    return true;
  }

  updatePrompt(prompt: string) {
    this.options.prompt = prompt;
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;

    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.stop();
    }
    this.recorder = null;

    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.chunks = [];
    this.busy = false;
  }

  private async flush() {
    if (this.stopped || this.busy || this.chunks.length === 0) return;

    this.busy = true;
    const blob = new Blob(this.chunks, { type: "audio/webm" });
    this.chunks = [];

    try {
      const form = new FormData();
      form.append("audio", blob, "race.webm");
      form.append("prompt", this.options.prompt);

      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        this.options.onError?.(body?.error ?? "Whisper transcription failed.");
        return;
      }

      const data = (await res.json()) as { text?: string };
      const text = data.text?.trim();
      if (!text) return;

      const tokens = text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}'\s-]/gu, " ")
        .split(/\s+/)
        .map((w) => w.replace(/^-+|-+$/g, ""))
        .filter(Boolean);

      if (tokens.length > 0) this.options.onTokens(tokens);
    } catch {
      this.options.onError?.("Could not reach Whisper transcription service.");
    } finally {
      this.busy = false;
    }
  }
}
