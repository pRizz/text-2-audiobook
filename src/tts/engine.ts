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
