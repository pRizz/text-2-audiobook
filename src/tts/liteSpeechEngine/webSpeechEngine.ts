import { TtsEngine, Voice, TtsOptions, PcmAudio, Progress } from '../engine'

export class WebSpeechEngine implements TtsEngine {
  id = 'webspeech'
  name = 'Web Speech API'
  description = 'Native browser TTS - best voice quality, preview only (no export)'
  supportsExport = false

  async isAvailable(): Promise<boolean> {
    return 'speechSynthesis' in window
  }

  async listVoices(): Promise<Voice[]> {
    return new Promise((resolve) => {
      const getVoices = () => {
        const voices = speechSynthesis.getVoices()
        resolve(
          voices.map((v) => ({
            id: v.name,
            name: v.name,
            language: v.lang,
          }))
        )
      }

      if (speechSynthesis.getVoices().length > 0) {
        getVoices()
      } else {
        speechSynthesis.addEventListener('voiceschanged', getVoices, { once: true })
        // Fallback timeout in case voiceschanged doesn't fire
        setTimeout(getVoices, 1000)
      }
    })
  }

  async synthesizeToPcm(
    text: string,
    opts: TtsOptions,
    onProgress: (p: Progress) => void,
    signal: AbortSignal
  ): Promise<PcmAudio> {
    void text
    void opts
    void onProgress
    void signal

    // Web Speech API cannot produce PCM audio directly
    // This engine is for preview only
    throw new Error(
      'Web Speech API does not support PCM export. Use a full export engine for audio downloads.'
    )
  }
}
