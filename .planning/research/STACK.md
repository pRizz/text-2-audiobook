# Technology Stack: AAC vs MP3 Audio Encoding

**Project:** text-2-audiobook M4B export bug fixes
**Researched:** 2026-01-20
**Overall Confidence:** HIGH

## Executive Summary

**Is AAC supposed to be smaller than MP3 at equivalent quality? YES.**

AAC achieves equivalent perceived quality at roughly 20-30% lower bitrates than MP3. For audiobooks specifically:

- **64 kbps AAC** sounds as good as **128 kbps MP3**
- This means AAC files should be roughly **half the size** of MP3 files at equivalent quality

**The current implementation uses identical bitrates (128 kbps) for both formats.** This is the bug. At 128 kbps, both formats produce nearly identical file sizes, but AAC has higher quality than necessary.

## Bitrate Comparison Matrix

| Quality Level     | MP3 Bitrate | AAC Bitrate | File Size Ratio    |
| ----------------- | ----------- | ----------- | ------------------ |
| Excellent speech  | 192 kbps    | 96-128 kbps | AAC ~50-67% of MP3 |
| Good speech       | 128 kbps    | 64 kbps     | AAC ~50% of MP3    |
| Acceptable speech | 64 kbps     | 32 kbps     | AAC ~50% of MP3    |

### File Size Per Hour of Audio

| Format & Bitrate | Size/Hour | Quality Notes              |
| ---------------- | --------- | -------------------------- |
| MP3 @ 192 kbps   | ~86 MB    | ACX/Audible standard       |
| MP3 @ 128 kbps   | ~58 MB    | Good quality               |
| MP3 @ 64 kbps    | ~29 MB    | Acceptable, some artifacts |
| AAC @ 128 kbps   | ~58 MB    | Overkill for speech        |
| AAC @ 64 kbps    | ~29 MB    | Excellent for speech       |
| AAC @ 32 kbps    | ~14 MB    | Apple audiobooks use this  |

## Current Implementation Analysis

### MP3 Encoder (`mp3Encoder.ts`)

```typescript
const kbps = 128 // Hardcoded 128 kbps
const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps)
```

- Uses lamejs at 128 kbps (explicit)
- This is a reasonable default for MP3 audiobooks

### AAC Encoder (`m4bEncoder.ts`)

```typescript
const config: AudioEncoderConfig = {
  codec: 'mp4a.40.2', // AAC-LC
  sampleRate: processedAudio.sampleRate,
  numberOfChannels: processedAudio.channels,
  bitrate: 128000, // 128 kbps - same as MP3!
}
```

- Uses WebCodecs AudioEncoder at 128 kbps (explicit)
- **This is the problem**: AAC at 128 kbps produces files the same size as MP3 at 128 kbps
- For equivalent quality to MP3 @ 128 kbps, AAC should be 64 kbps

## Recommended Bitrates for Audiobooks

### Industry Standards

| Source               | Format | Bitrate      | Sample Rate |
| -------------------- | ------ | ------------ | ----------- |
| ACX/Audible (upload) | MP3    | 192 kbps CBR | 44.1 kHz    |
| Audible Enhanced     | AAC    | 64 kbps      | 22.05 kHz   |
| Apple Audiobooks     | AAC    | 32 kbps      | 24 kHz      |
| Librivox             | MP3    | 128 kbps     | 44.1 kHz    |

### Recommended for This App

| Format    | Recommended Bitrate | Rationale                                                |
| --------- | ------------------- | -------------------------------------------------------- |
| MP3       | 128 kbps            | Good quality, universal compatibility                    |
| M4B (AAC) | 64 kbps             | Equivalent quality to MP3 @ 128 kbps, half the file size |

## Technical Differences: AAC vs MP3

### Why AAC is More Efficient

1. **Pure MDCT Algorithm**: AAC uses only Modified Discrete Cosine Transform, while MP3 uses a hybrid MDCT/FFT approach. This makes AAC more efficient at compression.

2. **Better Transient Handling**: AAC uses 128-sample blocks vs MP3's 192-sample blocks for transients, providing more accurate encoding of sudden changes.

3. **Superior Low-Bitrate Performance**: Below 128 kbps, AAC significantly outperforms MP3. This is critical for audiobooks where speech-optimized low bitrates are ideal.

4. **Wider Frequency Support**: AAC supports 8-96 kHz sample rates vs MP3's 16-48 kHz, though this matters less for speech.

### Quality Comparison by Bitrate

| Bitrate   | MP3 Quality                   | AAC Quality                   |
| --------- | ----------------------------- | ----------------------------- |
| 32 kbps   | Barely usable                 | Acceptable speech             |
| 64 kbps   | Acceptable                    | Good speech                   |
| 128 kbps  | Good                          | Excellent                     |
| 192 kbps  | Excellent                     | Overkill                      |
| 256+ kbps | Indistinguishable from source | Indistinguishable from source |

## Mono vs Stereo for Audiobooks

**Recommendation: Use mono for audiobooks.**

- Most audiobooks are single-narrator speech
- Stereo doubles file size with no benefit for speech
- Industry standard is mono for audiobooks
- Current implementation uses mono (channels: 1) - this is correct

## The Fix

To make M4B files smaller than MP3 at equivalent quality, change the AAC bitrate from 128000 to 64000:

```typescript
// In m4bEncoder.ts
const config: AudioEncoderConfig = {
  codec: 'mp4a.40.2',
  sampleRate: processedAudio.sampleRate,
  numberOfChannels: processedAudio.channels,
  bitrate: 64000, // Changed from 128000
}
```

### Expected Results After Fix

| Audio Duration | MP3 @ 128 kbps | M4B @ 64 kbps | Savings |
| -------------- | -------------- | ------------- | ------- |
| 1 hour         | ~58 MB         | ~29 MB        | 50%     |
| 10 hours       | ~580 MB        | ~290 MB       | 50%     |

## Alternative Considerations

### Use 96 kbps AAC for Higher Quality Margin

If users report quality concerns with 64 kbps:

- 96 kbps AAC provides a safety margin
- Still ~25% smaller than 128 kbps MP3
- Exceeds commercial audiobook quality

### Make Bitrate User-Configurable

Future enhancement: Let users choose quality/size tradeoff:

- "Smallest" = 32 kbps AAC / 64 kbps MP3
- "Standard" = 64 kbps AAC / 128 kbps MP3 (recommended default)
- "Highest" = 128 kbps AAC / 192 kbps MP3

## Sources

- [MP3 vs AAC Comparison - Diffen](https://www.diffen.com/difference/AAC_vs_MP3)
- [AAC vs MP3 - Movavi](https://www.movavi.com/learning-portal/aac-vs-mp3.html)
- [Audiobook Bitrate Recommendations - Hydrogenaudio](https://hydrogenaudio.org/index.php/topic,32153.0.html)
- [M4B File Format Guide - Bookjack](https://www.bookjack.app/blog/what-is-m4b-file-format/)
- [Audio Bitrate Settings - Triton Digital](https://help.tritondigital.com/docs/audio-bitrate-settings)
- [WebCodecs AudioEncoder API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioEncoder/configure)
- [lamejs GitHub Repository](https://github.com/zhuker/lamejs)
- [Advanced Audio Coding - Wikipedia](https://en.wikipedia.org/wiki/Advanced_Audio_Coding)

## Confidence Assessment

| Claim                                    | Confidence | Basis                                                         |
| ---------------------------------------- | ---------- | ------------------------------------------------------------- |
| AAC is ~30% more efficient than MP3      | HIGH       | Multiple authoritative sources, Wikipedia, industry consensus |
| 64 kbps AAC = 128 kbps MP3 quality       | HIGH       | Industry standard, multiple sources agree                     |
| Commercial audiobooks use 32-64 kbps AAC | HIGH       | Apple/Audible documented practices                            |
| Bitrate directly determines file size    | HIGH       | Mathematical fact (bitrate = bits per second)                 |
| Current bug is identical bitrates        | HIGH       | Verified by reading source code                               |
