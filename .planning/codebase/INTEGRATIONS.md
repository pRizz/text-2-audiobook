# External Integrations

**Analysis Date:** 2026-01-20

## APIs & External Services

**CDN Resources:**

- jsDelivr CDN - meSpeak engine assets loaded at runtime
  - Script: `https://cdn.jsdelivr.net/npm/mespeak@2.0.2/mespeak.min.js`
  - Config: `https://cdn.jsdelivr.net/npm/mespeak@2.0.2/mespeak_config.json`
  - Voices: `https://cdn.jsdelivr.net/npm/mespeak@2.0.2/voices/{lang}.json`
  - Implementation: `src/tts/fullExportEngine/meSpeakEngine.ts`

**Hugging Face Hub:**

- Kokoro TTS model download (first-time use)
  - Model ID: `onnx-community/Kokoro-82M-v1.0-ONNX`
  - Downloaded via `kokoro-js` library
  - Cached in browser after first load
  - Implementation: `src/tts/fullExportEngine/kokoroEngine.ts`

## Data Storage

**Databases:**

- None - Client-side only application

**File Storage:**

- Browser memory only (no persistent storage)
- User downloads generated audio files

**Caching:**

- Browser cache for:
  - TTS model weights (Kokoro ONNX models)
  - meSpeak voice files
- In-memory singleton caching for loaded TTS instances

## Authentication & Identity

**Auth Provider:**

- None - No authentication required

## Monitoring & Observability

**Error Tracking:**

- None - Console logging only

**Logs:**

- `console.warn` for non-fatal TTS synthesis errors
- `console.info` for informational messages (e.g., chapter detection)

## CI/CD & Deployment

**Hosting:**

- GitHub Pages (static site)
- URL: `https://{username}.github.io/text-2-audiobook/`

**CI Pipeline:**

- GitHub Actions
- Workflow: `.github/workflows/deploy.yml`
- Trigger: Push to `main` branch (excluding markdown/LICENSE)
- Node.js 20, npm ci, build, deploy

**Build Process:**

1. `npm ci` - Install dependencies
2. `npm run build` - TypeScript compile + Vite build
3. Artifact upload to GitHub Pages

## Environment Configuration

**Required env vars:**

- None for production

**Build-time env vars:**

- `GITHUB_PAGES=true` - Sets base path for GitHub Pages deployment

**Secrets location:**

- None - No secrets required

## Webhooks & Callbacks

**Incoming:**

- None

**Outgoing:**

- None

## TTS Engine Integration Details

### Kokoro (Primary Neural TTS)

**Source:** `src/tts/fullExportEngine/kokoroEngine.ts`

**Integration Pattern:**

```typescript
const { KokoroTTS } = await import('kokoro-js')
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
  dtype: hasWebGPU ? 'fp32' : 'q8',
  device: hasWebGPU ? 'webgpu' : 'wasm',
})
const result = await tts.generate(text, { voice: voiceId })
```

**Characteristics:**

- Downloads ~82MB model on first use
- Output: 24kHz Float32 PCM
- Singleton pattern for model reuse

### HeadTTS (Neural TTS with Timestamps)

**Source:** `src/tts/fullExportEngine/headTtsEngine.ts`

**Integration Pattern:**

```typescript
const { HeadTTS } = await import('@met4citizen/headtts')
const instance = new HeadTTS({
  endpoints: ['webgpu', 'wasm'],
  languages: ['en-us', 'en-gb'],
  voices: voiceIds,
})
await instance.connect()
instance.synthesize({ input: text })
// Event-based: onmessage receives ArrayBuffer
```

**Characteristics:**

- Uses Kokoro model internally
- Provides word timestamps and visemes
- Output: 24kHz PCM (Int16 in ArrayBuffer)

### SAM (Retro TTS)

**Source:** `src/tts/fullExportEngine/samEngine.ts`

**Integration Pattern:**

```typescript
const SamJs = (await import('sam-js')).default
const sam = new SamJs({ speed, pitch, throat, mouth })
const buffer = sam.buf32(text) // Float32Array
```

**Characteristics:**

- Tiny ~10KB library
- Output: 22050Hz Float32 PCM
- 6 preset voices with different characteristics

### meSpeak (Multi-language TTS)

**Source:** `src/tts/fullExportEngine/meSpeakEngine.ts`

**Integration Pattern:**

```typescript
// Loads via script tag from CDN
window.meSpeak.loadConfig(configUrl, callback)
window.meSpeak.loadVoice(voiceUrl, callback)
const audioData = window.meSpeak.speak(text, { voice, speed, pitch, rawdata: 'array' })
```

**Characteristics:**

- 100+ language support
- Output: 22050Hz (normalized Int8 to Float32)
- CDN-hosted assets

### Web Speech API (Preview Only)

**Source:** `src/tts/liteSpeechEngine/webSpeechEngine.ts`

**Integration Pattern:**

```typescript
const voices = speechSynthesis.getVoices()
// Cannot export PCM - preview playback only
```

**Characteristics:**

- Browser native, no download
- No export capability (throws error on synthesizeToPcm)
- Uses system voices

## Audio Encoding Integrations

### MP3 Encoding (lamejs)

**Source:** `src/audio/mp3Encoder.ts`

**Integration:**

```typescript
const lamejs = await import('@breezystack/lamejs')
const encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128)
const mp3buf = encoder.encodeBuffer(int16Samples)
```

### M4B Encoding (WebCodecs + mp4box)

**Source:** `src/audio/m4bEncoder.ts`

**Integration:**

```typescript
// AAC encoding via WebCodecs
const encoder = new AudioEncoder({ output, error })
encoder.configure({ codec: 'mp4a.40.2', sampleRate: 48000, ... })
encoder.encode(audioData)

// MP4 muxing via mp4box.js
const file = createFile(true)
file.addTrack(trackOptions)
file.addSample(trackId, sampleData, options)
file.flush()
```

**Characteristics:**

- Requires WebCodecs AudioEncoder (Chrome/Edge)
- Resamples to 48kHz for AAC compatibility
- Chapter metadata not yet implemented

---

_Integration audit: 2026-01-20_
