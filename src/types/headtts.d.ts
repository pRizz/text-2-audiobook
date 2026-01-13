declare module '@met4citizen/headtts' {
  export interface HeadTTSConfig {
    endpoints: string[]
    languages?: string[]
    voices?: string[]
  }

  export interface HeadTTSSetup {
    voice: string
    language: string
    speed: number
    audioEncoding: 'wav' | 'pcm'
  }

  export interface HeadTTSMetadata {
    words: string[]
    wtimes: number[]
    wdurations: number[]
    visemes: number[]
    vtimes: number[]
    vdurations: number[]
    phonemes: string[]
    audioEncoding: string
  }

  export class HeadTTS {
    constructor(config: HeadTTSConfig)
    connect(): Promise<void>
    disconnect(): void
    setup(config: HeadTTSSetup): void
    synthesize(input: { input: string }): void
    onmessage: ((data: HeadTTSMetadata | ArrayBuffer) => void) | null
    onerror: ((error: Error) => void) | null
  }
}
