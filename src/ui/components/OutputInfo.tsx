import { useState, useEffect, useRef } from 'react'
import { PcmAudio } from '../../tts/engine'
import { formatDuration, getDurationSeconds, pcmToWav } from '../../audio/pcm'

interface OutputInfoProps {
  pcmAudio: PcmAudio | null
  mp3Blob: Blob | null
  m4bBlob: Blob | null
  engineName?: string
  supportsExport: boolean
  onDownloadMp3?: () => void
  onDownloadM4b?: () => void
  isEncodingMp3?: boolean
  isEncodingM4b?: boolean
  canDownload?: boolean
  m4bSupported?: boolean
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function OutputInfo({
  pcmAudio,
  mp3Blob,
  m4bBlob,
  engineName,
  supportsExport,
  onDownloadMp3,
  onDownloadM4b,
  isEncodingMp3 = false,
  isEncodingM4b = false,
  canDownload = false,
  m4bSupported = false,
}: OutputInfoProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Create audio URL from available sources (prefer MP3, fallback to WAV)
  useEffect(() => {
    if (mp3Blob) {
      const url = URL.createObjectURL(mp3Blob)
      setAudioUrl(url)
      return () => URL.revokeObjectURL(url)
    } else if (pcmAudio) {
      const wavBlob = pcmToWav(pcmAudio)
      const url = URL.createObjectURL(wavBlob)
      setAudioUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setAudioUrl(null)
    }
  }, [pcmAudio, mp3Blob])

  if (!pcmAudio && !mp3Blob && !m4bBlob) {
    return null
  }

  const duration = pcmAudio ? getDurationSeconds(pcmAudio) : 0
  const isBusy = isEncodingMp3 || isEncodingM4b

  return (
    <div className="glass-panel p-6 space-y-4">
      <h3 className="text-lg font-medium">Output Information</h3>

      {/* Audio Player */}
      {audioUrl && (
        <div className="pt-4 border-t border-border/50">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Preview</h4>
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="w-full h-10 rounded-lg"
            preload="metadata"
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

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

      {/* Download Buttons */}
      {pcmAudio && onDownloadMp3 && onDownloadM4b && (
        <div className="pt-4 border-t border-border/50">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Download</h4>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onDownloadMp3}
              disabled={!canDownload || isBusy}
              className={`px-4 py-2 font-medium rounded-lg transition-colors flex items-center gap-2 ${
                canDownload && !isBusy
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              <DownloadIcon />
              {isEncodingMp3 ? 'Encoding...' : 'Download MP3'}
              {mp3Blob && <span className="text-xs">({formatBytes(mp3Blob.size)})</span>}
            </button>

            <button
              onClick={onDownloadM4b}
              disabled={!canDownload || !m4bSupported || isBusy}
              className={`px-4 py-2 font-medium rounded-lg transition-colors flex items-center gap-2 ${
                canDownload && m4bSupported && !isBusy
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              <DownloadIcon />
              {isEncodingM4b ? 'Encoding...' : 'Download M4B'}
              {m4bBlob && <span className="text-xs">({formatBytes(m4bBlob.size)})</span>}
            </button>
          </div>
        </div>
      )}

      {/* Generated Files Info */}
      {(mp3Blob || m4bBlob) && !onDownloadMp3 && (
        <div className="pt-4 border-t border-border/50">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Generated Files</h4>
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
