import { useState, useCallback, useRef, useEffect } from 'react'
import { TextInput, gettysburgAddress } from './ui/components/TextInput'
import { EngineSelector } from './ui/components/EngineSelector'
import { VoiceSelector } from './ui/components/VoiceSelector'
import { PreviewPlayer } from './ui/components/PreviewPlayer'
import { ProgressBar } from './ui/components/ProgressBar'
import { ControlPanel } from './ui/components/ControlPanel'
import { OutputInfo } from './ui/components/OutputInfo'
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

    setIsEncodingMp3(true)
    try {
      const blob = await encodeToMp3(pcmAudio, (p) => {
        setProgress({
          stage: 'encoding',
          stageLabel: 'Encoding MP3',
          percent: p,
          currentChunk: 0,
          totalChunks: 1,
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
  }, [pcmAudio])

  const handleDownloadM4b = useCallback(async () => {
    if (!pcmAudio) return

    setIsEncodingM4b(true)
    try {
      const blob = await encodeToM4b(pcmAudio, chapters, (p) => {
        setProgress({
          stage: 'encoding',
          stageLabel: 'Creating M4B',
          percent: p,
          currentChunk: 0,
          totalChunks: 1,
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
  }, [pcmAudio, chapters])

  const currentEngineInfo = engines.find(e => e.id === selectedEngineId)
  const canExport = currentEngineInfo?.supportsExport ?? false

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Text to Audiobook</h1>
        <p className="text-gray-400 mb-6">
          Convert your text to speech and download as MP3 or M4B.
          {currentEngineInfo && !currentEngineInfo.supportsExport && (
            <span className="text-yellow-400 ml-2">
              (Preview only - select an export-capable engine for downloads)
            </span>
          )}
        </p>

        <div className="space-y-6">
          <TextInput
            value={text}
            onChange={setText}
            chapterMode={chapterMode}
            onChapterModeChange={setChapterMode}
            chapters={chapters}
          />

          <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg space-y-4">
            <EngineSelector
              engines={engines}
              selectedEngineId={selectedEngineId}
              onEngineChange={handleEngineChange}
              isLoading={isLoadingEngines}
            />
          </div>

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

          <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Preview (Web Speech API)</h3>
            <PreviewPlayer
              text={text}
              voice={selectedVoice}
              rate={rate}
              pitch={pitch}
              disabled={isGenerating}
            />
          </div>

          {progress && (
            <ProgressBar progress={progress} />
          )}

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

          <OutputInfo
            pcmAudio={pcmAudio}
            mp3Blob={mp3Blob}
            m4bBlob={m4bBlob}
            engineName={selectedEngine?.name}
            supportsExport={canExport}
          />
        </div>

        <footer className="mt-12 pt-6 border-t border-gray-700 text-center text-gray-500 text-sm">
          <p>All processing happens locally in your browser. No data is uploaded.</p>
          <p className="mt-1">
            TTS Engines: SAM (1982 retro), eSpeak (multi-language), Web Speech (native)
          </p>
        </footer>
      </div>
    </div>
  )
}

export default App
