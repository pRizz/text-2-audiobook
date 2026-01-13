import { EngineInfo } from '../../tts/engine'

interface EngineSelectorProps {
  engines: EngineInfo[]
  selectedEngineId: string | null
  onEngineChange: (engineId: string) => void
  isLoading: boolean
}

export function EngineSelector({
  engines,
  selectedEngineId,
  onEngineChange,
  isLoading,
}: EngineSelectorProps) {
  const availableEngines = engines.filter((e) => e.available)
  const unavailableEngines = engines.filter((e) => !e.available)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">TTS Engine</label>
        {isLoading && (
          <span className="text-xs text-gray-500 animate-pulse">Checking engines...</span>
        )}
      </div>

      <div className="grid gap-2">
        {availableEngines.map((engine) => (
          <button
            key={engine.id}
            onClick={() => onEngineChange(engine.id)}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedEngineId === engine.id
                ? 'border-blue-500 bg-blue-900/30'
                : 'border-gray-600 bg-gray-800 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-white">{engine.name}</span>
              <div className="flex gap-2">
                {engine.supportsExport ? (
                  <span className="px-2 py-0.5 text-xs rounded bg-green-900 text-green-300">
                    Export
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs rounded bg-yellow-900 text-yellow-300">
                    Preview Only
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-1">{engine.description}</p>
          </button>
        ))}
      </div>

      {unavailableEngines.length > 0 && (
        <div className="pt-2 border-t border-gray-700">
          <p className="text-xs text-gray-500 mb-2">Unavailable in this browser:</p>
          <div className="flex flex-wrap gap-2">
            {unavailableEngines.map((engine) => (
              <span
                key={engine.id}
                className="px-2 py-1 text-xs bg-gray-800 text-gray-500 rounded"
                title={engine.description}
              >
                {engine.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
