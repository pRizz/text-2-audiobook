import { useState, useEffect, useCallback, useRef } from 'react'
import { Voice } from '../../tts/engine'

interface PreviewPlayerProps {
  text: string
  voice: Voice | null
  rate: number
  pitch: number
  disabled: boolean
}

export function PreviewPlayer({ text, voice, rate, pitch, disabled }: PreviewPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const textToSpeak = text.slice(0, 500) // Limit preview length

  // Track speaking progress
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (isPlaying && !isPaused) {
      interval = setInterval(() => {
        // Web Speech API doesn't give us exact position, estimate based on time
        setProgress((prev) => {
          const estimatedDuration = (textToSpeak.length / 15) * (1 / rate) // ~15 chars/sec
          const increment = (100 / estimatedDuration) * 0.1 // Update every 100ms
          return Math.min(prev + increment, 99)
        })
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isPlaying, isPaused, textToSpeak.length, rate])

  const handlePlay = useCallback(() => {
    if (!voice || !textToSpeak.trim()) return

    // Cancel any existing speech
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    utterance.rate = rate
    utterance.pitch = pitch

    // Find matching voice
    const webVoices = speechSynthesis.getVoices()
    const matchingVoice = webVoices.find((v) => v.name === voice.id)
    if (matchingVoice) {
      utterance.voice = matchingVoice
    }

    utterance.onstart = () => {
      setIsPlaying(true)
      setIsPaused(false)
      setProgress(0)
    }

    utterance.onend = () => {
      setIsPlaying(false)
      setIsPaused(false)
      setProgress(100)
      setTimeout(() => setProgress(0), 500)
    }

    utterance.onerror = () => {
      setIsPlaying(false)
      setIsPaused(false)
      setProgress(0)
    }

    utteranceRef.current = utterance
    speechSynthesis.speak(utterance)
  }, [voice, textToSpeak, rate, pitch])

  const handlePause = useCallback(() => {
    if (isPlaying && !isPaused) {
      speechSynthesis.pause()
      setIsPaused(true)
    }
  }, [isPlaying, isPaused])

  const handleResume = useCallback(() => {
    if (isPlaying && isPaused) {
      speechSynthesis.resume()
      setIsPaused(false)
    }
  }, [isPlaying, isPaused])

  const handleStop = useCallback(() => {
    speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    setProgress(0)
    utteranceRef.current = null
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel()
    }
  }, [])

  const canPlay = !disabled && voice && textToSpeak.trim().length > 0

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            disabled={!canPlay}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              canPlay
                ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
            title={!canPlay ? 'Enter text and select a voice to preview' : 'Play preview'}
          >
            <PlayIcon />
            Preview
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={handleResume}
                className="px-4 py-2 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center gap-2"
              >
                <PlayIcon />
                Resume
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="px-4 py-2 rounded-lg font-medium bg-yellow-600 hover:bg-yellow-700 text-white transition-colors flex items-center gap-2"
              >
                <PauseIcon />
                Pause
              </button>
            )}
            <button
              onClick={handleStop}
              className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2"
            >
              <StopIcon />
              Stop
            </button>
          </>
        )}
      </div>

      {isPlaying && (
        <div className="space-y-1">
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${isPaused ? 'bg-yellow-500' : 'bg-blue-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {isPaused ? 'Paused' : 'Playing preview...'} (first 500 characters)
          </p>
        </div>
      )}

      {!isPlaying && !canPlay && (
        <p className="text-xs text-gray-500">Enter text and select a voice to hear a preview</p>
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

function PauseIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M5.25 3A2.25 2.25 0 003 5.25v9.5A2.25 2.25 0 005.25 17h9.5A2.25 2.25 0 0017 14.75v-9.5A2.25 2.25 0 0014.75 3h-9.5z" />
    </svg>
  )
}
