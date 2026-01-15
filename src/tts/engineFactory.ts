import { TtsEngine, EngineInfo } from './engine'
import { PiperTtsEngine } from './fullExportEngine/piperEngine'
import { SamTtsEngine } from './fullExportEngine/samEngine'
import { MeSpeakTtsEngine } from './fullExportEngine/meSpeakEngine'
import { KokoroTtsEngine } from './fullExportEngine/kokoroEngine'
import { HeadTtsEngine } from './fullExportEngine/headTtsEngine'
import { WebSpeechEngine } from './liteSpeechEngine/webSpeechEngine'

// All available TTS engines
// Order matters - first available export-capable engine is the default
const allEngines: TtsEngine[] = [
  new KokoroTtsEngine(), // Best quality, neural TTS
  new HeadTtsEngine(), // Neural TTS with timestamps
  new SamTtsEngine(), // Lightweight retro TTS
  new MeSpeakTtsEngine(), // Multi-language support
  new PiperTtsEngine(), // Placeholder
  new WebSpeechEngine(), // Preview only
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
  // Prefer the first available export-capable engine in priority order.
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

  return null
}

// Re-export for backwards compatibility
export async function getAvailableEngine(): Promise<TtsEngine | null> {
  return getDefaultEngine()
}
