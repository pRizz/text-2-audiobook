import { Progress } from '../../tts/engine'
import { TextPart } from '../../utils/textSplitter'
import { formatBytes, formatBytesPerSecond, formatDuration } from '../../utils/format'
import { ProgressBar } from './ProgressBar'

export interface PartState {
  part: TextPart
  status: 'pending' | 'generating' | 'encoding-mp3' | 'encoding-m4b' | 'completed' | 'error'
  progress: Progress | null
  mp3Blob: Blob | null
  m4bBlob: Blob | null
  maybePcmBytes?: number
  error?: string
  elapsedTime: number
}

interface PartProgressListProps {
  parts: PartState[]
  onDownloadMp3: (partNumber: number) => void
  onDownloadM4b: (partNumber: number) => void
  m4bSupported: boolean
  overallElapsedTime?: number
}

export function PartProgressList({
  parts,
  onDownloadMp3,
  onDownloadM4b,
  m4bSupported,
  overallElapsedTime = 0,
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

  const queueSummary = getQueueSummary({
    parts,
    overallElapsedTime,
    m4bSupported,
  })

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
              Large texts require gigabytes of memory when converted to raw, uncompressed audio,
              from the text-to-speech engine, which can cause browser crashes and instability. By
              splitting the text into manageable parts (~30,000 words each), we process and encode
              each part separately, preventing memory errors and allowing you to download each part
              individually.
            </p>
          </div>
        </div>
      </div>

      {queueSummary && (
        <div className="glass-panel p-4 bg-gray-800 border border-gray-600 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Overall Progress</span>
            <span className="text-sm text-gray-400">{Math.round(queueSummary.percent)}%</span>
          </div>

          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200 ease-out"
              style={{ width: `${queueSummary.percent}%` }}
            />
          </div>

          {(queueSummary.elapsedTime > 0 ||
            queueSummary.maybeEtaSeconds !== null ||
            queueSummary.maybeRateBytesPerSecond !== null) && (
            <div className="flex flex-wrap gap-3 text-xs text-gray-400">
              {queueSummary.elapsedTime > 0 && (
                <span className="flex items-center gap-1">
                  <span className="text-gray-500">Elapsed</span>
                  <span className="font-mono text-gray-200">
                    {formatDuration(queueSummary.elapsedTime)}
                  </span>
                </span>
              )}
              {queueSummary.maybeEtaSeconds !== null && (
                <span className="flex items-center gap-1">
                  <span className="text-gray-500">ETA</span>
                  <span className="font-mono text-gray-200">
                    {formatDuration(queueSummary.maybeEtaSeconds)}
                  </span>
                </span>
              )}
              {queueSummary.maybeRateBytesPerSecond !== null && (
                <span className="flex items-center gap-1">
                  <span className="text-gray-500">Rate</span>
                  <span className="font-mono text-gray-200">
                    {formatBytesPerSecond(queueSummary.maybeRateBytesPerSecond)}
                  </span>
                </span>
              )}
            </div>
          )}

          <div className="text-xs text-gray-500 text-center">
            Parts {queueSummary.completedParts} of {queueSummary.totalParts} complete
          </div>
        </div>
      )}

      <div className="glass-panel p-6">
        <h3 className="text-lg font-medium mb-4">Processing Parts ({parts.length} total)</h3>
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
                          <span className="ml-2 text-xs text-primary animate-pulse">(Active)</span>
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
                    <ProgressBar
                      progress={partState.progress}
                      elapsedTime={partState.elapsedTime}
                    />
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

function getQueueSummary({
  parts,
  overallElapsedTime,
  m4bSupported,
}: {
  parts: PartState[]
  overallElapsedTime: number
  m4bSupported: boolean
}): {
  percent: number
  elapsedTime: number
  totalParts: number
  completedParts: number
  maybeEtaSeconds: number | null
  maybeRateBytesPerSecond: number | null
} | null {
  if (parts.length === 0) return null

  const totalWords = parts.reduce((sum, part) => sum + part.part.wordCount, 0)
  if (totalWords <= 0) return null

  const progressWeights = getPartProgressWeights(m4bSupported)
  const processedWords = parts.reduce((sum, part) => {
    const fraction = getPartProgressFraction(part, progressWeights)
    return sum + part.part.wordCount * fraction
  }, 0)

  const percent = clampPercent((processedWords / totalWords) * 100)
  const completedParts = parts.filter(
    (part) => part.status === 'completed' || part.status === 'error'
  ).length

  const maybeEtaSeconds =
    overallElapsedTime > 0 && percent >= 1 && percent < 100
      ? (overallElapsedTime * (100 - percent)) / percent
      : null

  const maybeRateBytesPerSecond = getQueueRateBytesPerSecond({
    parts,
    overallElapsedTime,
  })

  return {
    percent,
    elapsedTime: overallElapsedTime,
    totalParts: parts.length,
    completedParts,
    maybeEtaSeconds,
    maybeRateBytesPerSecond,
  }
}

function getQueueRateBytesPerSecond({
  parts,
  overallElapsedTime,
}: {
  parts: PartState[]
  overallElapsedTime: number
}): number | null {
  if (!Number.isFinite(overallElapsedTime) || overallElapsedTime <= 0) return null

  const completedBytes = parts.reduce((sum, part) => {
    if (part.status !== 'completed' && part.status !== 'error') return sum
    if (!Number.isFinite(part.maybePcmBytes)) return sum
    return sum + (part.maybePcmBytes ?? 0)
  }, 0)

  const activePart = parts.find(
    (part) =>
      part.status === 'generating' ||
      part.status === 'encoding-mp3' ||
      part.status === 'encoding-m4b'
  )

  const activeBytes = getActivePartBytes(activePart)
  const totalBytes = completedBytes + activeBytes

  if (!Number.isFinite(totalBytes) || totalBytes <= 0) return null

  return totalBytes / overallElapsedTime
}

function getActivePartBytes(part: PartState | undefined): number {
  if (!part) return 0

  if (part.status === 'generating') {
    if (Number.isFinite(part.progress?.maybeAudioBytesHeld)) {
      return part.progress?.maybeAudioBytesHeld ?? 0
    }
  }

  if (Number.isFinite(part.maybePcmBytes)) {
    return part.maybePcmBytes ?? 0
  }

  if (Number.isFinite(part.progress?.maybeAudioBytesHeld)) {
    return part.progress?.maybeAudioBytesHeld ?? 0
  }

  return 0
}

function getPartProgressWeights(m4bSupported: boolean) {
  if (!m4bSupported) {
    return {
      synth: 0.85,
      mp3: 0.15,
      m4b: 0,
    }
  }

  return {
    synth: 0.75,
    mp3: 0.15,
    m4b: 0.1,
  }
}

function getPartProgressFraction(
  part: PartState,
  weights: { synth: number; mp3: number; m4b: number }
): number {
  if (part.status === 'completed' || part.status === 'error') return 1
  if (part.status === 'pending') return 0

  const progressPercent = clampPercent(part.progress?.percent ?? 0) / 100

  if (part.status === 'generating') {
    return progressPercent * weights.synth
  }

  if (part.status === 'encoding-mp3') {
    return weights.synth + progressPercent * weights.mp3
  }

  if (part.status === 'encoding-m4b') {
    return weights.synth + weights.mp3 + progressPercent * weights.m4b
  }

  return 0
}

function clampPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0
  return Math.min(100, Math.max(0, percent))
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
