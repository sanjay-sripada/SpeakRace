import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const MAX_REQUESTS_PER_WINDOW = 20;
const RATE_WINDOW_MS = 60_000;

const requestLog = new Map<string, number[]>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "local";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_MS;
  const hits = (requestLog.get(ip) ?? []).filter((t) => t > windowStart);
  if (hits.length >= MAX_REQUESTS_PER_WINDOW) return true;
  hits.push(now);
  requestLog.set(ip, hits);
  return false;
}

export async function GET() {
  return NextResponse.json({
    available: Boolean(process.env.OPENAI_API_KEY),
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Transcription unavailable." }, { status: 503 });
  }

  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many transcription requests. Try again shortly." },
      { status: 429 },
    );
  }

  const form = await request.formData();
  const audio = form.get("audio");
  const prompt = String(form.get("prompt") ?? "").slice(0, 800);

  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "Missing audio chunk." }, { status: 400 });
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "Audio chunk too large." },
      { status: 413 },
    );
  }

  try {
    const openai = new OpenAI({ apiKey });
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
      language: "en",
      prompt: prompt || undefined,
      temperature: 0,
    });

    return NextResponse.json({ text: transcription.text ?? "" });
  } catch {
    return NextResponse.json({ error: "Transcription failed." }, { status: 502 });
  }
}
