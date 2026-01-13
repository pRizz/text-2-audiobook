import { useState, useCallback, useRef, useEffect } from 'react'
import { TextInput } from './ui/components/TextInput'
import { VoiceSelector } from './ui/components/VoiceSelector'
import { ProgressBar } from './ui/components/ProgressBar'
import { ControlPanel } from './ui/components/ControlPanel'
import { OutputInfo } from './ui/components/OutputInfo'
import { TtsEngine, Voice, TtsOptions, PcmAudio, Progress, EngineMode } from './tts/engine'
import { getAvailableEngine, getEngineMode } from './tts/engineFactory'
import { encodeToMp3 } from './audio/mp3Encoder'
import { encodeToM4b, isM4bSupported } from './audio/m4bEncoder'
import { parseChapters, Chapter } from './chapters/parseChapters'

function App() {
  const [text, setText] = useState('')
  const [selectedEngine, setSelectedEngine] = useState<TtsEngine | null>(null)
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null)
  const [rate, setRate] = useState(1.0)
  const [pitch, setPitch] = useState(1.0)
  const [engineMode, setEngineMode] = useState<EngineMode>('unknown')
  const [chapterMode, setChapterMode] = useState(false)
  const [chapters, setChapters] = useState<Chapter[]>([])

  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [pcmAudio, setPcmAudio] = useState<PcmAudio | null>(null)
  const [mp3Blob, setMp3Blob] = useState<Blob | null>(null)
  const [m4bBlob, setM4bBlob] = useState<Blob | null>(null)
  const [isEncodingMp3, setIsEncodingMp3] = useState(false)
  const [isEncodingM4b, setIsEncodingM4b] = useState(false)
  const [m4bSupported, setM4bSupported] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const initEngine = async () => {
      const engine = await getAvailableEngine()
      setSelectedEngine(engine)

      const mode = await getEngineMode()
      setEngineMode(mode)

      if (engine) {
        const availableVoices = await engine.listVoices()
        setVoices(availableVoices)
        if (availableVoices.length > 0) {
          setSelectedVoice(availableVoices[0])
        }
      }

      setM4bSupported(await isM4bSupported())
    }

    initEngine()
  }, [])

  useEffect(() => {
    if (chapterMode) {
      setChapters(parseChapters(text))
    }
  }, [text, chapterMode])

  const handleGenerate = useCallback(async () => {
    if (!selectedEngine || !selectedVoice || !text.trim()) return
    if (engineMode === 'lite') return

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
  }, [selectedEngine, selectedVoice, text, rate, pitch, engineMode])

  const handlePreview = useCallback(() => {
    if (!selectedVoice || !text.trim()) return

    const utterance = new SpeechSynthesisUtterance(text.slice(0, 200))
    utterance.rate = rate
    utterance.pitch = pitch

    const webVoices = speechSynthesis.getVoices()
    const matchingVoice = webVoices.find(v => v.name === selectedVoice.id)
    if (matchingVoice) {
      utterance.voice = matchingVoice
    }

    speechSynthesis.speak(utterance)
  }, [selectedVoice, text, rate, pitch])

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort()
    speechSynthesis.cancel()
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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Text to Audiobook</h1>
        <p className="text-gray-400 mb-6">
          Convert your text to speech and download as MP3 or M4B.
          {engineMode === 'lite' && (
            <span className="text-yellow-400 ml-2">
              (Lite Mode - Preview only, export unavailable)
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

          <VoiceSelector
            voices={voices}
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            rate={rate}
            onRateChange={setRate}
            pitch={pitch}
            onPitchChange={setPitch}
            engineMode={engineMode}
          />

          {progress && (
            <ProgressBar progress={progress} />
          )}

          <ControlPanel
            onGenerate={handleGenerate}
            onPreview={handlePreview}
            onCancel={handleCancel}
            onDownloadMp3={handleDownloadMp3}
            onDownloadM4b={handleDownloadM4b}
            isGenerating={isGenerating}
            isEncodingMp3={isEncodingMp3}
            isEncodingM4b={isEncodingM4b}
            canGenerate={engineMode === 'full' && !!text.trim()}
            canDownload={!!pcmAudio}
            m4bSupported={m4bSupported}
          />

          <OutputInfo
            pcmAudio={pcmAudio}
            mp3Blob={mp3Blob}
            m4bBlob={m4bBlob}
            engineMode={engineMode}
          />
        </div>

        <footer className="mt-12 pt-6 border-t border-gray-700 text-center text-gray-500 text-sm">
          <p>All processing happens locally in your browser. No data is uploaded.</p>
        </footer>
      </div>
    </div>
  )
}

export default App
