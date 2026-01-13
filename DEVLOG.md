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
