import { PcmAudio } from '../tts/engine'
import { Chapter } from '../chapters/parseChapters'
import { pcmToWav } from './pcm'

// M4B Encoder using ffmpeg.wasm
// This is experimental and may not work on all browsers (especially iOS Safari)

let ffmpegInstance: unknown = null

export async function isM4bSupported(): Promise<boolean> {
  // ffmpeg.wasm requires SharedArrayBuffer which needs cross-origin isolation
  // This may not be available in all deployment contexts
  try {
    // Check for SharedArrayBuffer support
    if (typeof SharedArrayBuffer === 'undefined') {
      console.warn('M4B encoding not supported: SharedArrayBuffer unavailable')
      return false
    }

    // Check for cross-origin isolation
    if (!crossOriginIsolated) {
      console.warn('M4B encoding not supported: Cross-origin isolation required')
      return false
    }

    return true
  } catch {
    return false
  }
}

async function loadFFmpeg(): Promise<unknown> {
  if (ffmpegInstance) return ffmpegInstance

  try {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg')
    const { toBlobURL } = await import('@ffmpeg/util')

    const ffmpeg = new FFmpeg()

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    ffmpegInstance = ffmpeg
    return ffmpeg
  } catch (error) {
    console.error('Failed to load FFmpeg:', error)
    throw new Error('FFmpeg loading failed. M4B encoding is not available.')
  }
}

export async function encodeToM4b(
  audio: PcmAudio,
  chapters: Chapter[],
  onProgress: (percent: number) => void
): Promise<Blob> {
  if (!(await isM4bSupported())) {
    throw new Error('M4B encoding is not supported in this browser environment.')
  }

  onProgress(5)

  // Load FFmpeg
  const ffmpeg = (await loadFFmpeg()) as {
    writeFile: (name: string, data: Uint8Array) => Promise<void>
    exec: (args: string[]) => Promise<void>
    readFile: (name: string) => Promise<Uint8Array>
    deleteFile: (name: string) => Promise<void>
    on: (event: string, callback: (data: { progress: number }) => void) => void
  }

  onProgress(15)

  // Convert PCM to WAV
  const wavBlob = pcmToWav(audio)
  const wavData = new Uint8Array(await wavBlob.arrayBuffer())

  onProgress(25)

  // Write WAV to FFmpeg virtual filesystem
  await ffmpeg.writeFile('input.wav', wavData)

  onProgress(30)

  // Create chapter metadata file if chapters exist
  if (chapters.length > 1) {
    const metadataContent = createChapterMetadata(chapters, audio.sampleRate)
    await ffmpeg.writeFile('metadata.txt', new TextEncoder().encode(metadataContent))
  }

  // Set up progress callback
  ffmpeg.on('progress', ({ progress }) => {
    onProgress(30 + progress * 60)
  })

  // Encode to M4B (AAC in MP4 container)
  const ffmpegArgs = [
    '-i', 'input.wav',
    '-c:a', 'aac',
    '-b:a', '128k',
  ]

  if (chapters.length > 1) {
    ffmpegArgs.push('-i', 'metadata.txt', '-map_metadata', '1')
  }

  ffmpegArgs.push('-f', 'mp4', 'output.m4b')

  await ffmpeg.exec(ffmpegArgs)

  onProgress(95)

  // Read output file
  const m4bData = await ffmpeg.readFile('output.m4b')

  // Cleanup
  await ffmpeg.deleteFile('input.wav')
  await ffmpeg.deleteFile('output.m4b')
  if (chapters.length > 1) {
    await ffmpeg.deleteFile('metadata.txt')
  }

  onProgress(100)

  return new Blob([m4bData], { type: 'audio/mp4' })
}

function createChapterMetadata(chapters: Chapter[], sampleRate: number): string {
  let metadata = ';FFMETADATA1\n'

  let currentSample = 0
  for (const chapter of chapters) {
    const startTime = Math.floor((currentSample / sampleRate) * 1000)
    const durationSamples = Math.floor(chapter.text.length * 0.05 * sampleRate)
    const endTime = startTime + Math.floor((durationSamples / sampleRate) * 1000)

    metadata += `\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=${startTime}\nEND=${endTime}\ntitle=${chapter.title}\n`

    currentSample += durationSamples
  }

  return metadata
}
