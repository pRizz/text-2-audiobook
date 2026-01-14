import { Progress } from '../../tts/engine'
import { formatBytes, formatDuration } from '../../utils/format'

interface ProgressBarProps {
  progress: Progress
  elapsedTime?: number
}

export function ProgressBar({ progress, elapsedTime = 0 }: ProgressBarProps) {
  const { stageLabel, percent, currentChunk, totalChunks, stage, maybeAudioBytesHeld } = progress

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
        <div className="flex items-center gap-3">
          {elapsedTime > 0 && (
            <span className="text-sm text-gray-400 font-mono">
              ({formatDuration(elapsedTime)})
            </span>
          )}
          <span className="text-sm text-gray-400">{Math.round(percent)}%</span>
        </div>
      </div>

      <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${bgColor} transition-all duration-200 ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>

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
