interface ControlPanelProps {
  onGenerate: () => void
  onCancel: () => void
  onDownloadMp3: () => void
  onDownloadM4b: () => void
  isGenerating: boolean
  isEncodingMp3: boolean
  isEncodingM4b: boolean
  canGenerate: boolean
  maybeDisabledReason?: string | null
  canDownload: boolean
  m4bSupported: boolean
}

export function ControlPanel({
  onGenerate,
  onCancel,
  onDownloadMp3: _onDownloadMp3,
  onDownloadM4b: _onDownloadM4b,
  isGenerating,
  isEncodingMp3,
  isEncodingM4b,
  canGenerate,
  maybeDisabledReason,
  canDownload: _canDownload,
  m4bSupported: _m4bSupported,
}: ControlPanelProps) {

  if (isGenerating) {
    return (
      <button
        onClick={onCancel}
        className="w-full h-14 rounded-xl px-10 text-lg font-semibold bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
      >
        <StopIcon />
        Cancel Generation
      </button>
    )
  }

  if (isEncodingMp3 || isEncodingM4b) {
    return (
      <button
        disabled
        className="w-full h-14 rounded-xl px-10 text-lg font-semibold bg-secondary text-secondary-foreground cursor-not-allowed flex items-center justify-center gap-2 opacity-50"
      >
        <GearIcon />
        {isEncodingMp3 ? 'Encoding MP3...' : 'Creating M4B...'}
      </button>
    )
  }

  return (
    <button
      onClick={onGenerate}
      disabled={!canGenerate}
      className={`w-full h-14 rounded-xl px-10 text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
        canGenerate
          ? 'bg-primary text-primary-foreground shadow-lg glow-effect hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
          : 'bg-secondary text-secondary-foreground cursor-not-allowed opacity-50'
      }`}
      title={!canGenerate ? maybeDisabledReason || 'Enter text and choose a voice' : ''}
    >
      <GearIcon />
      Generate Audiobook
    </button>
  )
}

function GearIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M5.25 3A2.25 2.25 0 003 5.25v9.5A2.25 2.25 0 005.25 17h9.5A2.25 2.25 0 0017 14.75v-9.5A2.25 2.25 0 0014.75 3h-9.5z" />
    </svg>
  )
}

