import { describe, expect, it } from 'vitest'
import { framesToTimestampUs, microsecondsToTimescaleUnits } from './time'

describe('audio time helpers', () => {
  it('converts frame indices to microsecond timestamps', () => {
    expect(framesToTimestampUs(0, 48_000)).toBe(0)
    expect(framesToTimestampUs(48_000, 48_000)).toBe(1_000_000)
    expect(framesToTimestampUs(24_000, 48_000)).toBe(500_000)
  })

  it('converts microseconds to timescale units without drift', () => {
    // AAC-LC commonly uses 1024 sample frames.
    // At 48kHz, that is 1024/48000 seconds -> 21333.333... microseconds.
    const durationUs = (1024 * 1_000_000) / 48_000
    expect(microsecondsToTimescaleUnits(durationUs, 48_000)).toBe(1024)
  })
})

