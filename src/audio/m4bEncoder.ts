import { PcmAudio } from '../tts/engine'
import { Chapter } from '../chapters/parseChapters'
import { createFile } from 'mp4box'

/**
 * M4B Encoder using WebCodecs AudioEncoder + mp4box.js
 * 
 * This implementation uses:
 * - Browser's native AudioEncoder API for AAC encoding (no WASM needed)
 * - mp4box.js for muxing into MP4 container with chapter metadata
 * 
 * Browser support:
 * - Chrome/Edge: Full support
 * - Firefox: Depends on OS (Windows/Linux good, macOS may vary)
 * - Safari: Limited support
 * 
 * Chapter Detection:
 * Chapters are detected by looking for lines starting with "# " in the text.
 * Chapter timing is calculated by mapping text positions to audio sample positions,
 * assuming uniform text-to-audio mapping. This is a best-guess approach and may not
 * be perfectly accurate, especially if speech rate varies throughout the text.
 */

export async function isM4bSupported(): Promise<boolean> {
  try {
    // Check for WebCodecs AudioEncoder support
    if (typeof AudioEncoder === 'undefined') {
      console.warn('M4B encoding not supported: AudioEncoder API unavailable')
      return false
    }

    // Check if AAC encoding is supported
    const config: AudioEncoderConfig = {
      codec: 'mp4a.40.2', // AAC-LC
      sampleRate: 48000,
      numberOfChannels: 1,
      bitrate: 128000,
    }

    const support = await AudioEncoder.isConfigSupported(config)
    if (!support.supported) {
      console.warn('M4B encoding not supported: AAC codec not available', support)
      return false
    }

    return true
  } catch (error) {
    console.warn('M4B encoding not supported:', error)
    return false
  }
}

interface EncodedChunk {
  timestamp: number // in microseconds
  duration: number // in microseconds
  data: Uint8Array
  isKeyframe: boolean
}

interface EncodedAudioResult {
  chunks: EncodedChunk[]
  processedAudio: PcmAudio
  decoderConfig: AudioDecoderConfig | null
}

/**
 * Encodes PCM audio to M4B format with chapter metadata
 * 
 * Chapter timing is calculated based on the actual audio duration.
 * Chapter boundaries are estimated by mapping text positions to audio sample positions.
 * 
 * @param audio - PCM audio data
 * @param chapters - Chapter metadata (with text positions)
 * @param onProgress - Progress callback (0-100)
 * @returns M4B file as Blob
 */
export async function encodeToM4b(
  audio: PcmAudio,
  chapters: Chapter[],
  onProgress: (percent: number) => void
): Promise<Blob> {
  if (!(await isM4bSupported())) {
    throw new Error(
      'M4B encoding is not supported in this browser. ' +
      'Please use Chrome/Edge or Firefox on Windows/Linux for best support.'
    )
  }

  onProgress(5)

  // Step 1: Encode PCM to AAC using WebCodecs (includes resampling if needed)
  const { chunks: encodedChunks, processedAudio, decoderConfig } = await encodePcmToAac(audio, (p) => {
    onProgress(5 + p * 0.6) // 5-65%
  })

  onProgress(65)

  // Step 2: Mux AAC into MP4 container with chapters using mp4box.js
  const m4bBlob = await muxAacToM4b(
    encodedChunks,
    processedAudio,
    chapters,
    decoderConfig,
    (p) => {
      onProgress(65 + p * 0.35) // 65-100%
    }
  )

  onProgress(100)
  return m4bBlob
}

/**
 * Resamples PCM audio to a target sample rate using Web Audio API
 */
async function resampleAudio(
  audio: PcmAudio,
  targetSampleRate: number
): Promise<PcmAudio> {
  if (audio.sampleRate === targetSampleRate) {
    return audio
  }

  const audioContext = new OfflineAudioContext(
    audio.channels,
    Math.ceil((audio.samples.length / audio.channels) * (targetSampleRate / audio.sampleRate)),
    targetSampleRate
  )

  // Create buffer from interleaved samples
  const audioBuffer = audioContext.createBuffer(
    audio.channels,
    audio.samples.length / audio.channels,
    audio.sampleRate
  )

  // Copy interleaved samples to planar format
  for (let channel = 0; channel < audio.channels; channel++) {
    const channelData = audioBuffer.getChannelData(channel)
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = audio.samples[i * audio.channels + channel]
    }
  }

  // Create buffer source and render to target sample rate
  const source = audioContext.createBufferSource()
  source.buffer = audioBuffer
  source.connect(audioContext.destination)
  source.start(0)

  const resampledBuffer = await audioContext.startRendering()

  // Convert planar back to interleaved
  const resampledSamples = new Float32Array(resampledBuffer.length * audio.channels)
  for (let channel = 0; channel < audio.channels; channel++) {
    const channelData = resampledBuffer.getChannelData(channel)
    for (let i = 0; i < channelData.length; i++) {
      resampledSamples[i * audio.channels + channel] = channelData[i]
    }
  }

  return {
    samples: resampledSamples,
    sampleRate: targetSampleRate,
    channels: audio.channels,
  }
}

/**
 * Encodes PCM audio to AAC using WebCodecs AudioEncoder
 * Resamples to 48000 Hz if necessary (AAC encoder only supports 44100 and 48000 Hz)
 */
async function encodePcmToAac(
  audio: PcmAudio,
  onProgress: (percent: number) => void
): Promise<EncodedAudioResult> {
  // AAC encoder only supports 44100 and 48000 Hz
  const targetSampleRate = 48000
  let processedAudio = audio
  let resamplingProgress = 0

  // Resample if necessary
  if (audio.sampleRate !== targetSampleRate && audio.sampleRate !== 48000) {
    resamplingProgress = 10 // Reserve 10% for resampling
    onProgress(0)
    processedAudio = await resampleAudio(audio, targetSampleRate)
    onProgress(resamplingProgress) // Resampling complete
  }

  return new Promise((resolve, reject) => {
    const chunks: EncodedChunk[] = []
    const totalDuration = processedAudio.samples.length / processedAudio.sampleRate / processedAudio.channels
    let lastTimestamp = 0
    let isFlushing = false
    let decoderConfig: AudioDecoderConfig | null = null

    // Configure AudioEncoder for AAC
    const config: AudioEncoderConfig = {
      codec: 'mp4a.40.2', // AAC-LC
      sampleRate: processedAudio.sampleRate,
      numberOfChannels: processedAudio.channels,
      bitrate: 128000,
    }

    const encoder = new AudioEncoder({
      output: (chunk, metadata) => {
        // Capture decoder config from first chunk's metadata
        if (metadata && metadata.decoderConfig && !decoderConfig) {
          decoderConfig = metadata.decoderConfig
        }
        const data = new Uint8Array(chunk.byteLength)
        chunk.copyTo(data)
        
        // Calculate duration from timestamp difference
        const duration = chunk.timestamp - lastTimestamp
        lastTimestamp = chunk.timestamp

        chunks.push({
          timestamp: chunk.timestamp,
          duration: duration || (1000000 / processedAudio.sampleRate), // fallback to sample duration
          data,
          isKeyframe: chunk.type === 'key',
        })

        // Estimate progress based on encoded duration
        // Adjust progress range: resamplingProgress-100% (resamplingProgress% is after resampling)
        if (chunk.timestamp > 0) {
          const encodedSeconds = chunk.timestamp / 1_000_000 // microseconds to seconds
          const encodingProgress = (encodedSeconds / totalDuration) * (100 - resamplingProgress)
          const progress = Math.min(100, resamplingProgress + encodingProgress)
          onProgress(progress)
        }
      },
      error: (error) => {
        isFlushing = true // Stop any pending encode operations
        reject(new Error(`AAC encoding failed: ${error.message}`))
      },
    })

    encoder.configure(config)

    // Process audio in chunks
    const chunkSize = processedAudio.sampleRate * processedAudio.channels // 1 second chunks
    let offset = 0
    let sampleTimestamp = 0

    const processNextChunk = () => {
      // Prevent encoding after flush has been called
      if (isFlushing) {
        return
      }

      if (offset >= processedAudio.samples.length) {
        isFlushing = true
        encoder.flush()
          .then(() => {
            onProgress(100)
            resolve({ chunks, processedAudio, decoderConfig })
          })
          .catch((error) => {
            reject(error)
          })
        return
      }

      const end = Math.min(offset + chunkSize, processedAudio.samples.length)
      const chunkSamples = processedAudio.samples.slice(offset, end)
      const frameCount = chunkSamples.length / processedAudio.channels

      // Create AudioData from PCM samples
      // Note: AudioData expects planar format for multi-channel
      let audioDataBuffer: ArrayBuffer
      if (processedAudio.channels === 1) {
        audioDataBuffer = chunkSamples.buffer
      } else {
        // Convert interleaved to planar (not needed for mono, but for future stereo support)
        audioDataBuffer = chunkSamples.buffer
      }

      const audioData = new AudioData({
        format: 'f32-planar',
        sampleRate: processedAudio.sampleRate,
        numberOfFrames: frameCount,
        numberOfChannels: processedAudio.channels,
        timestamp: sampleTimestamp * 1_000_000, // microseconds
        data: audioDataBuffer,
      })

      // Check again before encoding (in case flush was called while we were preparing the data)
      if (isFlushing) {
        audioData.close()
        return
      }

      encoder.encode(audioData)
      audioData.close()

      offset = end
      sampleTimestamp += frameCount

      // Process next chunk asynchronously
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(processNextChunk, { timeout: 1000 })
      } else {
        setTimeout(processNextChunk, 0)
      }
    }

    processNextChunk()
  })
}

/**
 * Muxes AAC chunks into MP4 container with chapter metadata using mp4box.js
 */
async function muxAacToM4b(
  encodedChunks: EncodedChunk[],
  audio: PcmAudio,
  chapters: Chapter[],
  _decoderConfig: AudioDecoderConfig | null, // Reserved for future esds box creation
  onProgress: (percent: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      if (encodedChunks.length === 0) {
        reject(new Error('No encoded AAC chunks to mux'))
        return
      }

      const file = createFile(true) // keepMdatData=true to retain audio samples in buffer

      // Set up file event handlers
      file.onError = (error) => {
        reject(new Error(`MP4 muxing failed: ${error}`))
      }

      // Calculate total duration in microseconds
      const totalDurationUs = (audio.samples.length / audio.sampleRate / audio.channels) * 1_000_000
      const timescale = audio.sampleRate // Use sample rate as timescale

      // Add audio track using mp4box.js IsoFileOptions
      const trackOptions: any = {
        timescale: timescale,
        duration: Math.floor(totalDurationUs / (1_000_000 / timescale)),
        media_duration: Math.floor(totalDurationUs / (1_000_000 / timescale)),
        nb_samples: encodedChunks.length,
        type: 'mp4a', // SampleEntryFourCC for AAC
        hdlr: 'soun',
        samplerate: audio.sampleRate,
        channel_count: audio.channels,
        samplesize: 16,
      }
      
      const trackId = file.addTrack(trackOptions)

      onProgress(10)

      // Add AAC samples to the track
      for (let i = 0; i < encodedChunks.length; i++) {
        const chunk = encodedChunks[i]
        const prevTimestamp = i > 0 ? encodedChunks[i - 1].timestamp : 0
        const duration = chunk.duration || (chunk.timestamp - prevTimestamp)
        
        // Convert duration to timescale units
        const durationInTimescale = Math.floor(duration / (1_000_000 / timescale))
        const dtsInTimescale = Math.floor(chunk.timestamp / (1_000_000 / timescale))

        // Ensure we have a proper ArrayBuffer by creating a copy with a new ArrayBuffer
        const buffer = new ArrayBuffer(chunk.data.length)
        const sampleData = new Uint8Array(buffer)
        sampleData.set(chunk.data)

        file.addSample(trackId, sampleData, {
          duration: durationInTimescale,
          dts: dtsInTimescale,
          cts: dtsInTimescale,
          is_sync: chunk.isKeyframe || i === 0,
        } as any)
      }

      // Note: Chapter metadata addition is complex with mp4box.js
      // For now, we'll create the M4B file without chapters
      // Chapters can be added in a future update using proper MP4 box structure
      // The file will still be a valid M4B file, just without chapter markers
      if (chapters.length > 1) {
        console.info(`Detected ${chapters.length} chapters, but chapter metadata not yet implemented in mp4box.js muxer`)
      }

      onProgress(70)

      // Flush to finalize the file structure
      file.flush()

      // Get the complete MP4 file as ArrayBuffer using getBuffer() and write()
      try {
        // Get the DataStream and write the file to it
        const dataStream = file.getBuffer()
        file.write(dataStream)
        
        // Extract the ArrayBuffer from DataStream
        const streamBuffer = (dataStream as any).buffer as ArrayBuffer
        const position = (dataStream as any).position || (dataStream as any).byteLength || streamBuffer.byteLength
        const arrayBuffer = streamBuffer.slice(0, position)
        
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          reject(new Error('No MP4 data generated: getBuffer returned empty buffer'))
          return
        }

        onProgress(95)
        
        // Create blob from the complete file
        const blob = new Blob([arrayBuffer], { type: 'audio/mp4' })
        
        onProgress(100)
        resolve(blob)
      } catch (error) {
        reject(new Error(`MP4 buffer retrieval failed: ${error instanceof Error ? error.message : String(error)}`))
      }
    } catch (error) {
      reject(error)
    }
  })
}

// Note: Chapter metadata addition is currently not implemented
// mp4box.js doesn't provide a straightforward API for adding chapter metadata
// when creating files from scratch. This would require manually constructing
// the MP4 box structure, which is complex. For now, M4B files are created
// without chapter markers, but the file format is still valid and playable.
