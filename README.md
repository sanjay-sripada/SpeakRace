# SpeakRace

Read aloud with AI. Keep the car moving. Build speaking confidence.

## Quick start

```bash
cd Documents/Work/SpeakRace
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Use Chrome or Edge** and allow the microphone.

## Speech recognition

SpeakRace uses two layers of speech accuracy:

### Always on (no API key)

- **Passage vocabulary hints** — browser STT is biased toward words in your text
- **Phonetic matching** — tolerates accent/pronunciation differences (`beautiful` ≈ `beautifool`)
- **Smarter alignment** — ignores stray STT tokens and matches against the expected script

### Whisper enhanced (optional, recommended)

Add your OpenAI key for much higher transcription accuracy during races:

```bash
cp .env.example .env.local
# edit .env.local and set OPENAI_API_KEY=sk-...
```

Restart the dev server. Races will show **Whisper + smart match** and send short mic chunks to `whisper-1` with your passage as context.

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
- Web Speech Recognition + passage grammar + phonetic alignment
- Optional OpenAI Whisper (`/api/transcribe`)
- Client-side word alignment + scoring

## Next (Phase 2)

- Adaptive AI speed
- Shadow reading mode
- Themes (rocket, train, turtle)
- Progress history + streaks
