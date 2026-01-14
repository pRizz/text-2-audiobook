import { describe, it, expect } from 'vitest'
import { concatenatePcmAudio, getDurationSeconds } from './pcm'
import { formatDuration } from '../utils/format'
import { PcmAudio } from '../tts/engine'

describe('concatenatePcmAudio', () => {
  it('should concatenate multiple audio chunks', () => {
    const chunk1: PcmAudio = {
      samples: new Float32Array([1, 2, 3]),
      sampleRate: 22050,
      channels: 1,
    }
    const chunk2: PcmAudio = {
      samples: new Float32Array([4, 5, 6]),
      sampleRate: 22050,
      channels: 1,
    }

    const result = concatenatePcmAudio([chunk1, chunk2])

    expect(result.samples.length).toBe(6)
    expect(result.samples[0]).toBe(1)
    expect(result.samples[3]).toBe(4)
    expect(result.sampleRate).toBe(22050)
    expect(result.channels).toBe(1)
  })

  it('should handle empty array', () => {
    const result = concatenatePcmAudio([])

    expect(result.samples.length).toBe(0)
    expect(result.sampleRate).toBe(22050)
    expect(result.channels).toBe(1)
  })

  it('should handle single chunk', () => {
    const chunk: PcmAudio = {
      samples: new Float32Array([1, 2, 3]),
      sampleRate: 44100,
      channels: 2,
    }

    const result = concatenatePcmAudio([chunk])

    expect(result.samples.length).toBe(3)
    expect(result.sampleRate).toBe(44100)
    expect(result.channels).toBe(2)
  })
})

describe('getDurationSeconds', () => {
  it('should calculate duration correctly for mono audio', () => {
    const audio: PcmAudio = {
      samples: new Float32Array(22050), // 1 second of audio at 22050Hz
      sampleRate: 22050,
      channels: 1,
    }

    expect(getDurationSeconds(audio)).toBe(1)
  })

  it('should calculate duration correctly for stereo audio', () => {
    const audio: PcmAudio = {
      samples: new Float32Array(44100), // 0.5 seconds of stereo audio at 44100Hz
      sampleRate: 44100,
      channels: 2,
    }

    expect(getDurationSeconds(audio)).toBe(0.5)
  })
})

describe('formatDuration', () => {
  it('should format seconds correctly', () => {
    expect(formatDuration(45)).toBe('0:45')
  })

  it('should format minutes correctly', () => {
    expect(formatDuration(125)).toBe('2:05')
  })

  it('should format hours correctly', () => {
    expect(formatDuration(3661)).toBe('1:01:01')
  })

  it('should handle zero', () => {
    expect(formatDuration(0)).toBe('0:00')
  })
})
