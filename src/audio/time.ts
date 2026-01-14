/**
 * Audio time conversion helpers.
 *
 * WebCodecs and mp4box use different time domains:
 * - WebCodecs timestamps/durations are expressed in microseconds.
 * - MP4 tracks use an integer "timescale" (ticks per second), commonly set to the sample rate.
 */

export function framesToTimestampUs(frameIndex: number, sampleRate: number): number {
  if (!Number.isFinite(frameIndex) || frameIndex < 0) {
    throw new Error(`framesToTimestampUs: invalid frameIndex=${frameIndex}`)
  }
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error(`framesToTimestampUs: invalid sampleRate=${sampleRate}`)
  }

  return Math.round((frameIndex * 1_000_000) / sampleRate)
}

export function microsecondsToTimescaleUnits(microseconds: number, timescale: number): number {
  if (!Number.isFinite(microseconds) || microseconds < 0) {
    throw new Error(`microsecondsToTimescaleUnits: invalid microseconds=${microseconds}`)
  }
  if (!Number.isFinite(timescale) || timescale <= 0) {
    throw new Error(`microsecondsToTimescaleUnits: invalid timescale=${timescale}`)
  }

  // Convert using rounding to avoid systematic drift (e.g., AAC 1024-sample frames at 48kHz).
  const units = Math.round((microseconds * timescale) / 1_000_000)

  // mp4box expects strictly positive sample durations.
  return Math.max(1, units)
}

