import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    available: Boolean(process.env.OPENAI_API_KEY),
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Whisper is not configured. Add OPENAI_API_KEY to .env.local." },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const audio = form.get("audio");
  const prompt = String(form.get("prompt") ?? "").slice(0, 800);

  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "Missing audio chunk." }, { status: 400 });
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Transcription failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
