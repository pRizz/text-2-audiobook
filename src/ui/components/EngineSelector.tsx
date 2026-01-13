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
  const selectedEngine = availableEngines.find((e) => e.id === selectedEngineId)

  return (
    <div className="space-y-2">
      <label htmlFor="engine-select" className="text-sm text-muted-foreground mb-2 block">
        TTS Engine
      </label>
      <div className="relative">
        <select
          id="engine-select"
          value={selectedEngineId || ''}
          onChange={(e) => onEngineChange(e.target.value)}
          disabled={isLoading || availableEngines.length === 0}
          className="w-full p-3 pr-10 bg-muted/50 border border-border/50 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && <option value="">Loading engines...</option>}
          {!isLoading && availableEngines.length === 0 && (
            <option value="">No engines available</option>
          )}
          {availableEngines.map((engine) => (
            <option key={engine.id} value={engine.id}>
              {engine.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDownIcon />
        </div>
      </div>
      {selectedEngine && (
        <p className="text-xs text-muted-foreground">{selectedEngine.description}</p>
      )}
    </div>
  )
}

function ChevronDownIcon() {
  return (
    <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
