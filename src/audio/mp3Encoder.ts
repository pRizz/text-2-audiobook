import { PcmAudio } from '../tts/engine'

// MP3 Encoder using @breezystack/lamejs (ESM-compatible fork)
// This runs encoding in chunks to provide progress updates

export async function encodeToMp3(
  audio: PcmAudio,
  onProgress: (percent: number) => void
): Promise<Blob> {
  // Dynamic import of lamejs
  const lamejs = await import('@breezystack/lamejs')

  const { samples, sampleRate, channels } = audio
  const kbps = 128
  const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps)

  // Convert Float32 to Int16
  const sampleBlockSize = 1152
  const int16Samples = new Int16Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    int16Samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }

  const mp3Data: Uint8Array[] = []
  const totalBlocks = Math.ceil(int16Samples.length / sampleBlockSize)

  for (let i = 0; i < int16Samples.length; i += sampleBlockSize) {
    const blockIndex = Math.floor(i / sampleBlockSize)
    const sampleChunk = int16Samples.subarray(i, i + sampleBlockSize)

    let mp3buf: Uint8Array
    if (channels === 1) {
      mp3buf = mp3encoder.encodeBuffer(sampleChunk)
    } else {
      // Split stereo channels
      const left = new Int16Array(sampleChunk.length / 2)
      const right = new Int16Array(sampleChunk.length / 2)
      for (let j = 0; j < left.length; j++) {
        left[j] = sampleChunk[j * 2]
        right[j] = sampleChunk[j * 2 + 1]
      }
      mp3buf = mp3encoder.encodeBuffer(left, right)
    }

    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf)
    }

    // Report progress
    onProgress(Math.round(((blockIndex + 1) / totalBlocks) * 100))

    // Yield to UI thread periodically
    if (blockIndex % 100 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  // Flush remaining data
  const mp3buf = mp3encoder.flush()
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf)
  }

  // Combine all chunks
  const totalLength = mp3Data.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of mp3Data) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return new Blob([result], { type: 'audio/mpeg' })
}
