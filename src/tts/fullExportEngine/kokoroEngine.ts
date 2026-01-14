import { TtsEngine, Voice, TtsOptions, PcmAudio, Progress } from '../engine'
import type { KokoroTTS as KokoroTTSType } from 'kokoro-js'

// Kokoro.js TTS Engine
// An 82M parameter neural TTS model that runs 100% locally in the browser
// Uses WASM with optional WebGPU acceleration
// Produces high-quality, natural-sounding speech

// Singleton instance for the TTS model (it's heavy to load)
let kokoroInstance: KokoroTTSType | null = null
let kokoroLoading: Promise<KokoroTTSType> | null = null

// Detect WebGPU support
async function detectWebGPU(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false
  if (!('gpu' in navigator)) return false
  try {
    const gpu = (navigator as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
    if (!gpu) return false
    const adapter = await gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

async function getKokoroInstance(
  onProgress?: (msg: string) => void
): Promise<KokoroTTSType> {
  if (kokoroInstance) {
    return kokoroInstance
  }

  if (kokoroLoading) {
    return kokoroLoading
  }

  kokoroLoading = (async () => {
    onProgress?.('Loading Kokoro neural TTS model...')

    const { KokoroTTS } = await import('kokoro-js')
    const modelId = 'onnx-community/Kokoro-82M-v1.0-ONNX'

    // Detect best device
    const hasWebGPU = await detectWebGPU()
    const device = hasWebGPU ? 'webgpu' : 'wasm'
    // Use q8 for WASM (faster), fp32 for WebGPU (better quality)
    const dtype = hasWebGPU ? 'fp32' : 'q8'

    onProgress?.(`Initializing Kokoro (${device}, ${dtype})...`)

    const tts = await KokoroTTS.from_pretrained(modelId, {
      dtype,
      device,
    })

    kokoroInstance = tts
    return tts
  })()

  return kokoroLoading
}

// Voice metadata
const KOKORO_VOICES: Voice[] = [
  // American Female
  { id: 'af_heart', name: 'Heart (Female)', language: 'en-US' },
  { id: 'af_bella', name: 'Bella (Female)', language: 'en-US' },
  { id: 'af_nicole', name: 'Nicole (Female)', language: 'en-US' },
  { id: 'af_sarah', name: 'Sarah (Female)', language: 'en-US' },
  { id: 'af_sky', name: 'Sky (Female)', language: 'en-US' },
  // American Male
  { id: 'am_adam', name: 'Adam (Male)', language: 'en-US' },
  { id: 'am_michael', name: 'Michael (Male)', language: 'en-US' },
  // British Female
  { id: 'bf_emma', name: 'Emma (British F)', language: 'en-GB' },
  { id: 'bf_isabella', name: 'Isabella (British F)', language: 'en-GB' },
  // British Male
  { id: 'bm_george', name: 'George (British M)', language: 'en-GB' },
  { id: 'bm_lewis', name: 'Lewis (British M)', language: 'en-GB' },
]

export class KokoroTtsEngine implements TtsEngine {
  id = 'kokoro'
  name = 'Kokoro (Neural)'
  description = 'High-quality 82M neural TTS - WebGPU/WASM, runs locally'
  supportsExport = true

  async isAvailable(): Promise<boolean> {
    try {
      // Check if the module can be imported
      await import('kokoro-js')
      return true
    } catch {
      return false
    }
  }

  async listVoices(): Promise<Voice[]> {
    return KOKORO_VOICES
  }

  async synthesizeToPcm(
    text: string,
    opts: TtsOptions,
    onProgress: (p: Progress) => void,
    signal: AbortSignal
  ): Promise<PcmAudio> {
    onProgress({
      stage: 'parsing',
      stageLabel: 'Loading Kokoro model (first time may take ~30s)...',
      percent: 5,
      currentChunk: 0,
      totalChunks: 1,
      maybeAudioBytesHeld: 0,
    })

    const tts = await getKokoroInstance((msg) => {
      onProgress({
        stage: 'parsing',
        stageLabel: msg,
        percent: 10,
        currentChunk: 0,
        totalChunks: 1,
        maybeAudioBytesHeld: 0,
      })
    })

    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    // Split text into chunks for progress tracking and to handle long texts
    // Kokoro works best with shorter segments
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    const chunks: string[] = []

    // Group sentences into chunks of ~200 chars for optimal processing
    let currentChunk = ''
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > 200 && currentChunk.length > 0) {
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
    const voiceId = opts.voice.id
    let sampleRate = 24000 // Kokoro outputs at 24kHz
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
        percent: 15 + (80 * (i + 1)) / chunks.length,
        currentChunk: i + 1,
        totalChunks: chunks.length,
        maybeAudioBytesHeld: totalSamplesBuffered * Float32Array.BYTES_PER_ELEMENT,
      })

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await tts.generate(chunk, { voice: voiceId as any })
        sampleRate = result.sampling_rate || 24000

        // RawAudio from transformers.js has audio property
        const audioData = result.audio as Float32Array
        if (audioData && audioData.length > 0) {
          audioChunks.push(audioData)
          totalSamplesBuffered += audioData.length
          // Add a small pause between chunks (0.3s)
          const pauseSamples = new Float32Array(Math.floor(0.3 * sampleRate))
          audioChunks.push(pauseSamples)
          totalSamplesBuffered += pauseSamples.length
        }
      } catch (e) {
        console.warn('Kokoro failed to synthesize chunk:', chunk, e)
      }

      onProgress({
        stage: 'synthesizing',
        stageLabel: `Generating speech (${i + 1}/${chunks.length})...`,
        percent: 15 + (80 * (i + 1)) / chunks.length,
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

    // Apply rate adjustment by resampling if needed
    let finalSamples = samples
    let finalSampleRate = sampleRate

    if (opts.rate !== 1.0) {
      // Simple resampling for speed adjustment
      const newLength = Math.floor(samples.length / opts.rate)
      finalSamples = new Float32Array(newLength)
      for (let i = 0; i < newLength; i++) {
        const srcIndex = Math.floor(i * opts.rate)
        finalSamples[i] = samples[Math.min(srcIndex, samples.length - 1)]
      }
    }

    onProgress({
      stage: 'synthesizing',
      stageLabel: 'Complete',
      percent: 100,
      currentChunk: chunks.length,
      totalChunks: chunks.length,
      maybeAudioBytesHeld: finalSamples.byteLength,
    })

    return {
      samples: finalSamples,
      sampleRate: finalSampleRate,
      channels: 1,
    }
  }
}
