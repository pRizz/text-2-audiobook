# Domain Pitfalls: WebCodecs AudioEncoder + mp4box.js

**Domain:** M4B audiobook encoding using WebCodecs and mp4box.js
**Researched:** 2026-01-20
**Overall confidence:** MEDIUM-HIGH (based on official documentation, GitHub issues, and W3C spec)

---

## Critical Pitfalls

Mistakes that cause silent audio, corrupt files, or major issues.

### Pitfall 1: AudioData Format Mismatch (f32 vs f32-planar)

**Symptoms:**

- Audio plays but sounds garbled or distorted
- Silent audio in output file
- Encoding succeeds but playback produces noise
- Only first portion of audio plays correctly

**Root cause:**
WebCodecs AudioData supports two 32-bit float formats:

- `f32`: Interleaved format - samples organized as `[L, R, L, R, ...]`
- `f32-planar`: Planar format - samples organized as `[L, L, L...][R, R, R...]`

The current implementation declares `format: 'f32-planar'` but may be passing interleaved data, or vice versa. When the format declaration doesn't match the actual data layout, the encoder interprets the samples incorrectly.

**Relevant code in m4bEncoder.ts (lines 274-289):**

```typescript
// Note: AudioData expects planar format for multi-channel
let audioDataBuffer: ArrayBuffer
if (processedAudio.channels === 1) {
  audioDataBuffer = chunkSamples.buffer
} else {
  // Convert interleaved to planar (not needed for mono, but for future stereo support)
  audioDataBuffer = chunkSamples.buffer
}

const audioData = new AudioData({
  format: 'f32-planar',
  // ...
  data: audioDataBuffer,
})
```

The comment says "convert interleaved to planar" but the code doesn't actually convert anything - it just uses the same buffer.

**Fix:**

1. Verify the PcmAudio samples are actually in the format expected by AudioData
2. For mono audio (1 channel), interleaved and planar are identical, so this is fine
3. For stereo, properly convert interleaved to planar before encoding:
   ```typescript
   // Convert interleaved [L,R,L,R,...] to planar [L,L,L,...,R,R,R,...]
   const planar = new Float32Array(chunkSamples.length)
   const framesPerChannel = chunkSamples.length / channels
   for (let frame = 0; frame < framesPerChannel; frame++) {
     for (let ch = 0; ch < channels; ch++) {
       planar[ch * framesPerChannel + frame] = chunkSamples[frame * channels + ch]
     }
   }
   ```

**Confidence:** HIGH - Based on [MDN AudioData format documentation](https://developer.mozilla.org/en-US/docs/Web/API/AudioData/format) and [W3C WebCodecs issues](https://github.com/WebAudio/web-audio-api-v2/issues/133)

---

### Pitfall 2: Missing or Incorrect AAC Decoder Configuration (esds/description)

**Symptoms:**

- MP4 file is created but audio doesn't play in some players
- Player shows audio track but produces silence
- "Codec not supported" errors in some applications
- File plays in browser but not in native apps (Apple Books, VLC)

**Root cause:**
AAC audio in MP4 containers requires an AudioSpecificConfig (part of the esds box) that describes the codec parameters. The WebCodecs AudioEncoder provides this via `metadata.decoderConfig.description` in the output callback. If this isn't properly captured and used when creating the mp4box.js track, the file lacks essential codec information.

Per the [W3C AAC WebCodecs Registration](https://www.w3.org/TR/webcodecs-aac-codec-registration/):

- If `description` is present, the bitstream is assumed to be raw AAC format
- If `description` is absent, the bitstream is assumed to be ADTS format

**Relevant code in m4bEncoder.ts:**

```typescript
let decoderConfig: AudioDecoderConfig | null = null

// In output callback:
if (metadata && metadata.decoderConfig && !decoderConfig) {
  decoderConfig = metadata.decoderConfig
}

// Later, decoderConfig is passed to muxAacToM4b but marked as reserved:
_decoderConfig: AudioDecoderConfig | null, // Reserved for future esds box creation
```

The decoderConfig is captured but never actually used to create the esds box.

**Fix:**

1. Capture `metadata.decoderConfig.description` from the first encoded chunk
2. Use it when configuring the mp4box.js track to set up the proper esds box
3. Example pattern from working video implementations:
   ```typescript
   if (metadata?.decoderConfig?.description) {
     trackOptions.description = metadata.decoderConfig.description
   }
   ```

**Confidence:** HIGH - Based on [GitHub mp4box.js issue #375](https://github.com/gpac/mp4box.js/issues/375) and [W3C WebCodecs issue #832](https://github.com/w3c/webcodecs/issues/832)

---

### Pitfall 3: Timestamp/Duration Calculation Errors Causing Silent Second Half

**Symptoms:**

- First half of audio plays correctly, second half is silent
- Audio duration shows correct length but playback stops early
- Seeking to second half produces silence
- Audio cuts off abruptly at a specific point

**Root cause:**
The timestamp calculation in the current code has a subtle bug. Each encoded chunk's duration is calculated as the difference from the previous timestamp:

```typescript
// Calculate duration from timestamp difference
const duration = chunk.timestamp - lastTimestamp
lastTimestamp = chunk.timestamp
```

But the first chunk gets `duration = chunk.timestamp - 0`, which is just the timestamp itself, not the actual duration. Additionally, when chunks are added to mp4box.js, the duration conversion may lose precision:

```typescript
const durationInTimescale = Math.floor(duration / (1_000_000 / timescale))
```

If timestamps accumulate rounding errors, later samples end up with incorrect DTS values, potentially causing them to overlap or have zero-length durations.

**Additional factor:** The [GitHub mp4box.js issue #46](https://github.com/gpac/mp4box.js/issues/46) documents that CTS values are calculated incorrectly in some cases.

**Fix:**

1. Use `chunk.duration` directly when available instead of calculating from timestamp differences:

   ```typescript
   chunks.push({
     timestamp: chunk.timestamp,
     duration: chunk.duration || calculateFallbackDuration(),
     data,
     isKeyframe: chunk.type === 'key',
   })
   ```

2. Use microsecond timescale (1,000,000) for maximum precision:

   ```typescript
   const timescale = 1_000_000
   ```

3. Verify DTS/CTS values don't have gaps or overlaps before writing to file

**Confidence:** HIGH - Based on [W3C WebCodecs issue #624](https://github.com/w3c/webcodecs/issues/624) and code analysis

---

### Pitfall 4: Premature flush() or Encoding After Flush

**Symptoms:**

- Output file is empty or nearly empty (just a few bytes)
- Only first few seconds of audio encoded
- Encoding appears to complete successfully but output is truncated
- Error: "Cannot call 'encode' on a closed codec"

**Root cause:**
The WebCodecs spec requires that `flush()` emits all pending outputs, but once called, the encoder may reject additional encode operations. The current implementation has a race condition:

```typescript
const processNextChunk = () => {
  if (isFlushing) {
    return
  }

  if (offset >= processedAudio.samples.length) {
    isFlushing = true
    encoder.flush()
    // ...
  }
  // ...
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(processNextChunk, { timeout: 1000 })
  }
}
```

With `requestIdleCallback`, there's a window where:

1. A chunk finishes processing
2. `requestIdleCallback` schedules the next chunk
3. Meanwhile, the offset check determines we're done and calls `flush()`
4. The scheduled callback tries to encode but the encoder is flushing

**Fix:**

1. Ensure no encode operations are pending before calling flush:

   ```typescript
   // Wait for encode queue to drain
   while (encoder.encodeQueueSize > 0) {
     await new Promise((resolve) => setTimeout(resolve, 10))
   }
   await encoder.flush()
   ```

2. Use the `dequeue` event to know when encoder is ready for more:
   ```typescript
   encoder.addEventListener('dequeue', () => {
     if (encoder.encodeQueueSize < MAX_QUEUE_SIZE) {
       processNextChunk()
     }
   })
   ```

**Confidence:** HIGH - Based on [W3C WebCodecs spec](https://www.w3.org/TR/webcodecs/) and [issue #137](https://github.com/w3c/webcodecs/issues/137)

---

### Pitfall 5: mp4box.js Buffer/Stream Position Issues

**Symptoms:**

- Output file is 0 bytes or just header bytes
- `getBuffer()` returns empty or incomplete data
- File appears corrupted when opened in media players
- Missing samples in the middle or end of the file

**Root cause:**
mp4box.js maintains internal stream positions and buffers. Common mistakes:

1. Not calling `flush()` before extracting the file
2. Using `getBuffer()` incorrectly - it returns a DataStream, not an ArrayBuffer directly
3. Not tracking the DataStream position when slicing the buffer

**Relevant code in m4bEncoder.ts (lines 398-406):**

```typescript
const dataStream: DataStream = file.getBuffer()
file.write(dataStream)

// Extract the ArrayBuffer from DataStream
const streamBuffer = dataStream.buffer
const position = dataStream.getPosition()
const arrayBuffer = streamBuffer.slice(0, position)
```

This approach is correct, but if `write()` doesn't complete properly or position is wrong, the output will be truncated.

**Fix:**

1. Always call `file.flush()` before extracting data
2. Verify position is non-zero before slicing
3. Consider using `file.save('filename.mp4')` for simpler file creation (Node.js)
4. Add validation:
   ```typescript
   if (position === 0) {
     throw new Error('No data written to MP4 file')
   }
   ```

**Confidence:** MEDIUM-HIGH - Based on [mp4box.js GitHub issues](https://github.com/gpac/mp4box.js/issues/375) and [issue #142](https://github.com/gpac/mp4box.js/issues/142)

---

## Moderate Pitfalls

Mistakes that cause delays, suboptimal output, or technical debt.

### Pitfall 6: AAC Encoder Duration/Sample Count Mismatch

**Symptoms:**

- Audio has subtle pops or clicks
- Playback completes 1 second early or late
- Slight speed variation in audio
- Accumulated timing drift in long files

**Root cause:**
The AAC encoder may produce different frame durations than expected. Per [W3C WebCodecs issue #624](https://github.com/w3c/webcodecs/issues/624):

- Input: 1024 frames at 48kHz = 21,333 microseconds expected
- AAC output: May produce 4 chunks of ~5,333 microseconds each
- Opus output: May produce 1 chunk of 60,000 microseconds (60ms fixed frame size)

The encoder reframes audio according to codec requirements, not input boundaries.

**Prevention:**

1. Don't assume 1:1 mapping between input and output frames
2. Track total duration from actual encoded chunks, not input
3. Accept that encoded duration may differ slightly from input duration
4. For precise timing, use the encoder's output timestamps, not calculated values

**Confidence:** HIGH - Based on [W3C WebCodecs issue #624](https://github.com/w3c/webcodecs/issues/624)

---

### Pitfall 7: File Size Larger Than Expected (AAC vs MP3)

**Symptoms:**

- M4B file is larger than equivalent MP3
- User expects AAC to be more efficient but gets larger files

**Root cause:**
This is often expected behavior, not a bug:

- At the same bitrate, AAC and MP3 produce nearly identical file sizes
- AAC is more efficient in quality-per-bitrate, not size-per-bitrate
- The current implementation uses 128kbps for AAC, which may match or exceed MP3 size
- MP4 container overhead adds ~1-5% to file size vs raw AAC

**Relevant code in m4bEncoder.ts:**

```typescript
const config: AudioEncoderConfig = {
  codec: 'mp4a.40.2', // AAC-LC
  bitrate: 128000,
  // ...
}
```

**Prevention:**

1. Document expected file sizes for users
2. If smaller files are priority, consider:
   - Lower bitrate (96kbps is acceptable for speech)
   - HE-AAC (`mp4a.40.5`) which is optimized for low bitrates
3. Compare at equivalent quality, not equivalent bitrate

**Confidence:** HIGH - Based on [AAC vs MP3 comparisons](https://www.gumlet.com/learn/aac-vs-mp3/)

---

### Pitfall 8: Memory Pressure from Large Audio Files

**Symptoms:**

- Browser tab crashes during encoding
- Out-of-memory errors
- Encoding slows dramatically over time
- System becomes unresponsive

**Root cause:**
The current implementation loads all PCM samples into memory, encodes them, stores all encoded chunks, then writes to mp4box.js. For a 10-hour audiobook:

- PCM at 48kHz mono float32 = 48000 _ 4 _ 3600 \* 10 = 6.9 GB
- Encoded AAC chunks retained until muxing = ~500 MB additional

Per [W3C WebCodecs memory guidance](https://www.w3.org/TR/webcodecs/):

> Resources including CPU memory, GPU memory... MAY be quickly exhausted and SHOULD be released immediately when no longer in use.

**Prevention:**

1. Process in chunks and write to mp4box.js incrementally
2. Release AudioData objects immediately after encoding with `audioData.close()`
3. Use streaming architecture: encode -> mux -> write, without holding all data
4. Monitor `encodeQueueSize` to apply backpressure

**Confidence:** MEDIUM - Based on [W3C WebCodecs spec](https://www.w3.org/TR/webcodecs/) and [memory patterns discussion](https://www.w3.org/2021/03/media-production-workshop/talks/paul-adenot-webcodecs-performance.html)

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 9: Sample Rate Mismatch

**Symptoms:**

- "Configuration not supported" error
- Audio plays at wrong speed (chipmunk or slow-motion effect)
- Encoding fails immediately after configure()

**Root cause:**
AAC encoder typically only supports 44100 Hz and 48000 Hz sample rates. Input audio at other rates (22050 Hz from some TTS engines) must be resampled.

The current implementation handles this:

```typescript
const targetSampleRate = 48000
if (audio.sampleRate !== targetSampleRate && audio.sampleRate !== 48000) {
  processedAudio = await resampleAudio(audio, targetSampleRate)
}
```

But the condition has a bug: `audio.sampleRate !== 48000` will always be true when `audio.sampleRate !== targetSampleRate` (since targetSampleRate IS 48000).

**Prevention:**

1. Fix the redundant condition
2. Use `AudioEncoder.isConfigSupported()` to verify configuration before encoding
3. Always resample to 48000 Hz for maximum compatibility

**Confidence:** HIGH - Based on code analysis and [WebCodecs AAC registration](https://www.w3.org/TR/webcodecs-aac-codec-registration/)

---

### Pitfall 10: Browser Compatibility Variance

**Symptoms:**

- Works in Chrome but not Firefox/Safari
- Different browsers produce different output quality
- "AudioEncoder is not defined" error

**Root cause:**
WebCodecs AudioEncoder support varies:

- Chrome/Edge: Full AAC support (Windows, Linux, macOS)
- Firefox: Depends on OS media framework; AAC may not be available on all platforms
- Safari: Limited WebCodecs support

**Prevention:**

1. Always check support before attempting encoding:
   ```typescript
   if (typeof AudioEncoder === 'undefined') {
     return false
   }
   const support = await AudioEncoder.isConfigSupported(config)
   if (!support.supported) {
     return false
   }
   ```
2. Provide fallback (e.g., MP3-only export via lamejs)
3. Document browser requirements clearly to users

**Confidence:** HIGH - Based on [MDN AudioEncoder docs](https://developer.mozilla.org/en-US/docs/Web/API/AudioEncoder)

---

## Phase-Specific Warnings

| Phase Topic           | Likely Pitfall  | Mitigation                                                          |
| --------------------- | --------------- | ------------------------------------------------------------------- |
| Debug silent audio    | Pitfall 1, 2, 3 | Verify format matches, check decoderConfig, validate timestamps     |
| Debug file size       | Pitfall 7       | Compare at equivalent quality, document expected sizes              |
| Add chapter support   | Pitfall 5       | mp4box.js chapter API is undocumented; may need custom box creation |
| Optimize performance  | Pitfall 8       | Stream-based architecture, incremental writing                      |
| Cross-browser support | Pitfall 10      | Feature detection, graceful degradation                             |

---

## Debugging Checklist for Silent Audio

When investigating silent audio in the second half:

1. [ ] **Verify format declaration matches actual data layout** (Pitfall 1)
   - Is PcmAudio interleaved or planar?
   - Does AudioData format parameter match?

2. [ ] **Check timestamp continuity** (Pitfall 3)
   - Log all chunk timestamps and durations
   - Verify no gaps or overlaps
   - Check for accumulating rounding errors

3. [ ] **Verify decoderConfig is captured and used** (Pitfall 2)
   - Log metadata from first encoded chunk
   - Confirm description is passed to mp4box track

4. [ ] **Check flush timing** (Pitfall 4)
   - Verify encodeQueueSize is 0 before flush
   - Confirm all chunks are captured in output callback

5. [ ] **Validate mp4box output** (Pitfall 5)
   - Check DataStream position after write()
   - Verify ArrayBuffer length matches expectations
   - Use ffprobe or similar to analyze output file structure

---

## Sources

- [MDN AudioData format](https://developer.mozilla.org/en-US/docs/Web/API/AudioData/format)
- [MDN AudioEncoder](https://developer.mozilla.org/en-US/docs/Web/API/AudioEncoder)
- [W3C WebCodecs Specification](https://www.w3.org/TR/webcodecs/)
- [W3C AAC WebCodecs Registration](https://www.w3.org/TR/webcodecs-aac-codec-registration/)
- [WebCodecs Issue #624: Unexpected AudioEncoder samples](https://github.com/w3c/webcodecs/issues/624)
- [WebCodecs Issue #832: Raw AAC bitstream handling](https://github.com/w3c/webcodecs/issues/832)
- [WebCodecs Issue #137: Codec state errors](https://github.com/w3c/webcodecs/issues/137)
- [mp4box.js Issue #375: WebCodecs MP4 creation](https://github.com/gpac/mp4box.js/issues/375)
- [mp4box.js Issue #243: WebCodecs video file creation](https://github.com/gpac/mp4box.js/issues/243)
- [mp4box.js Issue #46: CTS calculation errors](https://github.com/gpac/mp4box.js/issues/46)
- [W3C Memory patterns presentation](https://www.w3.org/2021/03/media-production-workshop/talks/paul-adenot-webcodecs-performance.html)
