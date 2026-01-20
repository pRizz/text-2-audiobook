# Codebase Concerns

**Analysis Date:** 2026-01-20

## Tech Debt

**App.tsx is monolithic (795 lines):**

- Issue: Main component contains all state management, engine initialization, audio generation, encoding, and download logic in a single file
- Files: `src/App.tsx`
- Impact: Difficult to test, hard to reason about, challenging to maintain
- Fix approach: Extract custom hooks (useEngine, useAudioGeneration, useMultiPartProcessing) and move business logic to dedicated service modules

**Piper TTS Engine is a placeholder:**

- Issue: PiperTtsEngine generates synthetic tone-based audio instead of actual neural TTS. Marked as "demo" but still appears in engine list
- Files: `src/tts/fullExportEngine/piperEngine.ts`
- Impact: Misleading to users, clutters engine selection. Generates unusable audio
- Fix approach: Either implement actual Piper WASM integration or remove from engine list until ready

**Legacy single-part vs multi-part code paths:**

- Issue: `handleGenerate` in App.tsx has two completely separate code paths based on text size, with duplicated progress tracking and encoding logic
- Files: `src/App.tsx` (lines 218-424)
- Impact: Bug fixes and feature changes must be applied in two places, high risk of divergence
- Fix approach: Unify into single processing pipeline that treats everything as multi-part (with single part as special case)

**Hardcoded magic numbers throughout:**

- Issue: Text splitting threshold (30000 words), chunk sizes (200-500 chars), pause durations (0.2-0.3s), and timeout values scattered in code
- Files: `src/App.tsx` (line 225), `src/tts/fullExportEngine/kokoroEngine.ts` (line 141), `src/tts/fullExportEngine/headTtsEngine.ts` (line 125)
- Impact: Hard to tune performance, inconsistent behavior across engines
- Fix approach: Extract to `src/lib/constants.ts` with documented rationale

**Rate/pitch controls removed from UI but code remains:**

- Issue: VoiceSelector component accepts rate/pitch props but rate/pitch sliders are removed from render. Backend still processes these values
- Files: `src/ui/components/VoiceSelector.tsx` (props on lines 7-10, not used in render)
- Impact: Unused props, confusing interface. Users cannot adjust rate/pitch
- Fix approach: Either restore UI controls or remove props and set defaults in engine calls

## Known Bugs

**Engine selector locked to hidden state:**

- Symptoms: Users cannot switch TTS engines, forced to use default (Kokoro)
- Files: `src/App.tsx` (line 21: `const showEngineSelector = false`)
- Trigger: Always hidden by hardcoded boolean
- Workaround: None for end users
- Note: Appears intentional (comment says "Temporarily lock to the default engine") but no way to unlock

**M4B chapter metadata not implemented:**

- Symptoms: M4B files are generated but contain no chapter markers even when chapters are detected
- Files: `src/audio/m4bEncoder.ts` (lines 385-390, 429-433)
- Trigger: Any text with chapter markers (lines starting with "# ")
- Workaround: None - users must use external tools to add chapters
- Note: Comment admits "chapter metadata not yet implemented in mp4box.js muxer"

**File import claims PDF/EPUB support but doesn't work:**

- Symptoms: UI says "Supports TXT, PDF, EPUB imports" but only TXT actually works
- Files: `src/ui/components/TextInput.tsx` (line 87 says "Supports TXT, PDF, EPUB imports", but line 30-35 only handles TXT)
- Trigger: Try to import PDF or EPUB file
- Workaround: Convert to TXT externally first

## Security Considerations

**meSpeak loads external scripts from CDN:**

- Risk: Dynamic script injection from jsdelivr CDN could be compromised
- Files: `src/tts/fullExportEngine/meSpeakEngine.ts` (lines 59-74)
- Current mitigation: None - trusts CDN implicitly
- Recommendations: Bundle meSpeak locally or add Subresource Integrity (SRI) hashes

**No input sanitization on text:**

- Risk: Very long text inputs could cause memory exhaustion; malformed unicode could cause parsing issues
- Files: `src/App.tsx`, `src/utils/textSplitter.ts`
- Current mitigation: Text splitting at 30k words helps with memory
- Recommendations: Add maximum input length validation, sanitize control characters

## Performance Bottlenecks

**Kokoro model initialization (~30s first load):**

- Problem: First-time users wait 30+ seconds for 82MB neural model to download and initialize
- Files: `src/tts/fullExportEngine/kokoroEngine.ts` (lines 27-62)
- Cause: Large ONNX model loaded from HuggingFace hub on demand
- Improvement path: Add loading indicator with progress, consider caching in IndexedDB, show model size upfront

**Sequential multi-part processing:**

- Problem: Parts are processed one at a time even though encoding could parallelize
- Files: `src/App.tsx` (lines 254-391, sequential for loop)
- Cause: Designed to minimize memory pressure by processing/encoding/discarding before next part
- Improvement path: Could pipeline: generate part N while encoding part N-1 (requires careful memory management)

**Text chunking regex executed on entire text:**

- Problem: Sentence splitting regex runs on full input, slow for very large texts
- Files: `src/utils/textSplitter.ts` (line 29-38), `src/tts/fullExportEngine/kokoroEngine.ts` (line 135)
- Cause: Regex-based sentence detection without streaming
- Improvement path: Process text in windows rather than all at once

**PCM audio held in memory during encoding:**

- Problem: Full PCM audio (can be hundreds of MB) kept in memory while encoding to MP3/M4B
- Files: `src/App.tsx` (lines 273-355 for multi-part), `src/audio/mp3Encoder.ts`
- Cause: Encoder needs random access to samples
- Improvement path: Stream encoding (chunk at a time) or use workers to offload memory

## Fragile Areas

**HeadTTS event-based synthesis with timeout:**

- Files: `src/tts/fullExportEngine/headTtsEngine.ts` (lines 161-204)
- Why fragile: Promise-based wrapper around event API with 60s timeout and manual cleanup. Race conditions between timeout, onmessage, onerror
- Safe modification: Add comprehensive tests before changing; ensure cleanup happens in all code paths
- Test coverage: None - no tests for TTS engines

**Audio encoder race conditions:**

- Files: `src/audio/m4bEncoder.ts` (lines 249-311)
- Why fragile: Async encoding with `requestIdleCallback` or `setTimeout`, `isFlushing` flag to prevent encoding after flush, but timing issues possible
- Safe modification: Review all async boundaries; add explicit state machine
- Test coverage: None - no tests for encoders

**Engine availability caching:**

- Files: `src/tts/engineFactory.ts` (lines 21-34)
- Why fragile: Module-level cache (`engineAvailability` Map) that never expires. If browser capabilities change (e.g., user disables WebGPU), cached result is stale
- Safe modification: Add cache expiration or re-check on user action
- Test coverage: None

## Scaling Limits

**Browser memory for long audiobooks:**

- Current capacity: ~30,000 words per part before automatic splitting
- Limit: Even split parts can consume several hundred MB of PCM audio each
- Scaling path: Stream audio directly to encoding without full PCM buffer; use Web Workers for encoding

**No persistent state:**

- Current capacity: All state in React component; page refresh loses everything
- Limit: Cannot resume interrupted processing, cannot save drafts
- Scaling path: Add IndexedDB for progress persistence, save generated parts as they complete

## Dependencies at Risk

**kokoro-js (version ^1.2.1):**

- Risk: Young library, may have breaking changes; depends on transformers.js which is also rapidly evolving
- Impact: Primary TTS engine would break
- Migration plan: Pin version more strictly; test before upgrading

**@met4citizen/headtts (version ^1.2.0):**

- Risk: Niche library, unknown maintenance status; uses same Kokoro model internally
- Impact: Alternative engine would break
- Migration plan: Consider consolidating on kokoro-js directly if HeadTTS becomes unmaintained

**mp4box (version ^2.3.0):**

- Risk: API for creating files from scratch is underdocumented; chapter metadata addition is blocked by API limitations
- Impact: M4B encoding works but chapter support cannot be added without workarounds
- Migration plan: Investigate remux.js or direct ISO base media file format implementation

**mespeak (version ^2.0.2):**

- Risk: CDN-loaded, not bundled; uses global window object pollution
- Impact: Breaks if CDN unavailable; conflicts with other libraries
- Migration plan: Bundle locally or replace with espeak-ng WASM

## Missing Critical Features

**No progress persistence:**

- Problem: If browser tab crashes during generation, all progress is lost
- Blocks: Reliable processing of very long texts (book-length)

**No offline support:**

- Problem: Requires internet for model downloads (Kokoro, HeadTTS)
- Blocks: Use in environments without reliable internet

**No error recovery in multi-part:**

- Problem: If one part fails, user cannot retry just that part
- Blocks: Reliable completion of multi-part exports

## Test Coverage Gaps

**TTS engines (0% coverage):**

- What's not tested: All engine implementations - Kokoro, HeadTTS, SAM, meSpeak, Piper
- Files: `src/tts/fullExportEngine/*.ts`, `src/tts/liteSpeechEngine/*.ts`
- Risk: Engine changes could break synthesis silently; browser-specific issues undetected
- Priority: High - core functionality

**Audio encoders (0% coverage):**

- What's not tested: MP3 encoding, M4B encoding, PCM to WAV conversion
- Files: `src/audio/mp3Encoder.ts`, `src/audio/m4bEncoder.ts`, `src/audio/pcm.ts` (pcmToWav function)
- Risk: Encoding bugs produce corrupt audio files
- Priority: High - core functionality

**App.tsx integration (0% coverage):**

- What's not tested: State management, multi-part flow, cancel behavior, download handlers
- Files: `src/App.tsx`
- Risk: State synchronization bugs, memory leaks from uncleared refs
- Priority: Medium - complex state logic

**UI components (0% coverage):**

- What's not tested: ProgressBar, ControlPanel, PartProgressList, OutputInfo
- Files: `src/ui/components/*.tsx`
- Risk: UI state bugs, accessibility issues
- Priority: Low - less critical than core logic

---

_Concerns audit: 2026-01-20_
