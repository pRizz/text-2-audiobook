import { useState, useEffect, useRef } from 'react'
import { PcmAudio } from '../../tts/engine'
import { formatDuration, getDurationSeconds, pcmToWav } from '../../audio/pcm'
import { Chapter } from '../../chapters/parseChapters'
import { formatBytes } from '../../utils/format'

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
  chapters?: Chapter[]
}

function CompressionChip({
  uncompressedBytes,
  compressedBytes,
  label,
}: {
  uncompressedBytes: number
  compressedBytes: number
  label: 'MP3' | 'M4B'
}) {
  if (!Number.isFinite(uncompressedBytes) || uncompressedBytes <= 0) return null
  if (!Number.isFinite(compressedBytes) || compressedBytes <= 0) return null

  const ratio = uncompressedBytes / compressedBytes

  return (
    <div
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-800 border border-gray-600 text-xs text-gray-200"
      title={`${label} compression: ${ratio.toFixed(2)}x`}
    >
      <span className="font-medium text-gray-100">PCM</span>
      <span className="text-gray-400">{formatBytes(uncompressedBytes)}</span>
      <span className="text-gray-500">→</span>
      <span className="font-medium text-gray-100">{label}</span>
      <span className="text-gray-300">{formatBytes(compressedBytes)}</span>
    </div>
  )
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
  chapters = [],
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
  const uncompressedBytes = pcmAudio?.samples.byteLength ?? 0

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

      {(mp3Blob || m4bBlob) && pcmAudio && (
        <div className="flex flex-wrap gap-2">
          {mp3Blob && (
            <CompressionChip
              uncompressedBytes={uncompressedBytes}
              compressedBytes={mp3Blob.size}
              label="MP3"
            />
          )}
          {m4bBlob && (
            <CompressionChip
              uncompressedBytes={uncompressedBytes}
              compressedBytes={m4bBlob.size}
              label="M4B"
            />
          )}
        </div>
      )}

      {/* Download Buttons */}
      {pcmAudio && onDownloadMp3 && onDownloadM4b && (
        <div className="pt-4 border-t border-border/50">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Download</h4>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onDownloadMp3}
              disabled={!canDownload || isBusy}
              className={`px-4 py-2.5 font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
                canDownload && !isBusy
                  ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed opacity-50'
              }`}
            >
              <DownloadIcon />
              {isEncodingMp3 ? 'Encoding...' : mp3Blob ? 'Download MP3' : 'Generate MP3'}
              {mp3Blob && <span className="text-xs opacity-80">({formatBytes(mp3Blob.size)})</span>}
            </button>

            <button
              onClick={onDownloadM4b}
              disabled={!canDownload || !m4bSupported || isBusy}
              className={`px-4 py-2.5 font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
                canDownload && m4bSupported && !isBusy
                  ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed opacity-50'
              }`}
            >
              <DownloadIcon />
              {isEncodingM4b ? 'Encoding...' : m4bBlob ? 'Download M4B' : 'Generate M4B'}
              {m4bBlob && <span className="text-xs opacity-80">({formatBytes(m4bBlob.size)})</span>}
            </button>
          </div>
          {chapters.length > 1 && m4bSupported && (
            <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg text-xs text-yellow-200/80">
              <p className="font-medium mb-1">Chapter Detection Note</p>
              <p>
                Chapters are detected from lines starting with "# " in your text. 
                Chapter timing is estimated by mapping text positions to audio positions 
                (assuming uniform text-to-audio mapping). This is a best-guess approach and 
                may not be perfectly accurate, especially if speech rate varies.
              </p>
              <p className="mt-2 opacity-70">
                Note: Chapter markers are currently not embedded in the M4B file due to 
                mp4box.js API limitations. The file is still valid and playable, but chapter 
                navigation may not work in all players.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Generated Files Info */}
      {(mp3Blob || m4bBlob) && !onDownloadMp3 && (
        <div className="pt-4 border-t border-border/50">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Generated Files</h4>
          <div className="flex flex-wrap gap-4">
            {mp3Blob && (
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 border border-border/50 rounded">
                <span className="text-primary">MP3</span>
                <span className="text-muted-foreground">{formatBytes(mp3Blob.size)}</span>
              </div>
            )}
            {m4bBlob && (
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 border border-border/50 rounded">
                <span className="text-primary">M4B</span>
                <span className="text-muted-foreground">{formatBytes(m4bBlob.size)}</span>
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
