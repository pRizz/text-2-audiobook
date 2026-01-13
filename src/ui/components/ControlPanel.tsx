interface ControlPanelProps {
  onGenerate: () => void
  onPreview: () => void
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
  onPreview,
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
    <div className="flex flex-wrap gap-3">
      {/* Generate / Cancel button */}
      {isBusy ? (
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
        >
          Cancel
        </button>
      ) : (
        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          className={`px-6 py-3 font-medium rounded-lg transition-colors ${
            canGenerate
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
          title={!canGenerate ? 'Enter text and ensure Full Export Mode is available' : ''}
        >
          Generate Audio
        </button>
      )}

      {/* Preview button */}
      <button
        onClick={onPreview}
        disabled={isBusy}
        className={`px-6 py-3 font-medium rounded-lg transition-colors ${
          isBusy
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
        }`}
      >
        Preview (First 200 chars)
      </button>

      {/* Download buttons */}
      <div className="flex gap-2">
        <button
          onClick={onDownloadMp3}
          disabled={!canDownload || isBusy}
          className={`px-6 py-3 font-medium rounded-lg transition-colors ${
            canDownload && !isBusy
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
          title={!canDownload ? 'Generate audio first' : ''}
        >
          {isEncodingMp3 ? 'Encoding...' : 'Download MP3'}
        </button>

        <button
          onClick={onDownloadM4b}
          disabled={!canDownload || !m4bSupported || isBusy}
          className={`px-6 py-3 font-medium rounded-lg transition-colors ${
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
          {isEncodingM4b ? 'Encoding...' : 'Download M4B'}
          {!m4bSupported && <span className="ml-1 text-xs">(N/A)</span>}
        </button>
      </div>
    </div>
  )
}
