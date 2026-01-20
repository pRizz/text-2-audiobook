# Codebase Structure

**Analysis Date:** 2026-01-20

## Directory Layout

```
text-2-audiobook/
├── src/                    # Source code
│   ├── audio/              # Audio encoding and processing
│   ├── chapters/           # Text chapter parsing
│   ├── lib/                # Shared constants
│   ├── tts/                # TTS engine layer
│   │   ├── fullExportEngine/   # Export-capable TTS engines
│   │   └── liteSpeechEngine/   # Preview-only TTS engines
│   ├── types/              # TypeScript type declarations
│   ├── ui/                 # User interface
│   │   └── components/     # React components
│   └── utils/              # Utility functions
├── public/                 # Static assets
├── dist/                   # Build output (generated)
├── .github/                # GitHub workflows
│   └── workflows/          # CI/CD configuration
└── .planning/              # GSD planning documents
    └── codebase/           # Codebase analysis
```

## Directory Purposes

**src/audio/:**

- Purpose: Audio encoding and format conversion
- Contains: MP3 encoder, M4B encoder, PCM utilities
- Key files:
  - `mp3Encoder.ts`: MP3 encoding via lamejs
  - `m4bEncoder.ts`: M4B/AAC encoding via WebCodecs + mp4box
  - `pcm.ts`: PCM manipulation, WAV conversion

**src/chapters/:**

- Purpose: Parse text into chapters for M4B metadata
- Contains: Chapter parsing logic
- Key files:
  - `parseChapters.ts`: Detects `# ` chapter markers, calculates positions
  - `parseChapters.test.ts`: Unit tests for parser

**src/lib/:**

- Purpose: Shared application constants
- Contains: URLs, math constants
- Key files:
  - `constants.ts`: TAU, GitHub/social links

**src/tts/:**

- Purpose: Text-to-speech engine abstraction layer
- Contains: Engine interface, factory, implementations
- Key files:
  - `engine.ts`: Core interfaces (TtsEngine, Voice, PcmAudio, Progress)
  - `engineFactory.ts`: Engine instantiation, availability checking, default selection

**src/tts/fullExportEngine/:**

- Purpose: TTS engines that produce exportable PCM audio
- Contains: Kokoro, HeadTTS, SAM, meSpeak, Piper engines
- Key files:
  - `kokoroEngine.ts`: Neural TTS via kokoro-js (primary engine)
  - `headTtsEngine.ts`: Neural TTS with timestamps
  - `samEngine.ts`: Retro 1982 TTS
  - `meSpeakEngine.ts`: Multi-language eSpeak-based TTS
  - `piperEngine.ts`: Placeholder for future Piper integration

**src/tts/liteSpeechEngine/:**

- Purpose: Preview-only TTS engines (no PCM export)
- Contains: Browser Web Speech API wrapper
- Key files:
  - `webSpeechEngine.ts`: Native browser TTS for preview

**src/types/:**

- Purpose: TypeScript declarations for untyped dependencies
- Contains: `.d.ts` files for external libraries
- Key files:
  - `sam-js.d.ts`: Types for sam-js package
  - `lamejs.d.ts`: Types for @breezystack/lamejs
  - `headtts.d.ts`: Types for @met4citizen/headtts

**src/ui/components/:**

- Purpose: React UI components
- Contains: All visual components
- Key files:
  - `TextInput.tsx`: Text input area with chapter mode toggle
  - `VoiceSelector.tsx`: Voice, rate, pitch controls
  - `EngineSelector.tsx`: TTS engine selection dropdown
  - `PreviewPlayer.tsx`: Audio preview functionality
  - `ProgressBar.tsx`: Progress display with ETA
  - `PartProgressList.tsx`: Multi-part processing UI
  - `ControlPanel.tsx`: Generate/cancel/download buttons
  - `OutputInfo.tsx`: Generated audio metadata and downloads
  - `OutputFormatSelector.tsx`: MP3/M4B format info
  - `Footer.tsx`: App version and links

**src/utils/:**

- Purpose: Utility functions
- Contains: Formatting helpers, text processing
- Key files:
  - `textSplitter.ts`: Split large text into parts
  - `format.ts`: Human-friendly byte/duration formatting

## Key File Locations

**Entry Points:**

- `src/main.tsx`: React app bootstrap
- `src/App.tsx`: Main application component (~800 lines)
- `index.html`: HTML entry point

**Configuration:**

- `vite.config.ts`: Vite build configuration
- `tsconfig.json`: TypeScript configuration
- `tailwind.config.ts`: Tailwind CSS theming
- `eslint.config.js`: ESLint rules
- `vitest.config.ts`: Vitest test configuration
- `postcss.config.js`: PostCSS plugins

**Core Logic:**

- `src/tts/engine.ts`: TTS interface definitions
- `src/tts/engineFactory.ts`: Engine management
- `src/audio/mp3Encoder.ts`: MP3 encoding
- `src/audio/m4bEncoder.ts`: M4B encoding with chapters

**Testing:**

- `src/chapters/parseChapters.test.ts`: Chapter parser tests
- `src/audio/pcm.test.ts`: PCM utility tests

## Naming Conventions

**Files:**

- React components: `PascalCase.tsx` (e.g., `PreviewPlayer.tsx`)
- Non-component TS: `camelCase.ts` (e.g., `mp3Encoder.ts`)
- Tests: `*.test.ts` co-located with source
- Type declarations: `*.d.ts` in `src/types/`

**Directories:**

- Lowercase with hyphens for multi-word: Not used in this codebase
- camelCase for single words: `fullExportEngine/`, `liteSpeechEngine/`
- Singular nouns for collections: `audio/`, `chapters/`, `utils/`

**Exports:**

- Named exports preferred over default exports
- Except: `src/App.tsx` uses default export (React convention)

## Where to Add New Code

**New TTS Engine:**

1. Create `src/tts/fullExportEngine/newEngine.ts`
2. Implement `TtsEngine` interface from `src/tts/engine.ts`
3. Add to `allEngines` array in `src/tts/engineFactory.ts`

**New UI Component:**

1. Create `src/ui/components/NewComponent.tsx`
2. Import into `src/App.tsx` or parent component

**New Audio Encoder/Format:**

1. Create `src/audio/newEncoder.ts`
2. Export encoding function following `encodeToMp3` pattern
3. Integrate into `src/App.tsx` generation flow

**New Utility Function:**

1. Add to existing file in `src/utils/` if related
2. Or create new `src/utils/newUtil.ts` for distinct functionality

**New Type Declarations:**

1. Add to `src/types/package-name.d.ts`

**Tests:**

1. Create `*.test.ts` next to source file
2. Run with `npm test`

## Special Directories

**.planning/:**

- Purpose: GSD planning and codebase documentation
- Generated: By GSD mapping tools
- Committed: Yes

**dist/:**

- Purpose: Vite build output
- Generated: Yes, by `npm run build`
- Committed: No (in .gitignore except GitHub Pages deployment)

**node_modules/:**

- Purpose: npm dependencies
- Generated: Yes, by `npm install`
- Committed: No

**.github/workflows/:**

- Purpose: GitHub Actions CI/CD
- Contains: Deployment workflow for GitHub Pages
- Committed: Yes

**public/:**

- Purpose: Static assets copied to dist
- Contains: favicon.svg
- Committed: Yes

---

_Structure analysis: 2026-01-20_
