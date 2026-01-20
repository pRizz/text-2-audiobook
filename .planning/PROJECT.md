# Text 2 Audiobook

## What This Is

A browser-based text-to-audiobook converter that transforms text into audio using multiple TTS engines (Kokoro, HeadTTS, SAM, meSpeak) and exports to MP3 or M4B format. Runs entirely client-side with no backend required.

## Core Value

Users can convert any text into downloadable audiobook files that play correctly and sound good.

## Requirements

### Validated

- ✓ Text input with word/character count — existing
- ✓ Multiple TTS engine support (Kokoro, HeadTTS, SAM, meSpeak) — existing
- ✓ Voice selection per engine — existing
- ✓ Audio preview before export — existing
- ✓ MP3 export with progress tracking — existing
- ✓ M4B export (partial — has bugs) — existing
- ✓ Multi-part processing for large texts — existing
- ✓ Chapter detection from markdown headers — existing
- ✓ Cancel generation mid-process — existing

### Active

- [ ] Fix M4B silent second half bug
- [ ] Investigate/fix M4B file size vs MP3
- [ ] Implement M4B chapter markers
- [ ] Unlock engine selector for users
- [ ] Fix file import (implement PDF/EPUB or correct UI claim)
- [ ] Add SRI integrity checks for meSpeak CDN scripts

### Out of Scope

- Backend/server-side processing — browser-first architecture
- Mobile app — web-first, responsive design sufficient
- User accounts/cloud storage — local-only tool
- Real-time streaming output — batch export model

## Context

**Current state:** App works well for MP3 export. M4B export has critical bugs making it unusable (silent audio, chapter markers not implemented). Some UI elements are misleading (hidden engine selector, false PDF/EPUB import claims).

**Technical environment:**

- React 18 + Vite + TypeScript
- WebCodecs AudioEncoder for AAC (M4B)
- mp4box.js for MP4/M4B container muxing
- lamejs for MP3 encoding

**Known issues from codebase analysis:**

- M4B encoder has async race conditions (isFlushing flag timing)
- App.tsx is monolithic (795 lines) but not blocking this work
- No tests for audio encoders

## Constraints

- **Browser APIs**: M4B requires WebCodecs AudioEncoder (Chrome/Edge only)
- **No backend**: All processing must happen client-side
- **Existing architecture**: Work within current layered structure

## Key Decisions

| Decision                       | Rationale                           | Outcome   |
| ------------------------------ | ----------------------------------- | --------- |
| Fix M4B before adding features | Core export broken, must work first | — Pending |
| Include chapter support        | Natural extension of M4B fix        | — Pending |
| Research AAC vs MP3 efficiency | User expectation may be incorrect   | — Pending |

---

_Last updated: 2026-01-20 after initialization_
