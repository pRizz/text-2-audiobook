declare module 'sam-js' {
  interface SamOptions {
    speed?: number
    pitch?: number
    throat?: number
    mouth?: number
  }

  export default class SamJs {
    constructor(options?: SamOptions)
    speak(text: string): Promise<void>
    download(text: string): void
    buf8(text: string): Uint8Array
    buf32(text: string): Float32Array
  }
}
