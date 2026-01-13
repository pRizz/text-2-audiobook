import { Voice } from '../../tts/engine'

interface VoiceSelectorProps {
  voices: Voice[]
  selectedVoice: Voice | null
  onVoiceChange: (voice: Voice) => void
  rate: number
  onRateChange: (rate: number) => void
  pitch: number
  onPitchChange: (pitch: number) => void
  supportsExport: boolean
}

export function VoiceSelector({
  voices,
  selectedVoice,
  onVoiceChange,
  rate,
  onRateChange,
  pitch,
  onPitchChange,
  supportsExport,
}: VoiceSelectorProps) {
  return (
    <div className="space-y-4 p-4 bg-gray-800 border border-gray-600 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Voice Settings</h3>
        <span
          className={`px-2 py-1 text-xs rounded ${
            supportsExport
              ? 'bg-green-900 text-green-300'
              : 'bg-yellow-900 text-yellow-300'
          }`}
        >
          {supportsExport ? 'Export Enabled' : 'Preview Only'}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="voice-select" className="block text-sm font-medium text-gray-300 mb-1">
            Voice
          </label>
          <select
            id="voice-select"
            value={selectedVoice?.id || ''}
            onChange={(e) => {
              const voice = voices.find((v) => v.id === e.target.value)
              if (voice) onVoiceChange(voice)
            }}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {voices.length === 0 ? (
              <option value="">Loading voices...</option>
            ) : (
              voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} ({voice.language})
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label htmlFor="rate-slider" className="block text-sm font-medium text-gray-300 mb-1">
            Speed: {rate.toFixed(1)}x
          </label>
          <input
            id="rate-slider"
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={rate}
            onChange={(e) => onRateChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.5x</span>
            <span>1x</span>
            <span>2x</span>
          </div>
        </div>

        <div>
          <label htmlFor="pitch-slider" className="block text-sm font-medium text-gray-300 mb-1">
            Pitch: {pitch.toFixed(1)}
          </label>
          <input
            id="pitch-slider"
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={pitch}
            onChange={(e) => onPitchChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Low</span>
            <span>Normal</span>
            <span>High</span>
          </div>
        </div>
      </div>

      {!supportsExport && (
        <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded text-yellow-300 text-sm">
          <strong>Preview Only:</strong> The selected engine cannot export audio. Select SAM or eSpeak
          for audio downloads, or use Web Speech API for preview with native browser voices.
        </div>
      )}
    </div>
  )
}
