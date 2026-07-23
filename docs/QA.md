# QA run
- Date: 2026-07-24
- Base URL: http://localhost:3456

## forge-qa (smoke)
```
http://localhost:3456
PASS	GET / -> 200 (want 200)
PASS	GET /race -> 200 (want 200)
PASS	GET /api/transcribe -> 200 (want 200)
forge-qa: all checks passed
```

## forge-browse (UI)
- Home `/`: **PASS** — hero, Start First Race, Upload Your File, upload dropzone, 5 passage cards
- Race `/race?passage=fox`: **PASS** — back link, passage title, race track, Start Race button, live score panel
- Upload `/#upload`: **PASS** — file dropzone + paste toggle visible
- Favicon: **PASS** — `/favicon.svg` 200, `/icon` 200
- Console errors (before fix): hydration mismatch on race page (SSR speech support vs client)
- Console errors (after fix): **0 errors**

### Follow-ups
- Added `forge-qa.json` with SpeakRace routes.
- Dev server: `npm run dev -- -p 3456`
- Fixed hydration mismatch in `useRaceEngine` (speech support detected after mount)
