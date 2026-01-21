# Roadmap: Text 2 Audiobook M4B Bug Fixes

## Overview

This project fixes critical bugs in M4B audiobook export that currently render it unusable (silent audio, no file size benefit), then adds chapter support and cleans up misleading UI elements. The fixes progress from core encoding bugs to feature enhancements to UI polish, with each phase building on the previous. All work is browser-side with no backend changes.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Fix Silent Audio Bug** - Replace requestIdleCallback with synchronous encoding loop (Completed 2026-01-21)
- [ ] **Phase 2: Fix File Size Bug** - Change AAC bitrate from 128kbps to 64kbps
- [ ] **Phase 3: Add Chapter Support** - Implement QuickTime-compatible chapter markers via ffmpeg.wasm
- [ ] **Phase 4: Unlock Engine Selector** - Remove hidden flag from TTS engine selector UI
- [ ] **Phase 5: Fix File Import** - Implement PDF/EPUB parsing or correct misleading UI claims
- [ ] **Phase 6: Add CDN Security** - Add SRI integrity checks for meSpeak CDN scripts

## Phase Details

### Phase 1: Fix Silent Audio Bug

**Goal**: M4B export produces complete audio with no silent sections
**Depends on**: Nothing (first phase)
**Requirements**: M4B-01 (Fix M4B silent second half bug)
**Approach**: Replace `requestIdleCallback` encoding pattern in `m4bEncoder.ts` with a synchronous `while` loop. Remove the `isFlushing` flag pattern that causes race conditions between scheduled encode() callbacks and flush() calls. The WebCodecs spec guarantees flush() only processes data that was actually queued via encode() - data still pending in requestIdleCallback gets lost.
**Risk**: LOW - This is a simplification, not a complication. The fix removes complexity rather than adding it.

**Success Criteria** (what must be TRUE):

1. User can export a 10+ minute text as M4B and hear audio throughout the entire file
2. M4B file duration matches the MP3 export of the same text (within 1 second)
3. No silent sections appear at any point in the exported M4B file

**Plans**: 1/1

Plans:

- [x] 01-01: Replace idle-callback encoding with synchronous loop

---

### Phase 2: Fix File Size Bug

**Goal**: M4B files are approximately 50% smaller than equivalent MP3 files
**Depends on**: Phase 1 (must have working encoding before changing bitrate)
**Requirements**: M4B-02 (Investigate/fix M4B file size vs MP3)
**Approach**: Change AAC bitrate configuration from 128000 to 64000 in `m4bEncoder.ts`. At 64kbps, AAC achieves equivalent quality to 128kbps MP3 due to better codec efficiency. This is a single-line change to the AudioEncoderConfig.
**Risk**: LOW - Trivial constant change with well-understood effects. Audiobook audio (speech) works well at 64kbps AAC.

**Success Criteria** (what must be TRUE):

1. M4B file size is 45-55% of the MP3 file size for the same text
2. Audio quality remains acceptable for spoken word content
3. M4B plays correctly in Apple Books, iTunes, and VLC

**Plans**: TBD

Plans:

- [ ] 02-01: TBD

---

### Phase 3: Add Chapter Support

**Goal**: M4B files include chapter markers that work in Apple Books and iTunes
**Depends on**: Phase 2 (must have working, correctly-sized M4B before adding chapters)
**Requirements**: M4B-03 (Implement M4B chapter markers)
**Approach**: Use ffmpeg.wasm (already a project dependency) for post-processing. Generate FFmetadata file from parsed markdown headings (using existing `parseChapters()` function), then remux the M4B with chapter metadata using ffmpeg command: `-i input.m4b -i chapters.txt -map_metadata 1 -codec copy output.m4b`. This produces QuickTime text track chapters (Apple-compatible format), not Nero chapters which Apple ignores.
**Risk**: MEDIUM - Chapter timing accuracy depends on linear text-to-audio mapping. Variable speech rates from TTS may require refinement. ffmpeg.wasm has 2GB file limit (acceptable for most audiobooks).

**Success Criteria** (what must be TRUE):

1. User can see chapter list in Apple Books when playing exported M4B
2. Tapping a chapter jumps to approximately the correct audio position
3. Chapter names match the markdown headings from the source text
4. Chapter markers persist after file transfer (not just metadata in player)

**Plans**: TBD

Plans:

- [ ] 03-01: TBD

---

### Phase 4: Unlock Engine Selector

**Goal**: Users can choose their preferred TTS engine from the UI
**Depends on**: Nothing (independent of M4B fixes, but sequenced after core bugs)
**Requirements**: UI-01 (Unlock engine selector for users)
**Approach**: Remove the `hidden` flag or CSS that currently hides the engine selector component. The selector already exists and functions - it's just not visible to users. This is a UI visibility change, not a feature implementation.
**Risk**: LOW - Component exists and works. May need minor UX polish if hidden for rough-edges reasons.

**Success Criteria** (what must be TRUE):

1. User can see engine selector dropdown in the main UI
2. User can switch between available engines (Kokoro, HeadTTS, SAM, meSpeak)
3. Selected engine is used for audio generation
4. Engine selection persists during the session

**Plans**: TBD

Plans:

- [ ] 04-01: TBD

---

### Phase 5: Fix File Import

**Goal**: File import either works correctly or UI accurately reflects capabilities
**Depends on**: Nothing (independent, sequenced after higher-priority fixes)
**Requirements**: IMPORT-01 (Fix file import - implement PDF/EPUB or correct UI claim)
**Approach**: Research feasibility of client-side PDF and EPUB parsing. Options:

1. **Implement**: Use pdf.js for PDF text extraction, epub.js for EPUB parsing. Both are mature libraries with browser support.
2. **Correct UI**: Remove or update import button text to reflect actual capabilities (plain text only).
   Decision will be made during planning phase based on complexity vs. user value tradeoff.
   **Risk**: MEDIUM - PDF text extraction can be unreliable for complex layouts. EPUB parsing is more reliable. May need to scope down to "best effort" extraction with user warning.

**Success Criteria** (what must be TRUE):

1. If implementing: User can import a PDF or EPUB file and see extracted text in the editor
2. If implementing: Extraction handles common document layouts (paragraphs, headings, lists)
3. If correcting UI: Import button accurately describes what file types are supported
4. No misleading claims about capabilities

**Plans**: TBD

Plans:

- [ ] 05-01: TBD

---

### Phase 6: Add CDN Security

**Goal**: meSpeak CDN scripts are protected against supply chain attacks
**Depends on**: Nothing (independent, sequenced last as security hardening)
**Requirements**: SEC-01 (Add SRI integrity checks for meSpeak CDN scripts)
**Approach**: Add Subresource Integrity (SRI) hash attributes to meSpeak CDN script tags. Generate SHA-384 hashes of the current CDN script contents and add `integrity` and `crossorigin` attributes. This ensures browsers reject tampered scripts.
**Risk**: LOW - Standard security practice. Only risk is if CDN updates scripts (requires hash update). Consider pinning to specific version or self-hosting as fallback.

**Success Criteria** (what must be TRUE):

1. meSpeak CDN script tags include valid `integrity` attributes
2. meSpeak engine still loads and functions correctly
3. Browser would reject a tampered/modified CDN script

**Plans**: TBD

Plans:

- [ ] 06-01: TBD

---

## Requirement Coverage

| Requirement | Phase   | Description                                              |
| ----------- | ------- | -------------------------------------------------------- |
| M4B-01      | Phase 1 | Fix M4B silent second half bug                           |
| M4B-02      | Phase 2 | Investigate/fix M4B file size vs MP3                     |
| M4B-03      | Phase 3 | Implement M4B chapter markers                            |
| UI-01       | Phase 4 | Unlock engine selector for users                         |
| IMPORT-01   | Phase 5 | Fix file import (implement PDF/EPUB or correct UI claim) |
| SEC-01      | Phase 6 | Add SRI integrity checks for meSpeak CDN scripts         |

**Coverage:** 6/6 active requirements mapped

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase                     | Plans Complete | Status      | Completed  |
| ------------------------- | -------------- | ----------- | ---------- |
| 1. Fix Silent Audio Bug   | 1/1            | Complete    | 2026-01-21 |
| 2. Fix File Size Bug      | 0/TBD          | Not started | -          |
| 3. Add Chapter Support    | 0/TBD          | Not started | -          |
| 4. Unlock Engine Selector | 0/TBD          | Not started | -          |
| 5. Fix File Import        | 0/TBD          | Not started | -          |
| 6. Add CDN Security       | 0/TBD          | Not started | -          |

---

_Created: 2026-01-20_
