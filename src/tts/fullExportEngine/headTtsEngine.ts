import { TtsEngine, Voice, TtsOptions, PcmAudio, Progress } from '../engine'
import type { HeadTTS, HeadTTSMetadata } from '@met4citizen/headtts'

// HeadTTS Engine
// Neural TTS with timestamps and visemes for lip-sync
// Uses Kokoro model under the hood, runs in-browser via WebGPU/WASM
// Provides word-level timing information alongside audio

// Singleton instance
let headTtsInstance: HeadTTS | null = null

// Voice metadata (same as Kokoro since HeadTTS uses Kokoro)
const HEADTTS_VOICES: Voice[] = [
  // American Female
  { id: 'af_bella', name: 'Bella (Female)', language: 'en-US' },
  { id: 'af_nicole', name: 'Nicole (Female)', language: 'en-US' },
  { id: 'af_sarah', name: 'Sarah (Female)', language: 'en-US' },
  { id: 'af_sky', name: 'Sky (Female)', language: 'en-US' },
  // American Male
  { id: 'am_adam', name: 'Adam (Male)', language: 'en-US' },
  { id: 'am_fenrir', name: 'Fenrir (Male)', language: 'en-US' },
  { id: 'am_michael', name: 'Michael (Male)', language: 'en-US' },
  // British Female
  { id: 'bf_emma', name: 'Emma (British F)', language: 'en-GB' },
  { id: 'bf_isabella', name: 'Isabella (British F)', language: 'en-GB' },
  // British Male
  { id: 'bm_george', name: 'George (British M)', language: 'en-GB' },
  { id: 'bm_lewis', name: 'Lewis (British M)', language: 'en-GB' },
]

export class HeadTtsEngine implements TtsEngine {
  id = 'headtts'
  name = 'HeadTTS (Neural+Timestamps)'
  description = 'Neural TTS with word timestamps & visemes - ideal for lip-sync'
  supportsExport = true

  async isAvailable(): Promise<boolean> {
    try {
      // Check if the module can be imported
      await import('@met4citizen/headtts')
      return true
    } catch {
      return false
    }
  }

  async listVoices(): Promise<Voice[]> {
    return HEADTTS_VOICES
  }

  private async getInstance(): Promise<HeadTTS> {
    if (headTtsInstance) {
      return headTtsInstance
    }

    const { HeadTTS: HeadTTSClass } = await import('@met4citizen/headtts')

    // Use webgpu endpoint for browser-only mode
    const instance = new HeadTTSClass({
      endpoints: ['webgpu', 'wasm'], // Try WebGPU first, fall back to WASM
      languages: ['en-us', 'en-gb'],
      voices: HEADTTS_VOICES.map((v) => v.id),
    })

    await instance.connect()
    headTtsInstance = instance
    return instance
  }

  async synthesizeToPcm(
    text: string,
    opts: TtsOptions,
    onProgress: (p: Progress) => void,
    signal: AbortSignal
  ): Promise<PcmAudio> {
    onProgress({
      stage: 'parsing',
      stageLabel: 'Loading HeadTTS model...',
      percent: 5,
      currentChunk: 0,
      totalChunks: 1,
      maybeAudioBytesHeld: 0,
    })

    const tts = await this.getInstance()

    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    // Configure voice and encoding
    const language = opts.voice.language.toLowerCase().replace('-', '_') || 'en-us'
    tts.setup({
      voice: opts.voice.id,
      language: language.startsWith('en') ? language : 'en-us',
      speed: opts.rate,
      audioEncoding: 'pcm', // Get raw PCM for export
    })

    // Split text into chunks for progress
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    const chunks: string[] = []

    // Group into manageable chunks
    let currentChunk = ''
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > 300 && currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
        currentChunk = sentence
      } else {
        currentChunk += ' ' + sentence
      }
    }
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    if (chunks.length === 0) {
      chunks.push(text)
    }

    const audioChunks: Float32Array[] = []
    const sampleRate = 24000 // HeadTTS/Kokoro outputs at 24kHz
    let totalSamplesBuffered = 0

    for (let i = 0; i < chunks.length; i++) {
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }

      const chunk = chunks[i].trim()
      if (!chunk) continue

      onProgress({
        stage: 'synthesizing',
        stageLabel: `Generating speech (${i + 1}/${chunks.length})...`,
        percent: 10 + (85 * (i + 1)) / chunks.length,
        currentChunk: i + 1,
        totalChunks: chunks.length,
        maybeAudioBytesHeld: totalSamplesBuffered * Float32Array.BYTES_PER_ELEMENT,
      })

      try {
        // HeadTTS uses event-based API
        const audioData = await new Promise<ArrayBuffer>((resolve, reject) => {
          let audioBuffer: ArrayBuffer | null = null
          const timeout = setTimeout(() => {
            reject(new Error('HeadTTS synthesis timeout'))
          }, 60000) // 60 second timeout

          tts.onmessage = (data: HeadTTSMetadata | ArrayBuffer) => {
            if (data instanceof ArrayBuffer) {
              audioBuffer = data
              clearTimeout(timeout)
              resolve(audioBuffer)
            }
            // Metadata comes first, then audio - we wait for the audio
          }

          tts.onerror = (error: Error) => {
            clearTimeout(timeout)
            reject(error)
          }

          tts.synthesize({ input: chunk })
        })

        // Convert PCM 16-bit LE to Float32
        const int16View = new Int16Array(audioData)
        const floatSamples = new Float32Array(int16View.length)
        for (let j = 0; j < int16View.length; j++) {
          floatSamples[j] = int16View[j] / 32768
        }

        if (floatSamples.length > 0) {
          audioChunks.push(floatSamples)
          totalSamplesBuffered += floatSamples.length
          // Add a small pause between chunks
          const pauseSamples = new Float32Array(Math.floor(0.3 * sampleRate))
          audioChunks.push(pauseSamples)
          totalSamplesBuffered += pauseSamples.length
        }
      } catch (e) {
        console.warn('HeadTTS failed to synthesize chunk:', chunk, e)
      }

      onProgress({
        stage: 'synthesizing',
        stageLabel: `Generating speech (${i + 1}/${chunks.length})...`,
        percent: 10 + (85 * (i + 1)) / chunks.length,
        currentChunk: i + 1,
        totalChunks: chunks.length,
        maybeAudioBytesHeld: totalSamplesBuffered * Float32Array.BYTES_PER_ELEMENT,
      })

      // Yield to UI
      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    onProgress({
      stage: 'synthesizing',
      stageLabel: 'Finalizing audio...',
      percent: 98,
      currentChunk: chunks.length,
      totalChunks: chunks.length,
      maybeAudioBytesHeld: totalSamplesBuffered * Float32Array.BYTES_PER_ELEMENT,
    })

    // Concatenate all chunks
    const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const samples = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of audioChunks) {
      samples.set(chunk, offset)
      offset += chunk.length
    }

    onProgress({
      stage: 'synthesizing',
      stageLabel: 'Complete',
      percent: 100,
      currentChunk: chunks.length,
      totalChunks: chunks.length,
      maybeAudioBytesHeld: samples.byteLength,
    })

    return {
      samples,
      sampleRate,
      channels: 1,
    }
  }
}
