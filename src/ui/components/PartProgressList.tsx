import { Progress } from '../../tts/engine'
import { TextPart } from '../../utils/textSplitter'
import { formatBytes } from '../../utils/format'
import { ProgressBar } from './ProgressBar'

export interface PartState {
  part: TextPart
  status: 'pending' | 'generating' | 'encoding-mp3' | 'encoding-m4b' | 'completed' | 'error'
  progress: Progress | null
  mp3Blob: Blob | null
  m4bBlob: Blob | null
  error?: string
  elapsedTime: number
}

interface PartProgressListProps {
  parts: PartState[]
  onDownloadMp3: (partNumber: number) => void
  onDownloadM4b: (partNumber: number) => void
  m4bSupported: boolean
}

export function PartProgressList({
  parts,
  onDownloadMp3,
  onDownloadM4b,
  m4bSupported,
}: PartProgressListProps) {
  if (parts.length === 0) {
    return null
  }

  const getStatusColor = (status: PartState['status']) => {
    switch (status) {
      case 'pending':
        return 'border-gray-600 bg-gray-800/50'
      case 'generating':
        return 'border-blue-500 bg-blue-900/20'
      case 'encoding-mp3':
        return 'border-purple-500 bg-purple-900/20'
      case 'encoding-m4b':
        return 'border-purple-500 bg-purple-900/20'
      case 'completed':
        return 'border-green-500 bg-green-900/20'
      case 'error':
        return 'border-red-500 bg-red-900/20'
      default:
        return 'border-gray-600 bg-gray-800/50'
    }
  }

  const getStatusLabel = (status: PartState['status']) => {
    switch (status) {
      case 'pending':
        return 'Waiting...'
      case 'generating':
        return 'Generating speech...'
      case 'encoding-mp3':
        return 'Encoding MP3...'
      case 'encoding-m4b':
        return 'Encoding M4B...'
      case 'completed':
        return 'Completed'
      case 'error':
        return 'Error'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className="space-y-4">
      {/* Info Tip */}
      <div className="glass-panel p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <InfoIcon />
          </div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-blue-200 mb-1">Why is the text split into parts?</p>
            <p className="text-blue-300/80 leading-relaxed">
              Large texts require gigabytes of memory when converted to raw, uncompressed audio, from the text-to-speech engine, which can cause browser crashes and instability. 
              By splitting the text into manageable parts (~30,000 words each), we process and encode each part separately, 
              preventing memory errors and allowing you to download each part individually.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-lg font-medium mb-4">
          Processing Parts ({parts.length} total)
        </h3>
        <div className="space-y-3">
          {parts.map((partState) => {
            const isActive =
              partState.status === 'generating' ||
              partState.status === 'encoding-mp3' ||
              partState.status === 'encoding-m4b'
            const isCompleted = partState.status === 'completed'
            const hasError = partState.status === 'error'

            return (
              <div
                key={partState.part.partNumber}
                className={`border-2 rounded-lg p-4 transition-all ${
                  isActive ? 'ring-2 ring-primary/50' : ''
                } ${getStatusColor(partState.status)}`}
              >
                {/* Part Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        isActive
                          ? 'bg-primary text-primary-foreground animate-pulse'
                          : isCompleted
                            ? 'bg-green-500 text-white'
                            : hasError
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      {partState.part.partNumber}
                    </div>
                    <div>
                      <div className="font-medium">
                        Part {partState.part.partNumber}
                        {isActive && (
                          <span className="ml-2 text-xs text-primary animate-pulse">
                            (Active)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {partState.part.wordCount.toLocaleString()} words ·{' '}
                        {partState.part.characterCount.toLocaleString()} characters
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium">{getStatusLabel(partState.status)}</div>
                </div>

                {/* Progress Bar */}
                {partState.progress && (
                  <div className="mb-3">
                    <ProgressBar progress={partState.progress} elapsedTime={partState.elapsedTime} />
                  </div>
                )}

                {/* Error Message */}
                {hasError && partState.error && (
                  <div className="mb-3 p-2 bg-red-900/30 border border-red-600/50 rounded text-sm text-red-200">
                    {partState.error}
                  </div>
                )}

                {/* Download Buttons */}
                {isCompleted && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-600/50">
                    <button
                      onClick={() => onDownloadMp3(partState.part.partNumber)}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50 flex items-center gap-2"
                    >
                      <DownloadIcon />
                      Download MP3
                      {partState.mp3Blob && (
                        <span className="text-xs opacity-70">
                          ({formatBytes(partState.mp3Blob.size)})
                        </span>
                      )}
                    </button>
                    {m4bSupported && (
                      <button
                        onClick={() => onDownloadM4b(partState.part.partNumber)}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50 flex items-center gap-2"
                      >
                        <DownloadIcon />
                        Download M4B
                        {partState.m4bBlob && (
                          <span className="text-xs opacity-70">
                            ({formatBytes(partState.m4bBlob.size)})
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}
