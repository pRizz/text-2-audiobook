import { TtsEngine, EngineInfo } from './engine'
import { PiperTtsEngine } from './fullExportEngine/piperEngine'
import { SamTtsEngine } from './fullExportEngine/samEngine'
import { MeSpeakTtsEngine } from './fullExportEngine/meSpeakEngine'
import { WebSpeechEngine } from './liteSpeechEngine/webSpeechEngine'

// All available TTS engines
const allEngines: TtsEngine[] = [
  new SamTtsEngine(),
  new MeSpeakTtsEngine(),
  new PiperTtsEngine(),
  new WebSpeechEngine(),
]

// Cache for engine availability
const engineAvailability: Map<string, boolean> = new Map()

export async function getAvailableEngines(): Promise<EngineInfo[]> {
  const results: EngineInfo[] = []

  for (const engine of allEngines) {
    let available = engineAvailability.get(engine.id)
    if (available === undefined) {
      try {
        available = await engine.isAvailable()
      } catch {
        available = false
      }
      engineAvailability.set(engine.id, available)
    }

    results.push({
      id: engine.id,
      name: engine.name,
      description: engine.description,
      supportsExport: engine.supportsExport,
      available,
    })
  }

  return results
}

export function getEngineById(id: string): TtsEngine | null {
  return allEngines.find((e) => e.id === id) || null
}

export async function getDefaultEngine(): Promise<TtsEngine | null> {
  // Prefer SAM as it's lightweight and always works
  for (const engine of allEngines) {
    if (engine.supportsExport) {
      let available = engineAvailability.get(engine.id)
      if (available === undefined) {
        try {
          available = await engine.isAvailable()
        } catch {
          available = false
        }
        engineAvailability.set(engine.id, available)
      }
      if (available) {
        return engine
      }
    }
  }

  // Fall back to Web Speech API for preview
  const webSpeech = allEngines.find((e) => e.id === 'webspeech')
  if (webSpeech && (await webSpeech.isAvailable())) {
    return webSpeech
  }

  return null
}

// Re-export for backwards compatibility
export async function getAvailableEngine(): Promise<TtsEngine | null> {
  return getDefaultEngine()
}
