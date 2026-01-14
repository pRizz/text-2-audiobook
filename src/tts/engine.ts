export interface Voice {
  id: string
  name: string
  language: string
}

export interface TtsOptions {
  voice: Voice
  rate: number
  pitch: number
}

export interface PcmAudio {
  samples: Float32Array
  sampleRate: number
  channels: number
}

export interface Progress {
  stage: 'parsing' | 'synthesizing' | 'encoding'
  stageLabel: string
  percent: number
  currentChunk: number
  totalChunks: number
  /**
   * Approximate amount of audio data currently buffered in-memory (bytes).
   *
   * For export-capable engines this usually reflects PCM samples accumulated
   * so far while synthesizing. During encoding, callers may set this to reflect
   * the source PCM (and/or other intermediate buffers) still held in memory.
   */
  maybeAudioBytesHeld?: number
}

export type EngineMode = 'full' | 'lite' | 'unknown'

export interface TtsEngine {
  id: string
  name: string
  description: string
  supportsExport: boolean
  isAvailable(): Promise<boolean>
  listVoices(): Promise<Voice[]>
  synthesizeToPcm(
    text: string,
    opts: TtsOptions,
    onProgress: (p: Progress) => void,
    signal: AbortSignal
  ): Promise<PcmAudio>
}

export interface EngineInfo {
  id: string
  name: string
  description: string
  supportsExport: boolean
  available: boolean
}
