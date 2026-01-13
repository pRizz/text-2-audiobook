import { TtsEngine, Voice, TtsOptions, PcmAudio, Progress } from '../engine'

// SAM (Software Automatic Mouth) TTS Engine
// A tiny retro TTS from 1982, ported to JavaScript
// Very small footprint (~10KB), runs entirely in browser

export class SamTtsEngine implements TtsEngine {
  id = 'sam'
  name = 'SAM (Retro)'
  description = 'Classic 1982 Commodore 64 speech synthesizer - tiny & fast'
  supportsExport = true

  async isAvailable(): Promise<boolean> {
    try {
      const SamJs = (await import('sam-js')).default
      // Test instantiation
      new SamJs()
      return true
    } catch {
      return false
    }
  }

  async listVoices(): Promise<Voice[]> {
    // SAM has preset voices with different characteristics
    return [
      { id: 'sam-default', name: 'SAM (Default)', language: 'en' },
      { id: 'sam-elf', name: 'Elf', language: 'en' },
      { id: 'sam-robot', name: 'Little Robot', language: 'en' },
      { id: 'sam-oldlady', name: 'Little Old Lady', language: 'en' },
      { id: 'sam-et', name: 'Extra-Terrestrial', language: 'en' },
      { id: 'sam-stuffy', name: 'Stuffy Guy', language: 'en' },
    ]
  }

  private getVoiceParams(voiceId: string): { speed: number; pitch: number; throat: number; mouth: number } {
    // Voice presets from SAM documentation
    const presets: Record<string, { speed: number; pitch: number; throat: number; mouth: number }> = {
      'sam-default': { speed: 72, pitch: 64, throat: 128, mouth: 128 },
      'sam-elf': { speed: 72, pitch: 64, throat: 110, mouth: 160 },
      'sam-robot': { speed: 92, pitch: 60, throat: 190, mouth: 190 },
      'sam-oldlady': { speed: 82, pitch: 32, throat: 145, mouth: 145 },
      'sam-et': { speed: 100, pitch: 64, throat: 150, mouth: 200 },
      'sam-stuffy': { speed: 82, pitch: 72, throat: 110, mouth: 105 },
    }
    return presets[voiceId] || presets['sam-default']
  }

  async synthesizeToPcm(
    text: string,
    opts: TtsOptions,
    onProgress: (p: Progress) => void,
    signal: AbortSignal
  ): Promise<PcmAudio> {
    const SamJs = (await import('sam-js')).default

    onProgress({
      stage: 'parsing',
      stageLabel: 'Preparing SAM...',
      percent: 5,
      currentChunk: 0,
      totalChunks: 1,
    })

    // Split text into sentences for progress tracking
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    const chunks = sentences.length > 0 ? sentences : [text]
    const audioChunks: Float32Array[] = []

    const voiceParams = this.getVoiceParams(opts.voice.id)
    // Adjust speed based on rate (SAM speed is inverse - higher = slower)
    const adjustedSpeed = Math.round(voiceParams.speed / opts.rate)
    // Adjust pitch
    const adjustedPitch = Math.round(voiceParams.pitch * opts.pitch)

    for (let i = 0; i < chunks.length; i++) {
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }

      const chunk = chunks[i].trim()
      if (!chunk) continue

      onProgress({
        stage: 'synthesizing',
        stageLabel: `Synthesizing with SAM (${i + 1}/${chunks.length})...`,
        percent: 5 + (90 * (i + 1)) / chunks.length,
        currentChunk: i + 1,
        totalChunks: chunks.length,
      })

      try {
        const sam = new SamJs({
          speed: adjustedSpeed,
          pitch: adjustedPitch,
          throat: voiceParams.throat,
          mouth: voiceParams.mouth,
        })

        // Get Float32Array audio buffer
        const buffer = sam.buf32(chunk)
        if (buffer && buffer.length > 0) {
          audioChunks.push(buffer)
          // Add a small pause between sentences
          const pauseSamples = new Float32Array(Math.floor(0.2 * 22050))
          audioChunks.push(pauseSamples)
        }
      } catch (e) {
        console.warn('SAM failed to synthesize chunk:', chunk, e)
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
      sampleRate: 22050, // SAM outputs at 22050Hz
      channels: 1,
    }
  }
}
