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

export function VoiceSelector(props: VoiceSelectorProps) {
  const { voices, selectedVoice, onVoiceChange } = props
  // Generate a subtitle based on the selected voice
  const getVoiceSubtitle = (voice: Voice | null): string => {
    if (!voice) return 'Select a voice'
    // Try to extract gender/accent info from name
    const name = voice.name.toLowerCase()
    if (name.includes('female') || name.includes('f)')) {
      return voice.language === 'en-GB' ? 'British, female' : 'Warm, American female'
    }
    if (name.includes('male') || name.includes('m)')) {
      return voice.language === 'en-GB' ? 'British, male' : 'Deep, American male'
    }
    return `Voice in ${voice.language}`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MicrophoneIcon />
        <h2 className="font-display font-semibold text-lg">Voice Settings</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="voice-select" className="text-sm text-muted-foreground mb-2 block">
            Voice
          </label>
          <div className="relative">
            <select
              id="voice-select"
              value={selectedVoice?.id || ''}
              onChange={(e) => {
                const voice = voices.find((v) => v.id === e.target.value)
                if (voice) onVoiceChange(voice)
              }}
              className="w-full p-3 pr-10 bg-muted/50 border border-border/50 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent appearance-none cursor-pointer"
            >
              {voices.length === 0 ? (
                <option value="">Loading voices...</option>
              ) : (
                voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name}
                  </option>
                ))
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronDownIcon />
            </div>
          </div>
          {selectedVoice && (
            <p className="text-xs text-muted-foreground mt-2">{getVoiceSubtitle(selectedVoice)}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function MicrophoneIcon() {
  return (
    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
