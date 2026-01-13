import { PcmAudio } from '../../tts/engine'
import { formatDuration, getDurationSeconds } from '../../audio/pcm'

interface OutputInfoProps {
  pcmAudio: PcmAudio | null
  mp3Blob: Blob | null
  m4bBlob: Blob | null
  engineName?: string
  supportsExport: boolean
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function OutputInfo({ pcmAudio, mp3Blob, m4bBlob, engineName, supportsExport }: OutputInfoProps) {
  if (!pcmAudio && !mp3Blob && !m4bBlob) {
    return null
  }

  const duration = pcmAudio ? getDurationSeconds(pcmAudio) : 0

  return (
    <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg space-y-3">
      <h3 className="text-lg font-medium">Output Information</h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
        {pcmAudio && (
          <>
            <div className="p-3 bg-gray-700 rounded">
              <div className="text-gray-400">Duration</div>
              <div className="text-lg font-medium">{formatDuration(duration)}</div>
            </div>

            <div className="p-3 bg-gray-700 rounded">
              <div className="text-gray-400">Sample Rate</div>
              <div className="text-lg font-medium">{pcmAudio.sampleRate.toLocaleString()} Hz</div>
            </div>

            <div className="p-3 bg-gray-700 rounded">
              <div className="text-gray-400">Channels</div>
              <div className="text-lg font-medium">
                {pcmAudio.channels === 1 ? 'Mono' : 'Stereo'}
              </div>
            </div>

            <div className="p-3 bg-gray-700 rounded">
              <div className="text-gray-400">Engine</div>
              <div
                className={`text-lg font-medium truncate ${
                  supportsExport ? 'text-green-400' : 'text-yellow-400'
                }`}
                title={engineName}
              >
                {engineName || 'Unknown'}
              </div>
            </div>
          </>
        )}
      </div>

      {(mp3Blob || m4bBlob) && (
        <div className="pt-3 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Generated Files</h4>
          <div className="flex flex-wrap gap-4">
            {mp3Blob && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-900/30 border border-green-600/50 rounded">
                <span className="text-green-300">MP3</span>
                <span className="text-gray-400">{formatBytes(mp3Blob.size)}</span>
              </div>
            )}
            {m4bBlob && (
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-900/30 border border-purple-600/50 rounded">
                <span className="text-purple-300">M4B</span>
                <span className="text-gray-400">{formatBytes(m4bBlob.size)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
