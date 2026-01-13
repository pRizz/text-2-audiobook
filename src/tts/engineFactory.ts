import { TtsEngine, EngineMode } from './engine'
import { PiperTtsEngine } from './fullExportEngine/piperEngine'
import { WebSpeechEngine } from './liteSpeechEngine/webSpeechEngine'

let cachedEngine: TtsEngine | null = null
let cachedMode: EngineMode = 'unknown'

export async function getAvailableEngine(): Promise<TtsEngine | null> {
  if (cachedEngine) return cachedEngine

  // Try full export engine first (Piper WASM)
  const piperEngine = new PiperTtsEngine()
  if (await piperEngine.isAvailable()) {
    cachedEngine = piperEngine
    cachedMode = 'full'
    return piperEngine
  }

  // Fall back to Web Speech API (lite mode - preview only)
  const webSpeechEngine = new WebSpeechEngine()
  if (await webSpeechEngine.isAvailable()) {
    cachedEngine = webSpeechEngine
    cachedMode = 'lite'
    return webSpeechEngine
  }

  cachedMode = 'unknown'
  return null
}

export async function getEngineMode(): Promise<EngineMode> {
  if (cachedMode !== 'unknown') return cachedMode

  await getAvailableEngine()
  return cachedMode
}
