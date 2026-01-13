import { TtsEngine, Voice, TtsOptions, PcmAudio, Progress } from '../engine'

// meSpeak TTS Engine
// Based on eSpeak, supports many languages
// Uses web worker for non-blocking synthesis

declare global {
  interface Window {
    meSpeak: MeSpeakAPI
  }
}

interface MeSpeakAPI {
  loadConfig: (url: string, callback?: () => void) => void
  loadVoice: (url: string, callback?: () => void) => void
  speak: (text: string, options?: MeSpeakOptions) => number | Float32Array
  isConfigLoaded: () => boolean
}

interface MeSpeakOptions {
  amplitude?: number
  wordgap?: number
  pitch?: number
  speed?: number
  voice?: string
  rawdata?: 'array' | 'mime' | 'buffer'
  noWorker?: boolean
}

export class MeSpeakTtsEngine implements TtsEngine {
  id = 'mespeak'
  name = 'eSpeak (Multi-language)'
  description = 'Open-source TTS with 100+ languages - robotic but versatile'
  supportsExport = true
  private isLoaded = false
  private loadedVoices: Set<string> = new Set()

  async isAvailable(): Promise<boolean> {
    try {
      // meSpeak needs to be loaded via script tag or dynamic import
      // Check if it's already available
      if (typeof window !== 'undefined' && window.meSpeak) {
        return true
      }

      // Try to load meSpeak dynamically
      await this.loadMeSpeak()
      return this.isLoaded
    } catch {
      return false
    }
  }

  private async loadMeSpeak(): Promise<void> {
    if (this.isLoaded) return

    return new Promise((resolve, reject) => {
      // Load meSpeak from CDN
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/mespeak@2.0.2/mespeak.min.js'
      script.onload = () => {
        // Load config
        window.meSpeak.loadConfig('https://cdn.jsdelivr.net/npm/mespeak@2.0.2/mespeak_config.json', () => {
          // Load default English voice
          window.meSpeak.loadVoice('https://cdn.jsdelivr.net/npm/mespeak@2.0.2/voices/en/en-us.json', () => {
            this.isLoaded = true
            this.loadedVoices.add('en/en-us')
            resolve()
          })
        })
      }
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  private async loadVoice(voiceId: string): Promise<void> {
    if (this.loadedVoices.has(voiceId)) return

    return new Promise((resolve) => {
      window.meSpeak.loadVoice(
        `https://cdn.jsdelivr.net/npm/mespeak@2.0.2/voices/${voiceId}.json`,
        () => {
          this.loadedVoices.add(voiceId)
          resolve()
        }
      )
    })
  }

  async listVoices(): Promise<Voice[]> {
    // meSpeak supports many languages - list common ones
    return [
      { id: 'en/en-us', name: 'English (US)', language: 'en-US' },
      { id: 'en/en', name: 'English (UK)', language: 'en-GB' },
      { id: 'en/en-sc', name: 'English (Scottish)', language: 'en-SC' },
      { id: 'de', name: 'German', language: 'de' },
      { id: 'es', name: 'Spanish', language: 'es' },
      { id: 'es-la', name: 'Spanish (Latin America)', language: 'es-LA' },
      { id: 'fr', name: 'French', language: 'fr' },
      { id: 'it', name: 'Italian', language: 'it' },
      { id: 'pt', name: 'Portuguese', language: 'pt' },
      { id: 'pt-pt', name: 'Portuguese (Portugal)', language: 'pt-PT' },
      { id: 'ru', name: 'Russian', language: 'ru' },
      { id: 'zh', name: 'Chinese (Mandarin)', language: 'zh' },
      { id: 'ja', name: 'Japanese', language: 'ja' },
      { id: 'ko', name: 'Korean', language: 'ko' },
      { id: 'nl', name: 'Dutch', language: 'nl' },
      { id: 'pl', name: 'Polish', language: 'pl' },
      { id: 'sv', name: 'Swedish', language: 'sv' },
      { id: 'no', name: 'Norwegian', language: 'no' },
      { id: 'fi', name: 'Finnish', language: 'fi' },
      { id: 'el', name: 'Greek', language: 'el' },
    ]
  }

  async synthesizeToPcm(
    text: string,
    opts: TtsOptions,
    onProgress: (p: Progress) => void,
    signal: AbortSignal
  ): Promise<PcmAudio> {
    if (!this.isLoaded) {
      onProgress({
        stage: 'parsing',
        stageLabel: 'Loading eSpeak engine...',
        percent: 0,
        currentChunk: 0,
        totalChunks: 1,
      })
      await this.loadMeSpeak()
    }

    // Load the selected voice if not already loaded
    onProgress({
      stage: 'parsing',
      stageLabel: 'Loading voice...',
      percent: 5,
      currentChunk: 0,
      totalChunks: 1,
    })
    await this.loadVoice(opts.voice.id)

    // Split text into manageable chunks
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    const chunks = sentences.length > 0 ? sentences : [text]
    const audioChunks: Float32Array[] = []

    // meSpeak speed: 80-450 wpm, default 175
    const speed = Math.round(175 * opts.rate)
    // meSpeak pitch: 0-99, default 50
    const pitch = Math.round(50 * opts.pitch)

    for (let i = 0; i < chunks.length; i++) {
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }

      const chunk = chunks[i].trim()
      if (!chunk) continue

      onProgress({
        stage: 'synthesizing',
        stageLabel: `Synthesizing with eSpeak (${i + 1}/${chunks.length})...`,
        percent: 10 + (85 * (i + 1)) / chunks.length,
        currentChunk: i + 1,
        totalChunks: chunks.length,
      })

      try {
        // Get raw audio data
        const result = window.meSpeak.speak(chunk, {
          voice: opts.voice.id,
          speed,
          pitch,
          rawdata: 'array',
          noWorker: false,
        })

        if (result && typeof result !== 'number') {
          // meSpeak returns audio as Int8Array or similar, convert to Float32
          const audioData = result as unknown as ArrayLike<number>
          const float32 = new Float32Array(audioData.length)
          for (let j = 0; j < audioData.length; j++) {
            float32[j] = audioData[j] / 128 // Normalize to -1 to 1
          }
          audioChunks.push(float32)
        }
      } catch (e) {
        console.warn('meSpeak failed to synthesize chunk:', chunk, e)
      }

      // Yield to UI
      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    onProgress({
      stage: 'synthesizing',
      stageLabel: 'Finalizing audio...',
      percent: 98,
      currentChunk: chunks.length,
      totalChunks: chunks.length,
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
    })

    return {
      samples,
      sampleRate: 22050, // meSpeak outputs at 22050Hz
      channels: 1,
    }
  }
}
