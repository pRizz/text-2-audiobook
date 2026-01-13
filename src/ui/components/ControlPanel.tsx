interface ControlPanelProps {
  onGenerate: () => void
  onCancel: () => void
  onDownloadMp3: () => void
  onDownloadM4b: () => void
  isGenerating: boolean
  isEncodingMp3: boolean
  isEncodingM4b: boolean
  canGenerate: boolean
  canDownload: boolean
  m4bSupported: boolean
}

export function ControlPanel({
  onGenerate,
  onCancel,
  onDownloadMp3,
  onDownloadM4b,
  isGenerating,
  isEncodingMp3,
  isEncodingM4b,
  canGenerate,
  canDownload,
  m4bSupported,
}: ControlPanelProps) {
  const isBusy = isGenerating || isEncodingMp3 || isEncodingM4b

  return (
    <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
      <h3 className="text-lg font-medium mb-3">Generate & Export</h3>
      <div className="flex flex-wrap gap-3">
        {/* Generate / Cancel button */}
        {isGenerating ? (
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <StopIcon />
            Cancel Generation
          </button>
        ) : (
          <button
            onClick={onGenerate}
            disabled={!canGenerate}
            className={`px-6 py-3 font-medium rounded-lg transition-colors flex items-center gap-2 ${
              canGenerate
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
            title={!canGenerate ? 'Enter text and select an export-capable engine' : ''}
          >
            <GenerateIcon />
            Generate Audio
          </button>
        )}

        {/* Download buttons */}
        <div className="flex gap-2">
          <button
            onClick={onDownloadMp3}
            disabled={!canDownload || isBusy}
            className={`px-6 py-3 font-medium rounded-lg transition-colors flex items-center gap-2 ${
              canDownload && !isBusy
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
            title={!canDownload ? 'Generate audio first' : ''}
          >
            <DownloadIcon />
            {isEncodingMp3 ? 'Encoding...' : 'Download MP3'}
          </button>

          <button
            onClick={onDownloadM4b}
            disabled={!canDownload || !m4bSupported || isBusy}
            className={`px-6 py-3 font-medium rounded-lg transition-colors flex items-center gap-2 ${
              canDownload && m4bSupported && !isBusy
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
            title={
              !m4bSupported
                ? 'M4B requires cross-origin isolation (not available in this environment)'
                : !canDownload
                  ? 'Generate audio first'
                  : ''
            }
          >
            <DownloadIcon />
            {isEncodingM4b ? 'Encoding...' : 'Download M4B'}
            {!m4bSupported && <span className="text-xs">(N/A)</span>}
          </button>
        </div>
      </div>

      {!canGenerate && (
        <p className="mt-3 text-sm text-gray-500">
          Enter text and select an export-capable engine (SAM or eSpeak) to generate audio.
        </p>
      )}
    </div>
  )
}

function GenerateIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
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
