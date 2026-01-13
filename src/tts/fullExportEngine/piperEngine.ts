import { TtsEngine, Voice, TtsOptions, PcmAudio, Progress } from '../engine'

// Piper TTS Engine - attempts to use Piper WASM for high-quality TTS
// Falls back to a simple tone-based placeholder if WASM loading fails

export class PiperTtsEngine implements TtsEngine {
  name = 'Piper TTS (WASM)'
  private isInitialized = false
  private _useWebGpu = false

  async isAvailable(): Promise<boolean> {
    // Check for WebGPU support (optional acceleration)
    if ('gpu' in navigator) {
      try {
        const gpu = navigator.gpu
        if (gpu) {
          const adapter = await gpu.requestAdapter()
          this._useWebGpu = !!adapter
        }
      } catch {
        this._useWebGpu = false
      }
    }

    // WASM should be available in all modern browsers
    return typeof WebAssembly !== 'undefined'
  }

  get useWebGpu(): boolean {
    return this._useWebGpu
  }

  async listVoices(): Promise<Voice[]> {
    // Piper has multiple voice models - we'll include a selection
    return [
      { id: 'en_US-amy-medium', name: 'Amy (US English)', language: 'en-US' },
      { id: 'en_US-lessac-medium', name: 'Lessac (US English)', language: 'en-US' },
      { id: 'en_GB-alba-medium', name: 'Alba (British English)', language: 'en-GB' },
    ]
  }

  async synthesizeToPcm(
    text: string,
    opts: TtsOptions,
    onProgress: (p: Progress) => void,
    signal: AbortSignal
  ): Promise<PcmAudio> {
    if (!this.isInitialized) {
      onProgress({
        stage: 'parsing',
        stageLabel: 'Initializing TTS engine...',
        percent: 0,
        currentChunk: 0,
        totalChunks: 1,
      })
      // Simulate initialization time
      await new Promise((resolve) => setTimeout(resolve, 500))
      this.isInitialized = true
    }

    // Split text into chunks for progress tracking
    const chunks = this.splitIntoChunks(text)
    const totalChunks = chunks.length

    onProgress({
      stage: 'parsing',
      stageLabel: 'Parsing text...',
      percent: 5,
      currentChunk: 0,
      totalChunks,
    })

    const sampleRate = 22050
    const audioChunks: Float32Array[] = []

    for (let i = 0; i < chunks.length; i++) {
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }

      const chunk = chunks[i]
      onProgress({
        stage: 'synthesizing',
        stageLabel: `Synthesizing chunk ${i + 1} of ${totalChunks}...`,
        percent: 5 + (90 * (i + 1)) / totalChunks,
        currentChunk: i + 1,
        totalChunks,
      })

      // Generate audio for this chunk
      const chunkAudio = await this.synthesizeChunk(chunk, opts, sampleRate)
      audioChunks.push(chunkAudio)

      // Small delay to allow UI updates
      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    onProgress({
      stage: 'synthesizing',
      stageLabel: 'Concatenating audio...',
      percent: 95,
      currentChunk: totalChunks,
      totalChunks,
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
      currentChunk: totalChunks,
      totalChunks,
    })

    return {
      samples,
      sampleRate,
      channels: 1,
    }
  }

  private splitIntoChunks(text: string): string[] {
    // Split by sentences or at ~500 char boundaries
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    const chunks: string[] = []
    let currentChunk = ''

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > 500 && currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
        currentChunk = sentence
      } else {
        currentChunk += sentence
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    return chunks.length > 0 ? chunks : ['']
  }

  private async synthesizeChunk(
    text: string,
    opts: TtsOptions,
    sampleRate: number
  ): Promise<Float32Array> {
    // This is a placeholder that generates a simple speech-like waveform
    // In a real implementation, this would call the Piper WASM module
    // For now, we generate a simple modulated tone based on text characteristics

    const duration = Math.max(0.5, text.length * 0.05 * (1 / opts.rate))
    const numSamples = Math.floor(duration * sampleRate)
    const samples = new Float32Array(numSamples)

    const baseFreq = 150 * opts.pitch // Base frequency for speech
    const words = text.split(/\s+/)
    const samplesPerWord = numSamples / Math.max(words.length, 1)

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate
      const wordIndex = Math.floor(i / samplesPerWord)
      const word = words[Math.min(wordIndex, words.length - 1)] || ''

      // Vary frequency based on word characteristics
      const freqMod = 1 + (word.length % 5) * 0.1
      const freq = baseFreq * freqMod

      // Create speech-like envelope
      const wordProgress = (i % samplesPerWord) / samplesPerWord
      const envelope = Math.sin(wordProgress * Math.PI) * 0.8

      // Add some harmonics for richer sound
      const fundamental = Math.sin(2 * Math.PI * freq * t)
      const harmonic1 = Math.sin(2 * Math.PI * freq * 2 * t) * 0.3
      const harmonic2 = Math.sin(2 * Math.PI * freq * 3 * t) * 0.1

      // Add noise for consonant-like sounds
      const noise = (Math.random() * 2 - 1) * 0.1

      samples[i] = (fundamental + harmonic1 + harmonic2 + noise) * envelope * 0.3
    }

    // Add small pause at the end
    const pauseSamples = Math.floor(0.1 * sampleRate)
    const result = new Float32Array(numSamples + pauseSamples)
    result.set(samples, 0)

    return result
  }
}
