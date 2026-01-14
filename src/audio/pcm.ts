import { PcmAudio } from '../tts/engine'

export function concatenatePcmAudio(chunks: PcmAudio[]): PcmAudio {
  if (chunks.length === 0) {
    return {
      samples: new Float32Array(0),
      sampleRate: 22050,
      channels: 1,
    }
  }

  const sampleRate = chunks[0].sampleRate
  const channels = chunks[0].channels

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.samples.length, 0)
  const samples = new Float32Array(totalLength)

  let offset = 0
  for (const chunk of chunks) {
    samples.set(chunk.samples, offset)
    offset += chunk.samples.length
  }

  return { samples, sampleRate, channels }
}

export function getDurationSeconds(audio: PcmAudio): number {
  return audio.samples.length / audio.sampleRate / audio.channels
}

export function pcmToWav(audio: PcmAudio): Blob {
  const { samples, sampleRate, channels } = audio
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = channels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = samples.length * bytesPerSample
  const headerSize = 44
  const totalSize = headerSize + dataSize

  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)

  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, totalSize - 8, true)
  writeString(view, 8, 'WAVE')

  // fmt chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, 1, true) // audio format (PCM)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)

  // data chunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // Convert float samples to 16-bit PCM
  const offset = 44
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]))
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff
    view.setInt16(offset + i * 2, int16, true)
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
