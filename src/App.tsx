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
import { TtsEngine, Voice, TtsOptions, PcmAudio, Progress, EngineInfo } from './tts/engine'
import { getAvailableEngines, getEngineById, getDefaultEngine } from './tts/engineFactory'
import { encodeToMp3 } from './audio/mp3Encoder'
import { encodeToM4b, isM4bSupported } from './audio/m4bEncoder'
import { parseChapters, Chapter } from './chapters/parseChapters'

function App() {
  const [text, setText] = useState(gettysburgAddress.trim())

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


  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [pcmAudio, setPcmAudio] = useState<PcmAudio | null>(null)
  const [mp3Blob, setMp3Blob] = useState<Blob | null>(null)
  const [m4bBlob, setM4bBlob] = useState<Blob | null>(null)
  const [isEncodingMp3, setIsEncodingMp3] = useState(false)
  const [isEncodingM4b, setIsEncodingM4b] = useState(false)
  const [m4bSupported, setM4bSupported] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

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

    setIsGenerating(true)
    setPcmAudio(null)
    setMp3Blob(null)
    setM4bBlob(null)
    abortControllerRef.current = new AbortController()

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
  }, [selectedEngine, selectedVoice, text, rate, pitch])

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const handleDownloadMp3 = useCallback(async () => {
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
  }, [pcmAudio, mp3Blob])

  const handleDownloadM4b = useCallback(async () => {
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
  }, [pcmAudio, chapters, m4bBlob])

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

            {/* Progress Bar */}
            {progress && (
              <div className="mt-6">
                <ProgressBar progress={progress} />
              </div>
            )}

            {/* Output Info - Show after generation */}
            {pcmAudio && (
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
              <EngineSelector
                engines={engines}
                selectedEngineId={selectedEngineId}
                onEngineChange={handleEngineChange}
                isLoading={isLoadingEngines}
              />
              <div className="pt-4 border-t border-border/50">
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

export default App
