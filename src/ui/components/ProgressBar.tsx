import { Progress } from '../../tts/engine'
import { formatBytes, formatBytesPerSecond, formatDuration } from '../../utils/format'

interface ProgressBarProps {
  progress: Progress
  elapsedTime?: number
}

export function ProgressBar({ progress, elapsedTime = 0 }: ProgressBarProps) {
  const { stageLabel, percent, currentChunk, totalChunks, stage, maybeAudioBytesHeld } = progress
  const boundedPercent = getBoundedPercent(percent)
  const maybeEtaSeconds = getEtaSeconds(boundedPercent, elapsedTime)
  const maybeRateBytesPerSecond = getRateBytesPerSecond({
    maybeAudioBytesHeld,
    elapsedTime,
    percent: boundedPercent,
    stage,
  })

  const stageColors: Record<string, string> = {
    parsing: 'bg-blue-500',
    synthesizing: 'bg-green-500',
    encoding: 'bg-purple-500',
  }

  const bgColor = stageColors[stage] || 'bg-blue-500'

  return (
    <div className="space-y-2 p-4 bg-gray-800 border border-gray-600 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">{stageLabel}</span>
        <span className="text-sm text-gray-400">{Math.round(boundedPercent)}%</span>
      </div>

      <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${bgColor} transition-all duration-200 ease-out`}
          style={{ width: `${boundedPercent}%` }}
        />
      </div>

      {(elapsedTime > 0 || maybeEtaSeconds !== null || maybeRateBytesPerSecond !== null) && (
        <div className="flex flex-wrap gap-3 text-xs text-gray-400">
          {elapsedTime > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-gray-500">Elapsed</span>
              <span className="font-mono text-gray-200">{formatDuration(elapsedTime)}</span>
            </span>
          )}
          {maybeEtaSeconds !== null && (
            <span className="flex items-center gap-1">
              <span className="text-gray-500">ETA</span>
              <span className="font-mono text-gray-200">{formatDuration(maybeEtaSeconds)}</span>
            </span>
          )}
          {maybeRateBytesPerSecond !== null && (
            <span className="flex items-center gap-1">
              <span className="text-gray-500">Rate</span>
              <span className="font-mono text-gray-200">
                {formatBytesPerSecond(maybeRateBytesPerSecond)}
              </span>
            </span>
          )}
        </div>
      )}

      {totalChunks > 1 && (
        <div className="text-xs text-gray-500 text-center">
          Chunk {currentChunk} of {totalChunks}
        </div>
      )}

      {typeof maybeAudioBytesHeld === 'number' && maybeAudioBytesHeld > 0 && (
        <div className="text-xs text-gray-500 text-center">
          Audio buffered: {formatBytes(maybeAudioBytesHeld)}
        </div>
      )}

      <div className="flex gap-2 justify-center text-xs">
        <span
          className={`px-2 py-1 rounded ${
            stage === 'parsing' ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-500'
          }`}
        >
          Parsing
        </span>
        <span
          className={`px-2 py-1 rounded ${
            stage === 'synthesizing' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-500'
          }`}
        >
          Synthesizing
        </span>
        <span
          className={`px-2 py-1 rounded ${
            stage === 'encoding' ? 'bg-purple-900 text-purple-300' : 'bg-gray-700 text-gray-500'
          }`}
        >
          Encoding
        </span>
      </div>
    </div>
  )
}

function getBoundedPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0
  return Math.min(100, Math.max(0, percent))
}

function getEtaSeconds(percent: number, elapsedTime: number): number | null {
  if (!Number.isFinite(percent) || !Number.isFinite(elapsedTime)) return null
  if (elapsedTime <= 0 || percent < 1 || percent >= 100) return null

  return (elapsedTime * (100 - percent)) / percent
}

function getRateBytesPerSecond({
  maybeAudioBytesHeld,
  elapsedTime,
  percent,
  stage,
}: {
  maybeAudioBytesHeld?: number
  elapsedTime: number
  percent: number
  stage: Progress['stage']
}): number | null {
  if (!Number.isFinite(maybeAudioBytesHeld) || !Number.isFinite(elapsedTime)) return null
  if (!maybeAudioBytesHeld || maybeAudioBytesHeld <= 0 || elapsedTime <= 0) return null

  const clampedPercent = getBoundedPercent(percent)
  const processedBytes =
    stage === 'encoding' ? (maybeAudioBytesHeld * clampedPercent) / 100 : maybeAudioBytesHeld

  if (!Number.isFinite(processedBytes) || processedBytes <= 0) return null

  return processedBytes / elapsedTime
}
