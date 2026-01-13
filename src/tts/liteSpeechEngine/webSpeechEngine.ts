import { TtsEngine, Voice, TtsOptions, PcmAudio, Progress } from '../engine'

export class WebSpeechEngine implements TtsEngine {
  name = 'Web Speech API (Preview Only)'

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
    _text: string,
    _opts: TtsOptions,
    _onProgress: (p: Progress) => void,
    _signal: AbortSignal
  ): Promise<PcmAudio> {
    // Web Speech API cannot produce PCM audio directly
    // This engine is for preview only
    throw new Error(
      'Web Speech API does not support PCM export. Use a full export engine for audio downloads.'
    )
  }
}
