import { useState, useCallback, useRef, useEffect } from 'react'
import { TextInput, gettysburgAddress } from './ui/components/TextInput'
import { EngineSelector } from './ui/components/EngineSelector'
import { VoiceSelector } from './ui/components/VoiceSelector'
import { PreviewPlayer } from './ui/components/PreviewPlayer'
import { ProgressBar } from './ui/components/ProgressBar'
import { ControlPanel } from './ui/components/ControlPanel'
import { OutputInfo } from './ui/components/OutputInfo'
import { OutputFormatSelector } from './ui/components/OutputFormatSelector'
import { Footer } from './ui/components/Footer'
import { PartProgressList, PartState } from './ui/components/PartProgressList'
import { TtsEngine, Voice, TtsOptions, PcmAudio, Progress, EngineInfo } from './tts/engine'
import { getAvailableEngines, getEngineById, getDefaultEngine } from './tts/engineFactory'
import { encodeToMp3 } from './audio/mp3Encoder'
import { encodeToM4b, isM4bSupported } from './audio/m4bEncoder'
import { parseChapters, Chapter } from './chapters/parseChapters'
import { splitTextIntoParts } from './utils/textSplitter'

function App() {
  const [text, setText] = useState(gettysburgAddress.trim())
  const showEngineSelector = false // Temporarily lock to the default engine.

  // Engine state
  const [engines, setEngines] = useState<EngineInfo[]>([])
  const [selectedEngineId, setSelectedEngineId] = useState<string | null>(null)
  const [selectedEngine, setSelectedEngine] = useState<TtsEngine | null>(null)
  const [isLoadingEngines, setIsLoadingEngines] = useState(true)

  // Voice state
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null)
  const [rate, setRate] = useState(1.0)
  const [pitch, setPitch] = useState(1.0)

  // Chapter state
  const [chapterMode, setChapterMode] = useState(false)
  const [chapters, setChapters] = useState<Chapter[]>([])


  // Generation state (legacy - for single part processing)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [pcmAudio, setPcmAudio] = useState<PcmAudio | null>(null)
  const [mp3Blob, setMp3Blob] = useState<Blob | null>(null)
  const [m4bBlob, setM4bBlob] = useState<Blob | null>(null)
  const [isEncodingMp3, setIsEncodingMp3] = useState(false)
  const [isEncodingM4b, setIsEncodingM4b] = useState(false)
  const [m4bSupported, setM4bSupported] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Multi-part state
  const [parts, setParts] = useState<PartState[]>([])
  const [useMultiPart, setUseMultiPart] = useState(false)
  const partStartTimeRefs = useRef<Map<number, number>>(new Map())

  const abortControllerRef = useRef<AbortController | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // Initialize engines
  useEffect(() => {
    const initEngines = async () => {
      setIsLoadingEngines(true)

      const availableEngines = await getAvailableEngines()
      setEngines(availableEngines)

      // Select the default engine
      const defaultEngine = await getDefaultEngine()
      if (defaultEngine) {
        setSelectedEngineId(defaultEngine.id)
        setSelectedEngine(defaultEngine)

        const engineVoices = await defaultEngine.listVoices()
        setVoices(engineVoices)
        if (engineVoices.length > 0) {
          setSelectedVoice(engineVoices[0])
        }
      }

      setM4bSupported(await isM4bSupported())
      setIsLoadingEngines(false)
    }

    initEngines()
  }, [])

  // Track elapsed time during generation and encoding (legacy single-part)
  useEffect(() => {
    const isActive = isGenerating || isEncodingMp3 || isEncodingM4b

    if (isActive && startTimeRef.current === null) {
      // Start timing when any operation begins
      startTimeRef.current = Date.now()
      setElapsedTime(0)
    } else if (!isActive && startTimeRef.current !== null) {
      // Stop timing when all operations complete
      startTimeRef.current = null
      setElapsedTime(0)
    }

    if (!isActive || startTimeRef.current === null) return

    const interval = setInterval(() => {
      if (startTimeRef.current !== null) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        setElapsedTime(elapsed)
      }
    }, 100) // Update every 100ms for smooth display

    return () => clearInterval(interval)
  }, [isGenerating, isEncodingMp3, isEncodingM4b])

  // Track elapsed time for each part
  useEffect(() => {
    const activeParts = parts.filter(
      (p) =>
        p.status === 'generating' ||
        p.status === 'encoding-mp3' ||
        p.status === 'encoding-m4b'
    )

    // Start timers for newly active parts
    activeParts.forEach((partState) => {
      if (!partStartTimeRefs.current.has(partState.part.partNumber)) {
        partStartTimeRefs.current.set(partState.part.partNumber, Date.now())
      }
    })

    // Stop timers for completed parts
    parts.forEach((partState) => {
      if (
        partState.status === 'completed' ||
        partState.status === 'error'
      ) {
        partStartTimeRefs.current.delete(partState.part.partNumber)
      }
    })

    if (activeParts.length === 0) return

    const interval = setInterval(() => {
      setParts((prevParts) =>
        prevParts.map((partState) => {
          const startTime = partStartTimeRefs.current.get(
            partState.part.partNumber
          )
          if (startTime) {
            const elapsed = (Date.now() - startTime) / 1000
            return { ...partState, elapsedTime: elapsed }
          }
          return partState
        })
      )
    }, 100)

    return () => clearInterval(interval)
  }, [parts])

  // Handle engine change
  const handleEngineChange = useCallback(async (engineId: string) => {
    const engine = getEngineById(engineId)
    if (!engine) return

    setSelectedEngineId(engineId)
    setSelectedEngine(engine)

    // Reset audio when changing engine
    setPcmAudio(null)
    setMp3Blob(null)
    setM4bBlob(null)
    setParts([])
    setUseMultiPart(false)

    // Load voices for new engine
    try {
      const engineVoices = await engine.listVoices()
      setVoices(engineVoices)
      if (engineVoices.length > 0) {
        setSelectedVoice(engineVoices[0])
      } else {
        setSelectedVoice(null)
      }
    } catch (e) {
      console.error('Failed to load voices:', e)
      setVoices([])
      setSelectedVoice(null)
    }
  }, [])

  // Parse chapters when text changes
  useEffect(() => {
    if (chapterMode) {
      setChapters(parseChapters(text))
    }
  }, [text, chapterMode])

  const handleGenerate = useCallback(async () => {
    if (!selectedEngine || !selectedVoice || !text.trim()) return
    if (!selectedEngine.supportsExport) return

    abortControllerRef.current = new AbortController()

    // Split text into parts
    const textParts = splitTextIntoParts(text, 30000)
    const shouldUseMultiPart = textParts.length > 1

    setUseMultiPart(shouldUseMultiPart)

    if (shouldUseMultiPart) {
      // Multi-part processing
      setIsGenerating(true)
      const initialParts: PartState[] = textParts.map((part) => ({
        part,
        status: 'pending',
        progress: null,
        mp3Blob: null,
        m4bBlob: null,
        elapsedTime: 0,
      }))
      setParts(initialParts)
      setPcmAudio(null)
      setMp3Blob(null)
      setM4bBlob(null)

      // Process parts sequentially
      const options: TtsOptions = {
        voice: selectedVoice,
        rate,
        pitch,
      }

      try {
        for (let i = 0; i < textParts.length; i++) {
          if (abortControllerRef.current?.signal.aborted) {
            break
          }

        const part = textParts[i]
        const partNumber = part.partNumber

        // Update status to generating
        setParts((prev) =>
          prev.map((p) =>
            p.part.partNumber === partNumber
              ? { ...p, status: 'generating' as const }
              : p
          )
        )

        try {
          // Generate audio for this part
          const audio = await selectedEngine.synthesizeToPcm(
            part.text,
            options,
            (progressUpdate) => {
              setParts((prev) =>
                prev.map((p) =>
                  p.part.partNumber === partNumber
                    ? { ...p, progress: progressUpdate }
                    : p
                )
              )
            },
            abortControllerRef.current.signal
          )

          // Immediately encode to MP3 and M4B to free memory
          setParts((prev) =>
            prev.map((p) =>
              p.part.partNumber === partNumber
                ? { ...p, status: 'encoding-mp3' as const, progress: null }
                : p
            )
          )

          // Encode MP3
          const mp3Blob = await encodeToMp3(audio, (p) => {
            setParts((prev) =>
              prev.map((partState) =>
                partState.part.partNumber === partNumber
                  ? {
                      ...partState,
                      progress: {
                        stage: 'encoding',
                        stageLabel: 'Encoding MP3',
                        percent: p,
                        currentChunk: 0,
                        totalChunks: 1,
                        maybeAudioBytesHeld: audio.samples.byteLength,
                      },
                    }
                  : partState
              )
            )
          })

          // Encode M4B if supported
          let m4bBlob: Blob | null = null
          if (m4bSupported) {
            setParts((prev) =>
              prev.map((p) =>
                p.part.partNumber === partNumber
                  ? { ...p, status: 'encoding-m4b' as const }
                  : p
              )
            )

            // For multi-part, we don't have full chapters per part
            // So we pass empty chapters array
            m4bBlob = await encodeToM4b(audio, [], (p) => {
              setParts((prev) =>
                prev.map((partState) =>
                  partState.part.partNumber === partNumber
                    ? {
                        ...partState,
                        progress: {
                          stage: 'encoding',
                          stageLabel: 'Encoding M4B',
                          percent: p,
                          currentChunk: 0,
                          totalChunks: 1,
                          maybeAudioBytesHeld: audio.samples.byteLength,
                        },
                      }
                    : partState
                )
              )
            })
          }

          // Mark as completed
          setParts((prev) =>
            prev.map((p) =>
              p.part.partNumber === partNumber
                ? {
                    ...p,
                    status: 'completed' as const,
                    mp3Blob,
                    m4bBlob,
                    progress: null,
                  }
                : p
            )
          )

          // Clear audio from memory
          // (audio object will be garbage collected)
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            console.error(`TTS generation failed for part ${partNumber}:`, error)
            setParts((prev) =>
              prev.map((p) =>
                p.part.partNumber === partNumber
                  ? {
                      ...p,
                      status: 'error' as const,
                      error: error instanceof Error ? error.message : String(error),
                      progress: null,
                    }
                  : p
              )
            )
          }
        }
        }
      } finally {
        setIsGenerating(false)
      }
    } else {
      // Single part processing (legacy behavior)
      setIsGenerating(true)
      setPcmAudio(null)
      setMp3Blob(null)
      setM4bBlob(null)

      const options: TtsOptions = {
        voice: selectedVoice,
        rate,
        pitch,
      }

      try {
        const audio = await selectedEngine.synthesizeToPcm(
          text,
          options,
          setProgress,
          abortControllerRef.current.signal
        )
        setPcmAudio(audio)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('TTS generation failed:', error)
        }
      } finally {
        setIsGenerating(false)
        setProgress(null)
      }
    }
  }, [selectedEngine, selectedVoice, text, rate, pitch, m4bSupported])

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort()
    if (useMultiPart) {
      setParts((prev) =>
        prev.map((p) =>
          p.status === 'generating' ||
          p.status === 'encoding-mp3' ||
          p.status === 'encoding-m4b'
            ? { ...p, status: 'error' as const, error: 'Cancelled', progress: null }
            : p
        )
      )
    }
  }, [useMultiPart])

  const handleDownloadMp3 = useCallback(
    async (partNumber?: number) => {
      if (useMultiPart && partNumber !== undefined) {
        // Download specific part
        const partState = parts.find((p) => p.part.partNumber === partNumber)
        if (!partState?.mp3Blob) return

        const url = URL.createObjectURL(partState.mp3Blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audiobook-part-${partNumber}.mp3`
        a.click()
        URL.revokeObjectURL(url)
        return
      }

      // Legacy single-part download
      if (!pcmAudio) return

      // If blob already exists, just download it
      if (mp3Blob) {
        const url = URL.createObjectURL(mp3Blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'audiobook.mp3'
        a.click()
        URL.revokeObjectURL(url)
        return
      }

      // Otherwise, encode and download
      setIsEncodingMp3(true)
      try {
        const blob = await encodeToMp3(pcmAudio, (p) => {
          setProgress({
            stage: 'encoding',
            stageLabel: 'Encoding MP3',
            percent: p,
            currentChunk: 0,
            totalChunks: 1,
            maybeAudioBytesHeld: pcmAudio.samples.byteLength,
          })
        })
        setMp3Blob(blob)

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'audiobook.mp3'
        a.click()
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('MP3 encoding failed:', error)
      } finally {
        setIsEncodingMp3(false)
        setProgress(null)
      }
    },
    [pcmAudio, mp3Blob, useMultiPart, parts]
  )

  const handleDownloadM4b = useCallback(
    async (partNumber?: number) => {
      if (useMultiPart && partNumber !== undefined) {
        // Download specific part
        const partState = parts.find((p) => p.part.partNumber === partNumber)
        if (!partState?.m4bBlob) return

        const url = URL.createObjectURL(partState.m4bBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audiobook-part-${partNumber}.m4b`
        a.click()
        URL.revokeObjectURL(url)
        return
      }

      // Legacy single-part download
      if (!pcmAudio) return

      // If blob already exists, just download it
      if (m4bBlob) {
        const url = URL.createObjectURL(m4bBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'audiobook.m4b'
        a.click()
        URL.revokeObjectURL(url)
        return
      }

      // Otherwise, encode and download
      setIsEncodingM4b(true)
      try {
        const blob = await encodeToM4b(pcmAudio, chapters, (p) => {
          setProgress({
            stage: 'encoding',
            stageLabel: 'Creating M4B',
            percent: p,
            currentChunk: 0,
            totalChunks: 1,
            maybeAudioBytesHeld: pcmAudio.samples.byteLength,
          })
        })
        setM4bBlob(blob)

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'audiobook.m4b'
        a.click()
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('M4B encoding failed:', error)
      } finally {
        setIsEncodingM4b(false)
        setProgress(null)
      }
    },
    [pcmAudio, chapters, m4bBlob, useMultiPart, parts]
  )

  const currentEngineInfo = engines.find(e => e.id === selectedEngineId)
  const canExport = currentEngineInfo?.supportsExport ?? false

  return (
    <div className="min-h-screen bg-background waveform-bg">
      {/* Header */}
      <header className="w-full py-6 px-6 border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center glow-effect">
              <HeadphoneIcon />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              <span className="text-gradient">Text2Audiobook</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm hidden sm:block">
            Transform text into immersive audiobooks
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-5">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Text Input */}
          <div className="lg:col-span-2">
            <TextInput
              value={text}
              onChange={setText}
              chapterMode={chapterMode}
              onChapterModeChange={setChapterMode}
              chapters={chapters}
            />

            {/* Preview: Will text be split? */}
            {!useMultiPart && text.trim() && (() => {
              const previewParts = splitTextIntoParts(text, 30000)
              if (previewParts.length > 1) {
                return (
                  <div className="mt-6 glass-panel p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <InfoIcon />
                      </div>
                      <div className="flex-1 text-sm">
                        <p className="font-medium text-blue-200 mb-1">
                          Large text detected — will be split into {previewParts.length} parts
                        </p>
                        <p className="text-blue-300/80 leading-relaxed">
                          Your text is large enough that it will be automatically split into {previewParts.length} parts 
                          (~30,000 words each) to prevent browser memory errors and crashes. Each part will be processed 
                          and encoded separately, and you can download each part individually.
                        </p>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            })()}

            {/* Multi-part Progress */}
            {useMultiPart && parts.length > 0 && (
              <div className="mt-6">
                <PartProgressList
                  parts={parts}
                  onDownloadMp3={handleDownloadMp3}
                  onDownloadM4b={handleDownloadM4b}
                  m4bSupported={m4bSupported}
                />
              </div>
            )}

            {/* Single-part Progress Bar (legacy) */}
            {!useMultiPart && progress && (
              <div className="mt-6">
                <ProgressBar progress={progress} elapsedTime={elapsedTime} />
              </div>
            )}

            {/* Output Info - Show after generation (single-part only) */}
            {!useMultiPart && pcmAudio && (
              <div className="mt-6">
                <OutputInfo
                  pcmAudio={pcmAudio}
                  mp3Blob={mp3Blob}
                  m4bBlob={m4bBlob}
                  engineName={selectedEngine?.name}
                  supportsExport={canExport}
                  onDownloadMp3={handleDownloadMp3}
                  onDownloadM4b={handleDownloadM4b}
                  isEncodingMp3={isEncodingMp3}
                  isEncodingM4b={isEncodingM4b}
                  canDownload={!!pcmAudio}
                  m4bSupported={m4bSupported}
                  chapters={chapters}
                />
              </div>
            )}

            {/* Preview Player */}
            <div className="mt-6 glass-panel p-6">
              <h3 className="text-lg font-medium mb-3">Preview</h3>
              <PreviewPlayer
                text={text}
                engine={selectedEngine}
                voice={selectedVoice}
                rate={rate}
                pitch={pitch}
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* Right Column - Settings */}
          <div className="space-y-6">
            {/* Voice Settings */}
            <div className="glass-panel p-6 space-y-4 animate-fade-in">
              {showEngineSelector && (
                <EngineSelector
                  engines={engines}
                  selectedEngineId={selectedEngineId}
                  onEngineChange={handleEngineChange}
                  isLoading={isLoadingEngines}
                />
              )}
              <div className={showEngineSelector ? 'pt-4 border-t border-border/50' : ''}>
                <VoiceSelector
                  voices={voices}
                  selectedVoice={selectedVoice}
                  onVoiceChange={setSelectedVoice}
                  rate={rate}
                  onRateChange={setRate}
                  pitch={pitch}
                  onPitchChange={setPitch}
                  supportsExport={canExport}
                />
              </div>
            </div>

            {/* Output Format */}
            <div className="glass-panel p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <OutputFormatSelector m4bSupported={m4bSupported} />
            </div>

            {/* Generate Button */}
            <ControlPanel
              onGenerate={handleGenerate}
              onCancel={handleCancel}
              onDownloadMp3={handleDownloadMp3}
              onDownloadM4b={handleDownloadM4b}
              isGenerating={isGenerating}
              isEncodingMp3={isEncodingMp3}
              isEncodingM4b={isEncodingM4b}
              canGenerate={canExport && !!text.trim() && !!selectedVoice}
              canDownload={!!pcmAudio}
              m4bSupported={m4bSupported}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function HeadphoneIcon() {
  return (
    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
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

export default App
