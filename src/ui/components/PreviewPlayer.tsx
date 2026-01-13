import { useState, useEffect, useCallback, useRef } from 'react'
import { TtsEngine, Voice, TtsOptions } from '../../tts/engine'
import { pcmToWav } from '../../audio/pcm'

interface PreviewPlayerProps {
  text: string
  engine: TtsEngine | null
  voice: Voice | null
  rate: number
  pitch: number
  disabled: boolean
}

// Get first ~25 words for preview
function getPreviewText(text: string): string {
  const words = text.trim().split(/\s+/)
  const previewWords = words.slice(0, 25)
  return previewWords.join(' ')
}

export function PreviewPlayer({ text, engine, voice, rate, pitch, disabled }: PreviewPlayerProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const previewText = getPreviewText(text)
  const wordCount = previewText.split(/\s+/).length

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const handlePreview = useCallback(async () => {
    if (!engine || !voice || !previewText.trim()) return

    // Clean up previous audio
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }

    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    setIsGenerating(true)
    setError(null)
    abortControllerRef.current = new AbortController()

    try {
      const options: TtsOptions = {
        voice,
        rate,
        pitch,
      }

      const audio = await engine.synthesizeToPcm(
        previewText,
        options,
        () => {}, // No progress tracking for preview
        abortControllerRef.current.signal
      )

      // Convert PCM to WAV
      const wavBlob = pcmToWav(audio)
      const url = URL.createObjectURL(wavBlob)
      setAudioUrl(url)

      // Auto-play when ready
      if (audioRef.current) {
        audioRef.current.load()
        audioRef.current.play().catch((e) => {
          console.error('Failed to play preview:', e)
          setError('Failed to play audio')
        })
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Preview generation failed:', error)
        setError('Failed to generate preview')
      }
    } finally {
      setIsGenerating(false)
    }
  }, [engine, voice, previewText, rate, pitch, audioUrl])

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsGenerating(false)
  }, [])

  const canPreview = !disabled && engine && voice && previewText.trim().length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={isGenerating ? handleStop : handlePreview}
          disabled={!canPreview && !isGenerating}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            canPreview || isGenerating
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-secondary text-secondary-foreground cursor-not-allowed opacity-50'
          }`}
          title={
            !canPreview
              ? 'Enter text and select an engine and voice to preview'
              : isGenerating
                ? 'Stop preview generation'
                : 'Preview first few words with selected voice settings'
          }
        >
          {isGenerating ? (
            <>
              <LoaderIcon />
              Generating...
            </>
          ) : (
            <>
              <PlayIcon />
              Preview First {wordCount} Words
            </>
          )}
        </button>
      </div>

      {audioUrl && (
        <div className="space-y-2">
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="w-full h-10 rounded-lg"
            preload="metadata"
          >
            Your browser does not support the audio element.
          </audio>
          <p className="text-xs text-muted-foreground">
            Preview of first {wordCount} words using selected voice settings
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {!canPreview && !isGenerating && (
        <p className="text-xs text-muted-foreground">
          Enter text and select an engine and voice to preview the first few words
        </p>
      )}
    </div>
  )
}

function PlayIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
    </svg>
  )
}

function LoaderIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  )
}
