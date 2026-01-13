# Text to Speech Converter - Development Log

---
### Iteration 1 - 2026-01-13T10:00:00Z
**Worked on:** Initial project setup and planning
**Files changed:** PROGRESS.md, DEVLOG.md
**Tests:** N/A
**Result:** Starting fresh
**Next:** Initialize Vite + React + TypeScript project
---

### Iteration 1 (continued) - 2026-01-13T14:07:00Z
**Worked on:** Complete implementation of Text to Audiobook converter
**Files changed:**
- package.json - Project dependencies (React, Vite, lamejs, ffmpeg.wasm, etc.)
- vite.config.ts - Vite configuration with GitHub Pages base path
- tsconfig.json - TypeScript configuration
- tailwind.config.js, postcss.config.js - Tailwind setup
- eslint.config.js, .prettierrc - Linting/formatting
- index.html - Entry HTML
- src/main.tsx - React entry point
- src/App.tsx - Main application component
- src/index.css - Global styles with Tailwind
- src/tts/engine.ts - TTS engine interfaces (Voice, TtsOptions, PcmAudio, Progress, TtsEngine)
- src/tts/engineFactory.ts - Engine selection logic
- src/tts/liteSpeechEngine/webSpeechEngine.ts - Web Speech API for preview
- src/tts/fullExportEngine/piperEngine.ts - WASM-based TTS with WebGPU detection
- src/audio/pcm.ts - PCM audio utilities (concatenate, WAV export, formatting)
- src/audio/mp3Encoder.ts - lamejs-based MP3 encoding
- src/audio/m4bEncoder.ts - ffmpeg.wasm-based M4B encoding
- src/chapters/parseChapters.ts - Chapter parsing from # markers
- src/chapters/parseChapters.test.ts - Chapter parsing tests
- src/audio/pcm.test.ts - PCM utility tests
- src/ui/components/*.tsx - UI components (TextInput, VoiceSelector, ProgressBar, ControlPanel, OutputInfo)
- src/types/lamejs.d.ts - Type declarations for lamejs
- src/vite-env.d.ts - Vite and WebGPU type declarations
- vitest.config.ts - Vitest configuration
- .github/workflows/deploy.yml - GitHub Actions for Pages deployment
- README.md - Complete documentation
**Tests:** 25 passing (chapter parsing, PCM utilities)
**Result:** Success - build passes, tests pass
**Next:** Final verification
---

### Iteration 2 - 2026-01-13T14:25:00Z
**Worked on:** Multiple TTS engines and preview controls
**Files changed:**
- package.json - Added sam-js and mespeak dependencies
- src/tts/engine.ts - Extended TtsEngine interface with id, description, supportsExport
- src/tts/engineFactory.ts - Rewrote to support multiple engines with getAvailableEngines(), getEngineById()
- src/tts/fullExportEngine/samEngine.ts - NEW: SAM (1982 retro) TTS engine
- src/tts/fullExportEngine/meSpeakEngine.ts - NEW: eSpeak-based multilingual TTS
- src/tts/fullExportEngine/piperEngine.ts - Updated interface
- src/tts/liteSpeechEngine/webSpeechEngine.ts - Updated interface
- src/ui/components/EngineSelector.tsx - NEW: Engine selection UI with descriptions
- src/ui/components/PreviewPlayer.tsx - NEW: Preview with play/pause/stop controls
- src/ui/components/VoiceSelector.tsx - Updated props
- src/ui/components/ControlPanel.tsx - Removed preview button (moved to PreviewPlayer)
- src/ui/components/OutputInfo.tsx - Updated props
- src/App.tsx - Integrated new engine selector and preview player
- src/types/sam-js.d.ts - NEW: Type declarations for sam-js
**Tests:** 25 passing
**Result:** Success - multiple TTS engines working, preview controls added
**Next:** Consider web worker for TTS synthesis
---
