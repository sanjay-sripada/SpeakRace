# SpeakRace

Read aloud with AI. Keep the car moving. Build speaking confidence.

## Quick start

```bash
cd Documents/Work/SpeakRace
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Use Chrome or Edge** and allow the microphone. The MVP uses the browser Web Speech API (TTS + recognition) — no API keys required.

## How it works

1. Pick a built-in passage **or upload your own file** (`.txt`, `.md`, `.pdf`, `.csv`) / paste text
2. Press **Start Race** — AI reads aloud, mic listens
3. Read along — the car advances on matched words
4. Errors / long pauses → car **stops** (red light) + coach tip
5. Say the word correctly → race resumes
6. Finish → Speaking Score + AI coach summary

Uploaded files are truncated to the first **150 words** per race so sessions stay focused.

## Speaking Score weights

| Metric | Weight |
|--------|--------|
| Pronunciation | 35% |
| Reading Accuracy | 30% |
| Pace | 15% |
| Fluency | 10% |
| Expression | 10% |

## Stack

- Next.js (App Router) + Tailwind CSS
- Web Speech Synthesis (AI voice)
- Web Speech Recognition (your voice)
- Client-side word alignment + scoring

## Next (Phase 2)

- Whisper / OpenAI Realtime for better accuracy
- Adaptive AI speed
- Shadow reading mode
- Themes (rocket, train, turtle)
- Progress history + streaks
