# Architecture

**Analysis Date:** 2026-01-20

## Pattern Overview

**Overall:** Component-Based SPA with Layered Services

**Key Characteristics:**

- React-based single page application with Vite bundler
- Layered architecture separating UI, business logic (TTS engines), and audio processing
- Strategy pattern for pluggable TTS engines with common interface
- Progressive enhancement: preview mode vs. full export mode
- Browser-first: runs entirely in-browser with no backend required

## Layers

**UI Layer:**

- Purpose: User interface components and state management
- Location: `src/ui/components/`
- Contains: React components (TSX files) for input, controls, progress display, and output
- Depends on: TTS engine interfaces (`src/tts/engine.ts`), utility functions (`src/utils/`)
- Used by: `src/App.tsx`

**TTS Engine Layer:**

- Purpose: Text-to-speech synthesis abstraction and implementations
- Location: `src/tts/`
- Contains: Engine interface, factory pattern, and concrete engine implementations
- Depends on: External TTS libraries (kokoro-js, sam-js, mespeak, headtts)
- Used by: UI components for synthesis operations

**Audio Processing Layer:**

- Purpose: Audio encoding, format conversion, and manipulation
- Location: `src/audio/`
- Contains: MP3 encoder, M4B encoder, PCM utilities, WAV conversion
- Depends on: TTS engine output (`PcmAudio` type), encoding libraries (lamejs, mp4box)
- Used by: `src/App.tsx` for final output generation

**Text Processing Layer:**

- Purpose: Text parsing and manipulation utilities
- Location: `src/chapters/` and `src/utils/`
- Contains: Chapter parsing, text splitting, formatting utilities
- Depends on: None (pure functions)
- Used by: `src/App.tsx`, UI components

## Data Flow

**Full Export Flow:**

1. User enters text in `TextInput` component, stored in `App.tsx` state
2. User clicks "Generate" button in `ControlPanel`
3. `App.tsx.handleGenerate()` orchestrates the process:
   - Splits text into parts via `splitTextIntoParts()` if large (>30k words)
   - For each part, calls `selectedEngine.synthesizeToPcm()`
   - TTS engine returns `PcmAudio` (Float32Array samples + metadata)
   - Encodes to MP3 via `encodeToMp3()` from `src/audio/mp3Encoder.ts`
   - Optionally encodes to M4B via `encodeToM4b()` from `src/audio/m4bEncoder.ts`
4. Progress callbacks update UI throughout via `onProgress` callbacks
5. Completed blobs stored in component state for download

**Preview Flow:**

1. `PreviewPlayer` component receives current TTS settings
2. On preview click, calls `engine.synthesizeToPcm()` with first ~25 words
3. Converts PCM to WAV via `pcmToWav()` from `src/audio/pcm.ts`
4. Creates object URL and plays via HTML5 audio element

**State Management:**

- Local component state via React `useState` hooks in `src/App.tsx`
- No global state management library (Redux, Zustand)
- State lifted to `App.tsx` and passed down as props
- Engine singleton instances managed within engine classes

## Key Abstractions

**TtsEngine Interface:**

- Purpose: Common contract for all TTS implementations
- Examples: `src/tts/fullExportEngine/kokoroEngine.ts`, `src/tts/fullExportEngine/samEngine.ts`
- Pattern: Strategy pattern - engines are interchangeable at runtime
- Key methods: `isAvailable()`, `listVoices()`, `synthesizeToPcm()`

**PcmAudio:**

- Purpose: Intermediate audio format between TTS and encoders
- Definition: `src/tts/engine.ts`
- Structure: `{ samples: Float32Array, sampleRate: number, channels: number }`
- Pattern: Data transfer object bridging TTS output and encoder input

**Progress:**

- Purpose: Standardized progress reporting across all operations
- Definition: `src/tts/engine.ts`
- Structure: `{ stage, stageLabel, percent, currentChunk, totalChunks, maybeAudioBytesHeld }`
- Pattern: Observer pattern via callbacks

**PartState:**

- Purpose: Track multi-part processing state for large texts
- Definition: `src/ui/components/PartProgressList.tsx`
- Structure: Contains part metadata, status, progress, and output blobs
- Pattern: State object for complex async workflow

## Entry Points

**Application Entry:**

- Location: `src/main.tsx`
- Triggers: Browser page load
- Responsibilities: React DOM rendering, mounts `<App />` component

**Main Component:**

- Location: `src/App.tsx`
- Triggers: React mounting
- Responsibilities: Orchestrates entire app - engine initialization, state management, user flow coordination

**Engine Factory:**

- Location: `src/tts/engineFactory.ts`
- Triggers: App initialization, engine selection change
- Responsibilities: Creates engine instances, checks availability, provides default engine

## Error Handling

**Strategy:** Graceful degradation with user feedback

**Patterns:**

- TTS engines wrap synthesis in try/catch, log errors, continue processing other chunks
- `AbortError` handling for user cancellation (checked via `signal.aborted`)
- Engine availability checked before use via `isAvailable()` method
- UI shows error banners when no export-capable engine is available
- Part-level errors in multi-part mode isolated to individual parts

## Cross-Cutting Concerns

**Logging:** Console logging for errors/warnings (`console.error`, `console.warn`)

**Validation:**

- Text presence checked before generation (`text.trim()`)
- Engine and voice selection required for generation
- M4B support detected via WebCodecs API availability

**Progress Tracking:**

- All long-running operations report progress via callbacks
- Memory usage estimated and displayed (`maybeAudioBytesHeld`)
- Elapsed time tracked per part and overall
- ETA calculated from progress percentage

**Cancellation:**

- `AbortController` pattern used throughout
- Signal passed to all async operations
- UI provides cancel button during generation

---

_Architecture analysis: 2026-01-20_
