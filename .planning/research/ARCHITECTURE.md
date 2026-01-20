# Architecture: PCM to AAC to M4B Encoding Pipeline

**Research Date:** 2026-01-20
**Confidence:** MEDIUM (WebCodecs API verified via W3C spec and MDN; mp4box.js less thoroughly documented for file creation)

## Executive Summary

The PCM to M4B encoding pipeline involves three stages: (1) resampling PCM to 48kHz, (2) encoding to AAC via WebCodecs AudioEncoder, (3) muxing to MP4 container via mp4box.js. The current implementation has a critical architectural flaw in how it handles the async encoding loop with `requestIdleCallback`, which can cause chunks to be lost when `flush()` is called while encoding is still in progress.

**Root Cause of Silent Second Half Bug:** The `isFlushing` flag pattern combined with `requestIdleCallback` creates a race condition where:

1. The encoding loop sets `isFlushing = true` and calls `encoder.flush()`
2. The flush promise resolves before all output callbacks have fired
3. Remaining PCM data never gets encoded because `isFlushing` blocks `processNextChunk`

---

## 1. WebCodecs AudioEncoder Lifecycle

### Correct Sequence

```
configure() -> encode() -> encode() -> ... -> flush() -> [wait for promise] -> close()
```

**Critical Ordering Guarantees (from W3C spec):**

| Method              | Behavior                                                       | When to Call                   |
| ------------------- | -------------------------------------------------------------- | ------------------------------ |
| `configure(config)` | Appends config message to queue, returns immediately           | Once, before any encode()      |
| `encode(audioData)` | Appends encode message to queue, returns immediately           | For each AudioData chunk       |
| `flush()`           | Returns Promise that resolves after ALL pending work completes | Once, after ALL encode() calls |
| `close()`           | Synchronously aborts pending work, releases resources          | After flush() promise resolves |

### Key Guarantee from W3C Specification

> "The underlying codec implementation MUST emit all outputs in response to a flush."

This means **all output callbacks are guaranteed to fire BEFORE the flush() promise resolves**.

### Correct Pattern

```typescript
// 1. Create encoder with callbacks
const chunks: EncodedChunk[] = []
const encoder = new AudioEncoder({
  output: (chunk, metadata) => {
    // This will be called for ALL encoded chunks
    // BEFORE flush() promise resolves
    chunks.push(extractChunkData(chunk, metadata))
  },
  error: (e) => reject(e),
})

// 2. Configure
encoder.configure(config)

// 3. Encode ALL data SYNCHRONOUSLY (or with proper awaiting)
for (const audioData of allAudioDataChunks) {
  encoder.encode(audioData)
  audioData.close()
}

// 4. Flush and wait - ALL output callbacks will fire before this resolves
await encoder.flush()

// 5. Now chunks[] is complete and safe to use
encoder.close()

// 6. Proceed with muxing
muxToMp4(chunks)
```

### Anti-Pattern (Current Code Problem)

```typescript
// WRONG: Using requestIdleCallback creates unpredictable timing
const processNextChunk = () => {
  if (isFlushing) return // <-- This blocks remaining work!

  if (offset >= samples.length) {
    isFlushing = true
    encoder.flush().then(resolve) // <-- flush() called, but encode loop stopped
    return
  }

  encoder.encode(audioData)
  requestIdleCallback(processNextChunk) // <-- May not run before flush resolves
}
```

**Why This Fails:**

1. `requestIdleCallback` defers work to browser's idle time
2. When all data is "queued" conceptually, `flush()` is called
3. But `requestIdleCallback` callbacks may still be pending
4. Browser idle scheduler may not run them before flush resolves
5. Those encode() calls never happen, audio is truncated

---

## 2. AudioData Format Requirements

### Creating AudioData for AAC Encoding

```typescript
const audioData = new AudioData({
  format: 'f32-planar', // Float32, planar format
  sampleRate: 48000, // AAC requires 44100 or 48000 Hz
  numberOfFrames: frameCount, // Number of samples per channel
  numberOfChannels: 1, // Mono
  timestamp: timestampMicros, // Microseconds (not milliseconds!)
  data: float32ArrayBuffer, // ArrayBuffer of Float32Array
})
```

### Timestamp Calculation

```typescript
// Timestamps are in MICROSECONDS
const sampleTimestamp = processedSamples / sampleRate // seconds
const timestampMicros = sampleTimestamp * 1_000_000 // microseconds
```

### Planar vs Interleaved Format

For mono audio (1 channel), there's no difference. For stereo:

- **Interleaved:** L R L R L R ...
- **Planar:** L L L ... R R R ...

The current code claims to use `f32-planar` but doesn't properly convert interleaved to planar for stereo. This works for mono but would fail for stereo.

---

## 3. mp4box.js Muxing Pattern

### File Creation

```typescript
import { createFile, DataStream } from 'mp4box'

// keepMdatData=true is CRITICAL - without it, sample data is discarded
const file = createFile(true)
```

### Track Configuration for AAC Audio

```typescript
const trackOptions = {
  timescale: sampleRate, // Use sample rate as timescale (e.g., 48000)
  duration: totalDurationInTimescaleUnits,
  media_duration: totalDurationInTimescaleUnits,
  type: 'mp4a', // SampleEntryFourCC for AAC
  hdlr: 'soun', // Handler type for audio
  samplerate: sampleRate,
  channel_count: channels,
  samplesize: 16,
  // Optional: Add esds box if available from encoder metadata
  // description: esdsBox,
}

const trackId = file.addTrack(trackOptions)
```

### Adding Samples

```typescript
for (const chunk of encodedChunks) {
  // Convert microseconds to timescale units
  const dtsInTimescale = Math.floor(chunk.timestamp / (1_000_000 / timescale))
  const durationInTimescale = Math.floor(chunk.duration / (1_000_000 / timescale))

  // Create a proper ArrayBuffer copy (mp4box may require this)
  const buffer = new ArrayBuffer(chunk.data.length)
  new Uint8Array(buffer).set(chunk.data)

  file.addSample(trackId, buffer, {
    duration: durationInTimescale,
    dts: dtsInTimescale,
    cts: dtsInTimescale, // For audio, CTS = DTS (no B-frames)
    is_sync: true, // All AAC frames are sync frames
  })
}
```

### Extracting Output

**Method 1: Using save() (if running in environment with file access)**

```typescript
file.save('output.m4b')
```

**Method 2: Using getBuffer() and write() (browser)**

```typescript
file.flush()
const dataStream: DataStream = file.getBuffer()
file.write(dataStream)

// Extract ArrayBuffer from DataStream
const outputBuffer = dataStream.buffer.slice(0, dataStream.getPosition())
const blob = new Blob([outputBuffer], { type: 'audio/mp4' })
```

---

## 4. Timing Coordination

### The Critical Problem

WebCodecs and mp4box.js both use asynchronous patterns, but they must be coordinated correctly:

```
PCM Audio
    |
    v
[ENCODE PHASE] - Must complete ALL encoding before muxing
    |
    +---> AudioData 1 --> encode() --> output callback --> chunk 1
    +---> AudioData 2 --> encode() --> output callback --> chunk 2
    +---> AudioData N --> encode() --> output callback --> chunk N
    |
    v
flush() --> [WAIT for promise] --> All chunks collected
    |
    v
[MUX PHASE] - All chunks are now available
    |
    +---> addSample(chunk 1)
    +---> addSample(chunk 2)
    +---> addSample(chunk N)
    |
    v
flush() --> write() --> getBuffer() --> Blob
```

### Recommended Implementation Pattern

```typescript
async function encodePcmToAac(audio: PcmAudio): Promise<EncodedChunk[]> {
  return new Promise((resolve, reject) => {
    const chunks: EncodedChunk[] = []

    const encoder = new AudioEncoder({
      output: (chunk, metadata) => {
        chunks.push({
          timestamp: chunk.timestamp,
          duration: chunk.duration,
          data: copyChunkData(chunk),
          isKeyframe: chunk.type === 'key',
        })
      },
      error: (e) => reject(e),
    })

    encoder.configure(config)

    // Encode ALL data synchronously in a loop
    // Do NOT use requestIdleCallback or setTimeout
    const chunkSize = sampleRate // 1 second chunks
    let offset = 0
    let timestamp = 0

    while (offset < audio.samples.length) {
      const end = Math.min(offset + chunkSize, audio.samples.length)
      const frameCount = (end - offset) / audio.channels

      const audioData = new AudioData({
        format: 'f32-planar',
        sampleRate: audio.sampleRate,
        numberOfFrames: frameCount,
        numberOfChannels: audio.channels,
        timestamp: timestamp * 1_000_000,
        data: audio.samples.slice(offset, end).buffer,
      })

      encoder.encode(audioData)
      audioData.close()

      offset = end
      timestamp += frameCount / audio.sampleRate
    }

    // Now flush - this GUARANTEES all output callbacks fire first
    encoder
      .flush()
      .then(() => {
        encoder.close()
        resolve(chunks)
      })
      .catch(reject)
  })
}
```

---

## 5. Backpressure Handling (Optional Optimization)

For very large audio files, you may want to manage encoder queue depth:

```typescript
const encoder = new AudioEncoder({ output, error })

encoder.addEventListener('dequeue', () => {
  // Encoder processed something, may have room for more
  if (pendingChunks.length > 0 && encoder.encodeQueueSize < 5) {
    const chunk = pendingChunks.shift()
    encoder.encode(chunk)
  }
})

// Check queue size before encoding
if (encoder.encodeQueueSize >= 5) {
  // Too many in flight, wait for dequeue event
  pendingChunks.push(audioData)
} else {
  encoder.encode(audioData)
}
```

However, for audio encoding (unlike video), the queue rarely gets overloaded since audio frames are much smaller than video frames.

---

## 6. Common Pitfalls and Solutions

### Pitfall 1: Async Loop with requestIdleCallback

**Problem:** Using `requestIdleCallback` or `setTimeout` to pace encoding breaks the guarantee that all data is encoded before flush.

**Solution:** Use a synchronous loop or proper async/await pattern:

```typescript
// CORRECT: Synchronous encoding
for (let i = 0; i < chunks.length; i++) {
  encoder.encode(chunks[i])
}
await encoder.flush()

// CORRECT: Async with proper pacing (if needed)
for (let i = 0; i < chunks.length; i++) {
  encoder.encode(chunks[i])
  if (i % 100 === 0) {
    await new Promise((r) => setTimeout(r, 0)) // Yield to event loop
  }
}
await encoder.flush()
```

### Pitfall 2: Calling flush() Multiple Times

**Problem:** Calling flush() multiple times or before all data is queued.

**Solution:** Call flush() exactly once, after ALL encode() calls.

### Pitfall 3: Closing Before Flush Completes

**Problem:** Calling close() before flush() promise resolves.

**Solution:** Always await flush() before calling close().

```typescript
await encoder.flush() // Wait for this!
encoder.close() // Now safe to close
```

### Pitfall 4: mp4box createFile Without keepMdatData

**Problem:** `createFile()` without `true` argument discards media data.

**Solution:** Always use `createFile(true)` when writing new files.

### Pitfall 5: Timestamp/Duration Unit Confusion

**Problem:** Mixing microseconds, milliseconds, and timescale units.

**Solution:** Be explicit about units:

```typescript
// WebCodecs uses MICROSECONDS
const audioDataTimestamp = seconds * 1_000_000

// mp4box uses TIMESCALE UNITS (relative to track timescale)
const sampleDts = microseconds / (1_000_000 / timescale)
```

### Pitfall 6: Not Copying Chunk Data

**Problem:** WebCodecs may reuse buffers, so chunk data must be copied immediately.

**Solution:** Always copy in the output callback:

```typescript
output: (chunk) => {
  const data = new Uint8Array(chunk.byteLength)
  chunk.copyTo(data)
  chunks.push({ ...extractedData, data })
}
```

---

## 7. Diagnostic Checklist for Silent Audio Bug

When debugging silent/truncated audio:

- [ ] Are ALL PCM samples being converted to AudioData and encoded?
- [ ] Is flush() called exactly once, AFTER all encode() calls?
- [ ] Is the code waiting for flush() to resolve before proceeding to muxing?
- [ ] Are all encoded chunks being collected before muxing starts?
- [ ] Is each chunk's data being copied (not just referenced)?
- [ ] Are timestamps properly incremented for each AudioData?
- [ ] Is the total duration calculation correct?
- [ ] Is mp4box receiving all chunks via addSample()?

---

## 8. Recommended Fix for Current Code

The current implementation in `m4bEncoder.ts` should be refactored to:

1. **Remove `requestIdleCallback`** - Use a synchronous loop or `while` loop
2. **Remove `isFlushing` flag** - Not needed with proper flow control
3. **Ensure all encode() calls complete before flush()** - Use counter or complete array
4. **Separate encoding from muxing phases** - Don't interleave

Pseudo-code for the fix:

```typescript
async function encodePcmToAac(audio: PcmAudio): Promise<EncodedChunk[]> {
  const chunks: EncodedChunk[] = []

  // ... encoder setup ...

  // Encode ALL data in a simple loop
  let offset = 0
  let timestamp = 0
  while (offset < audio.samples.length) {
    const audioData = createAudioData(audio, offset, timestamp)
    encoder.encode(audioData)
    audioData.close()
    offset += chunkSize
    timestamp += chunkDuration
  }

  // Wait for ALL outputs
  await encoder.flush()
  encoder.close()

  return chunks // Now complete
}
```

---

## Sources

- [W3C WebCodecs Specification](https://www.w3.org/TR/webcodecs/) - Authoritative spec for AudioEncoder behavior
- [MDN AudioEncoder](https://developer.mozilla.org/en-US/docs/Web/API/AudioEncoder) - API reference
- [MDN AudioEncoder: flush() method](https://developer.mozilla.org/en-US/docs/Web/API/AudioEncoder/flush) - Flush behavior
- [mp4box.js GitHub](https://github.com/gpac/mp4box.js) - Library source and issues
- [mp4box.js Issue #243](https://github.com/gpac/mp4box.js/issues/243) - WebCodecs integration discussion
- [mp4box.js Issue #375](https://github.com/gpac/mp4box.js/issues/375) - File saving pattern
- [WebCodecs Issue #624](https://github.com/w3c/webcodecs/issues/624) - Sample count discrepancies
- [WebCodecs Issue #259](https://github.com/w3c/webcodecs/issues/259) - AAC encoding in WebCodecs
- [Chrome Developers: WebCodecs](https://developer.chrome.com/docs/web-platform/best-practices/webcodecs) - Best practices
