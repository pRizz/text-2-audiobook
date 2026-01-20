# Project Research Summary

**Project:** text-2-audiobook M4B Export Bug Fixes
**Domain:** Browser-based audiobook encoding (WebCodecs + MP4 muxing)
**Researched:** 2026-01-20
**Confidence:** HIGH

## Executive Summary

The M4B export functionality has two distinct bugs with clearly identified root causes. The **silent second half** bug stems from using `requestIdleCallback` in the WebCodecs encoding loop, creating a race condition where `flush()` is called before all PCM data is encoded. The WebCodecs spec guarantees that flush() emits all outputs only for data that was actually queued via encode() - data scheduled via requestIdleCallback but not yet executed gets lost. The **file size** bug is simply that AAC and MP3 are both set to 128 kbps; at identical bitrates, they produce identical file sizes. AAC achieves equivalent quality at half the bitrate, so M4B should use 64 kbps to produce files ~50% smaller than MP3.

The recommended approach is: (1) Replace the requestIdleCallback encoding pattern with a synchronous loop to fix silent audio, (2) Change AAC bitrate from 128000 to 64000 to fix file size, (3) Add chapter support via ffmpeg.wasm post-processing (already a project dependency). These are straightforward fixes with well-documented solutions - no exotic patterns required.

Key risks are minimal. The encoding loop fix is a simplification, not a complication. The bitrate change is a single constant. Chapter support via ffmpeg.wasm is the most complex addition but has proven implementations and the library is already integrated.

## Key Findings

### Recommended Stack

The existing stack is appropriate. No changes needed.

**Core technologies:**

- **WebCodecs AudioEncoder**: AAC encoding - browser-native, hardware-accelerated, no external dependencies
- **mp4box.js**: MP4/M4B muxing - standard library, handles container format correctly
- **ffmpeg.wasm**: Chapter injection - already a dependency, has native QuickTime chapter support

**Critical configuration change:**

- AAC bitrate: Change from 128000 to **64000** for audiobook-appropriate quality with 50% smaller files

### Expected Features

**Must have (bug fixes):**

- Working M4B export with complete audio (no silent sections)
- M4B files smaller than equivalent MP3 files

**Should have (enhancement):**

- Chapter markers from parsed document headings
- Apple Books/iTunes compatibility for chapters

**Defer (v2+):**

- User-configurable bitrate/quality presets
- Cover art embedding
- Per-chapter artwork

### Architecture Approach

The encoding pipeline has three phases: PCM resampling (48kHz), AAC encoding (WebCodecs), and MP4 muxing (mp4box.js). The current flaw is the encoding loop using `requestIdleCallback`, which defers work unpredictably. The fix is to use a simple synchronous while loop - encode all data, then flush, then mux. For chapters, add a fourth phase: ffmpeg.wasm post-processing to inject QuickTime-compatible chapter metadata.

**Major components:**

1. **PCM Resampler** (existing) - Converts TTS output to 48kHz for AAC compatibility
2. **AAC Encoder** (fix needed) - WebCodecs AudioEncoder; replace async loop with sync loop
3. **MP4 Muxer** (existing) - mp4box.js; works correctly, no changes needed
4. **Chapter Injector** (new) - ffmpeg.wasm post-processing; remux with FFmetadata chapters

### Critical Pitfalls

1. **requestIdleCallback race condition** - Replace with synchronous encoding loop. The current pattern allows flush() to be called while scheduled encode() callbacks are still pending.

2. **Identical AAC/MP3 bitrates** - Use 64 kbps for AAC, not 128 kbps. Same bitrate = same file size regardless of codec.

3. **esds/decoderConfig not used** - The code captures `metadata.decoderConfig.description` but never passes it to mp4box.js. May cause playback issues in some players. Low priority but should be fixed.

4. **Timestamp rounding errors** - Use `chunk.duration` directly instead of calculating from timestamp differences. Accumulated rounding errors can cause gaps in long audio files.

5. **Chapter format compatibility** - Use QuickTime text track chapters (via ffmpeg.wasm), not Nero chapters. Apple devices ignore Nero chapters entirely.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Fix Silent Audio Bug

**Rationale:** Most severe bug - renders M4B export unusable. Must be fixed first.
**Delivers:** Working M4B export with complete audio
**Code location:** `m4bEncoder.ts` lines 260-320 (encoding loop)
**Fix:** Replace `requestIdleCallback` with synchronous `while` loop; remove `isFlushing` flag pattern

```typescript
// Current (broken):
const processNextChunk = () => {
  if (isFlushing) return
  // ...
  requestIdleCallback(processNextChunk)
}

// Fixed:
while (offset < samples.length) {
  encoder.encode(audioData)
  offset += chunkSize
}
await encoder.flush()
```

**Avoids:** Pitfall 4 (premature flush), Pitfall 1 (format mismatch - verify during fix)

### Phase 2: Fix File Size Bug

**Rationale:** Simple one-line fix. Do immediately after Phase 1 to validate both bugs fixed.
**Delivers:** M4B files ~50% smaller than MP3 files
**Code location:** `m4bEncoder.ts` line ~48 (bitrate config)
**Fix:** Change `bitrate: 128000` to `bitrate: 64000`

```typescript
const config: AudioEncoderConfig = {
  codec: 'mp4a.40.2',
  bitrate: 64000, // Changed from 128000
  // ...
}
```

**Expected result:** 10-hour audiobook goes from ~580 MB to ~290 MB

### Phase 3: Add Chapter Support

**Rationale:** Feature enhancement after bugs are fixed. Uses existing ffmpeg.wasm dependency.
**Delivers:** M4B files with chapter markers compatible with Apple Books/iTunes
**Implementation:** FFmetadata post-processing via ffmpeg.wasm

**Workflow:**

1. Generate M4B without chapters (existing mp4box.js flow)
2. Create FFmetadata file from parsed chapters
3. Remux with ffmpeg.wasm: `-i input.m4b -i chapters.txt -map_metadata 1 -codec copy output.m4b`

**Uses:** ffmpeg.wasm (already a dependency), chapter timing from `parseChapters()`
**Implements:** QuickTime text track chapters (Apple-compatible format)

### Phase 4: Cleanup and Polish (Optional)

**Rationale:** Deferred improvements discovered during research
**Delivers:** Better player compatibility, future-proofing
**Tasks:**

- Pass `decoderConfig.description` to mp4box.js track options (esds box)
- Use microsecond timescale for maximum timestamp precision
- Add validation for DataStream position before slicing output

### Phase Ordering Rationale

- **Phase 1 first:** Silent audio bug makes M4B unusable. No point fixing file size or adding chapters if audio is broken.
- **Phase 2 second:** One-line fix, validates that encoding changes from Phase 1 work correctly, addresses the second reported bug.
- **Phase 3 third:** Feature addition that depends on working M4B export. Uses separate library (ffmpeg.wasm) so won't interfere with core encoding.
- **Phase 4 optional:** Technical debt cleanup. Not blocking any user-facing issues but improves robustness.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 3 (Chapters):** May need to verify ffmpeg.wasm chapter format compatibility across different audiobook players. Linear text-to-audio timing mapping may need refinement for variable speech rates.

Phases with standard patterns (skip research-phase):

- **Phase 1:** Root cause identified, fix pattern documented in W3C spec
- **Phase 2:** Trivial constant change, no research needed
- **Phase 4:** Standard best practices, well-documented

## Confidence Assessment

| Area         | Confidence  | Notes                                                                                             |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------- |
| Stack        | HIGH        | Existing stack is appropriate, bitrate change is industry-standard                                |
| Features     | HIGH        | Bug root causes verified via code analysis and W3C spec                                           |
| Architecture | MEDIUM-HIGH | Encoding loop fix is clear; chapter injection pattern is documented but untested in this codebase |
| Pitfalls     | HIGH        | All critical pitfalls have documented solutions and official sources                              |

**Overall confidence:** HIGH

### Gaps to Address

- **Chapter timing accuracy:** Current approach uses linear text-to-audio mapping. May need refinement if TTS produces variable speech rates. Validation needed during Phase 3 implementation.
- **Large file handling:** ffmpeg.wasm has 2GB file size limit. Very long audiobooks (30+ hours) may need chunked processing. Low priority - most audiobooks are under this limit.
- **esds box integration:** Research shows decoderConfig should be used but current code ignores it. May explain any player compatibility issues users haven't reported yet.

## Sources

### Primary (HIGH confidence)

- [W3C WebCodecs Specification](https://www.w3.org/TR/webcodecs/) - Flush behavior, encoder lifecycle
- [W3C AAC WebCodecs Registration](https://www.w3.org/TR/webcodecs-aac-codec-registration/) - AAC configuration requirements
- [MDN AudioEncoder](https://developer.mozilla.org/en-US/docs/Web/API/AudioEncoder) - API reference
- [Apple Technical Note TN2174](https://developer.apple.com/library/archive/technotes/tn2174/_index.html) - QuickTime chapter specification

### Secondary (MEDIUM confidence)

- [mp4box.js GitHub Issues #375, #243](https://github.com/gpac/mp4box.js) - WebCodecs integration patterns
- [WebCodecs Issue #624](https://github.com/w3c/webcodecs/issues/624) - Sample count/duration handling
- [Hydrogenaudio Forums](https://hydrogenaudio.org/) - Audiobook bitrate recommendations

### Tertiary (LOW confidence)

- [ATL.NET Chapter Wiki](https://github.com/Zeugma440/atldotnet/wiki/Focus-on-Chapter-metadata) - Nero chapter format (reverse-engineered, no official spec)

---

_Research completed: 2026-01-20_
_Ready for roadmap: yes_
