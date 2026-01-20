# Feature Research: M4B Chapter Markers

**Domain:** M4B audiobook chapter metadata
**Researched:** 2026-01-20
**Overall Confidence:** HIGH (verified with official Apple documentation and multiple authoritative sources)

## Executive Summary

M4B files support two chapter formats: **QuickTime text track chapters** (Apple-native, required for iTunes/Apple Books) and **Nero chapters** (simpler metadata-only, ignored by Apple ecosystem). For maximum compatibility with audiobook players, QuickTime text track chapters are required.

The current mp4box.js library does **not** provide a high-level API for writing chapter metadata. Implementation requires either:

1. Manual MP4 box construction within mp4box.js (complex)
2. Post-processing with ffmpeg.wasm (already in project dependencies)
3. Direct binary manipulation of the Nero chpl box (simpler but Apple-incompatible)

**Recommendation:** Use ffmpeg.wasm for chapter injection. The project already has `@ffmpeg/ffmpeg` as a dependency, and FFmpeg has robust support for writing QuickTime-compatible chapters via FFmetadata files.

---

## Technical Specification: MP4 Chapter Formats

### Format 1: QuickTime Text Track Chapters (Apple Standard)

**Compatibility:** iTunes, Apple Books, Apple Music, macOS/iOS native players, most professional audiobook players
**Confidence:** HIGH (verified via [Apple Technical Note TN2174](https://developer.apple.com/library/archive/technotes/tn2174/_index.html))

#### Box Structure

```
moov/
  trak/           (audio track)
    tkhd          (track header, flags include enabled)
    tref/
      chap        (track reference pointing to chapter track ID)
    mdia/
      ...
  trak/           (chapter track - text track)
    tkhd          (track header, track_enabled flag = 0)
    mdia/
      hdlr        (handler type = "text")
      minf/
        nmhd      (null media header - NOT gmhd like regular text)
        stbl/
          stsd    (TextSampleEntry)
          stts    (sample timing)
          stsc    (sample-to-chunk)
          stco    (chunk offsets)
          stsz    (sample sizes)
```

#### Key Requirements

1. **Handler Type:** Must be `text` in the `hdlr` box
2. **Media Header:** Uses `nmhd` (Null Media Header), NOT `gmhd`
3. **Track Disabled:** The `track_enabled` flag in `tkhd` must be 0
4. **Track Reference:** Audio track must have `tref/chap` pointing to chapter track ID
5. **Sample Format:** Each sample is `[uint16: byte_count][UTF-8 or UTF-16 text]`
   - UTF-16 must include BOM at start
   - The uint16 is the byte count of the text, not character count

#### Sample Data Structure

```
+-------------------+---------------------------+
| 2 bytes           | N bytes                   |
| (big-endian)      | (UTF-8 or UTF-16)         |
+-------------------+---------------------------+
| text_byte_count   | chapter_title_text        |
+-------------------+---------------------------+
```

### Format 2: Nero Chapters (Metadata-only)

**Compatibility:** VLC, ffmpeg, some Android players
**Not Compatible:** iTunes, Apple Books, iOS audiobook players
**Confidence:** MEDIUM (reverse-engineered, no official spec - [source](https://github.com/Zeugma440/atldotnet/wiki/Focus-on-Chapter-metadata))

#### Box Location

```
moov/udta/chpl
```

#### Binary Structure

| Offset | Type    | Field         | Notes                   |
| ------ | ------- | ------------- | ----------------------- |
| 0      | uint32  | size          | Standard MP4 box header |
| 4      | char[4] | type          | "chpl"                  |
| 8      | uint8   | version       | Usually 0               |
| 9      | uint24  | flags         | Usually 0               |
| 12     | uint8   | reserved      | Unknown purpose         |
| 13     | uint32  | chapter_count | Number of chapters      |

**Per-chapter data (repeated chapter_count times):**

| Type   | Field        | Notes                                             |
| ------ | ------------ | ------------------------------------------------- |
| int64  | start_time   | In 100-nanosecond units (divide by 10,000 for ms) |
| uint8  | title_length | Byte length of following string                   |
| string | title        | UTF-8 encoded chapter title                       |

#### Limitations

- Apple devices completely ignore Nero chapters
- VLC reportedly has issues with >255 chapters
- No official specification exists

---

## mp4box.js Capabilities Assessment

**Confidence:** HIGH (verified via source code inspection and [official README](https://github.com/gpac/mp4box.js))

### What mp4box.js CAN Do

| Capability            | API                                 | Status    |
| --------------------- | ----------------------------------- | --------- |
| Create MP4 files      | `createFile()`                      | Supported |
| Add audio tracks      | `addTrack({type: 'mp4a', ...})`     | Supported |
| Add audio samples     | `addSample(trackId, data, options)` | Supported |
| Parse existing files  | `appendBuffer()`, `onReady()`       | Supported |
| Read chapter metadata | Via parsed box structure            | Supported |
| Add generic boxes     | `addBox()` on container boxes       | Supported |

### What mp4box.js CANNOT Do (Out of Box)

| Capability             | Status        | Notes                            |
| ---------------------- | ------------- | -------------------------------- |
| Add chapter track      | NOT SUPPORTED | No `addChapter()` API            |
| Write `tref` boxes     | NOT SUPPORTED | No API for track references      |
| Write `chpl` boxes     | NOT SUPPORTED | No Nero chapter support          |
| High-level chapter API | NOT SUPPORTED | Manual box construction required |

### Manual Implementation Path (mp4box.js)

To add QuickTime chapters manually with mp4box.js would require:

1. Create a second track with `type: 'tx3g'` or similar text sample entry
2. Manually construct and add a `trefBox` with `chap` reference
3. Set `tkhd.flags` to disable the chapter track
4. Add text samples with proper timing

**Complexity:** HIGH - requires deep understanding of MP4 box structure and mp4box.js internals. The library exposes `trefBox` class but doesn't document how to properly construct track references when creating files.

---

## Alternative Implementation: ffmpeg.wasm

**Confidence:** HIGH (project already uses `@ffmpeg/ffmpeg`, well-documented feature)

### Why FFmpeg

- Already a project dependency (`@ffmpeg/ffmpeg: ^0.12.10`)
- Native support for writing QuickTime-compatible chapters
- Proven reliability for audiobook chapter metadata
- Simple metadata file format

### FFmetadata Chapter Format

```ini
;FFMETADATA1
title=Book Title
artist=Author Name

[CHAPTER]
TIMEBASE=1/1000
START=0
END=120000
title=Chapter 1: Introduction

[CHAPTER]
TIMEBASE=1/1000
START=120001
END=360000
title=Chapter 2: The Beginning
```

#### Fields

| Field    | Description                                   |
| -------- | --------------------------------------------- |
| TIMEBASE | Time unit denominator (1/1000 = milliseconds) |
| START    | Chapter start in TIMEBASE units               |
| END      | Chapter end in TIMEBASE units                 |
| title    | Chapter display name                          |

### Implementation Approach

```typescript
// Pseudocode for chapter injection workflow
async function addChaptersToM4b(
  m4bBlob: Blob,
  chapters: Chapter[],
  totalDurationMs: number
): Promise<Blob> {
  const ffmpeg = new FFmpeg()
  await ffmpeg.load()

  // Write input M4B to ffmpeg filesystem
  await ffmpeg.writeFile('input.m4b', await fetchFile(m4bBlob))

  // Generate FFmetadata content
  const metadata = generateFFmetadata(chapters, totalDurationMs)
  await ffmpeg.writeFile('chapters.txt', metadata)

  // Remux with chapter metadata
  await ffmpeg.exec([
    '-i',
    'input.m4b',
    '-i',
    'chapters.txt',
    '-map_metadata',
    '1',
    '-codec',
    'copy', // No re-encoding
    '-movflags',
    '+faststart',
    'output.m4b',
  ])

  // Read result
  const data = await ffmpeg.readFile('output.m4b')
  return new Blob([data], { type: 'audio/mp4' })
}
```

### Performance Considerations

| Factor           | Impact                          |
| ---------------- | ------------------------------- |
| Re-encoding      | NONE (codec copy mode)          |
| Processing time  | Fast (metadata-only operation)  |
| Memory           | Temporary doubling of file size |
| WASM limitations | 2GB file size limit             |

---

## Audiobook Player Compatibility Matrix

**Confidence:** MEDIUM (based on community reports and player documentation)

| Player                  | Platform      | QuickTime Chapters | Nero Chapters | Notes                          |
| ----------------------- | ------------- | ------------------ | ------------- | ------------------------------ |
| Apple Books             | iOS/macOS     | YES                | NO            | Primary target                 |
| iTunes                  | Windows/macOS | YES                | NO            | Legacy but still used          |
| VLC                     | All           | YES                | Partial       | Issues with >255 Nero chapters |
| Smart Audiobook Player  | Android       | YES                | YES           | Popular Android player         |
| Audible                 | All           | YES                | NO            | Commercial standard            |
| Prologue                | iOS           | YES                | Unknown       | Popular third-party            |
| BookPlayer              | iOS           | YES                | Unknown       | Open source iOS player         |
| Listen Audiobook Player | Android       | YES                | YES           | Supports both formats          |
| Windows Media Player    | Windows       | NO                 | NO            | No chapter support             |

### Key Takeaways

1. **QuickTime chapters are the safe choice** - supported everywhere chapters are supported
2. **Nero chapters are a fallback** - simpler to write but limited compatibility
3. **Some players support both** - but there's no advantage to writing both formats

---

## Recommended Implementation Strategy

### Phase 1: FFmpeg.wasm Post-Processing (Recommended)

**Complexity:** LOW
**Compatibility:** Maximum
**Changes to existing code:** Minimal

1. Keep existing mp4box.js M4B creation (audio muxing works fine)
2. Add ffmpeg.wasm post-processing step to inject chapters
3. Chapter timing already available from existing `parseChapters()` + audio duration

**Workflow:**

```
PCM Audio
    |
    v
mp4box.js (AAC encoding + MP4 muxing)
    |
    v
M4B without chapters
    |
    v
ffmpeg.wasm (chapter injection via FFmetadata)
    |
    v
M4B with chapters
```

### Phase 2: Pure mp4box.js (Alternative)

**Complexity:** HIGH
**Compatibility:** Maximum (if done correctly)
**Changes to existing code:** Significant

Would require:

- Deep understanding of mp4box.js box creation internals
- Manual construction of text track with proper sample table
- Proper `tref/chap` linkage
- Extensive testing across players

**Not recommended** unless ffmpeg.wasm proves unworkable for some reason.

### Phase 3: Nero Chapters Only (Fallback)

**Complexity:** MEDIUM
**Compatibility:** LIMITED (no Apple devices)
**Changes to existing code:** Moderate

Could be done by:

- Manually constructing `moov/udta/chpl` box binary
- Injecting into existing M4B output

**Only use if:** ffmpeg.wasm is not viable AND Apple compatibility is not required.

---

## Implementation Details for FFmpeg Approach

### Chapter Timing Calculation

The app already has:

- `parseChapters()` - extracts chapters with `startIndex` and `endIndex` (text positions)
- Total audio duration from PCM output
- Chapter boundaries need conversion from text position to audio time

**Timing formula:**

```typescript
function calculateChapterTiming(
  chapters: Chapter[],
  totalTextLength: number,
  totalDurationMs: number
): ChapterTiming[] {
  return chapters.map((chapter, index) => {
    const startRatio = chapter.startIndex / totalTextLength
    const endRatio = chapter.endIndex / totalTextLength

    return {
      title: chapter.title,
      startMs: Math.floor(startRatio * totalDurationMs),
      endMs: Math.floor(endRatio * totalDurationMs),
    }
  })
}
```

**Note:** This assumes linear text-to-audio mapping. Accuracy depends on consistent speech rate. For improved accuracy in future iterations, actual sample boundaries from TTS could be tracked.

### FFmetadata Generation

```typescript
function generateFFmetadata(
  chapters: ChapterTiming[],
  bookTitle?: string,
  author?: string
): string {
  let metadata = ';FFMETADATA1\n'

  if (bookTitle) metadata += `title=${escapeFFmetadata(bookTitle)}\n`
  if (author) metadata += `artist=${escapeFFmetadata(author)}\n`
  metadata += '\n'

  for (const chapter of chapters) {
    metadata += '[CHAPTER]\n'
    metadata += 'TIMEBASE=1/1000\n'
    metadata += `START=${chapter.startMs}\n`
    metadata += `END=${chapter.endMs}\n`
    metadata += `title=${escapeFFmetadata(chapter.title)}\n`
    metadata += '\n'
  }

  return metadata
}

function escapeFFmetadata(str: string): string {
  // FFmetadata requires escaping =, ;, #, \, and newlines
  return str
    .replace(/\\/g, '\\\\')
    .replace(/=/g, '\\=')
    .replace(/;/g, '\\;')
    .replace(/#/g, '\\#')
    .replace(/\n/g, '\\\n')
}
```

---

## Open Questions / Future Research

1. **Actual chapter timing accuracy:** Current approach uses linear text-to-audio mapping. Could be improved by:
   - Tracking actual TTS output timing per chunk
   - Post-processing silence detection to refine boundaries

2. **Large file handling:** ffmpeg.wasm has 2GB limit. For very long audiobooks:
   - May need chunked processing
   - Or server-side fallback for large files

3. **Cover art integration:** M4B supports embedded cover images. Could be added via:
   - Additional ffmpeg.wasm metadata options
   - `moov/udta/meta/ilst` atom manipulation

4. **Chapter artwork:** Some players support per-chapter images. Low priority but possible future enhancement.

---

## Sources

### Official Documentation

- [Apple Technical Note TN2174: Metadata in MP4](https://developer.apple.com/library/archive/technotes/tn2174/_index.html) - QuickTime chapter specification
- [mp4box.js GitHub Repository](https://github.com/gpac/mp4box.js) - Library capabilities and API
- [ffmpeg.wasm Documentation](https://ffmpegwasm.netlify.app/) - WebAssembly FFmpeg port

### Community/Technical References

- [ATL.NET Chapter Metadata Wiki](https://github.com/Zeugma440/atldotnet/wiki/Focus-on-Chapter-metadata) - Nero vs QuickTime chapter format comparison
- [Kyle Howells: Add MP4 Chapters with FFmpeg](https://ikyle.me/blog/2020/add-mp4-chapters-ffmpeg) - FFmetadata format details
- [GPAC Forum: Chapters in MP4](https://sourceforge.net/p/gpac/discussion/327349/thread/09c4a91e/) - MP4Box chapter handling

### File Format References

- [ISO/IEC 14496-12](https://www.iso.org/standard/79110.html) - ISO Base Media File Format specification
- [MP4RA Registered Boxes](https://mp4ra.org/registered-types/boxes) - Official MP4 box type registry
