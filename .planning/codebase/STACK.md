# Technology Stack

**Analysis Date:** 2026-01-20

## Languages

**Primary:**

- TypeScript 5.7.2 - All application code (`src/**/*.ts`, `src/**/*.tsx`)

**Secondary:**

- JavaScript - Configuration files (`eslint.config.js`, `postcss.config.js`)

## Runtime

**Environment:**

- Node.js 20 (CI/deployment)
- Browser (client-side application)

**Package Manager:**

- npm (native)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**

- React 18.3.1 - UI framework
- Vite 6.0.5 - Build tool and dev server

**Testing:**

- Vitest 2.1.8 - Test runner

**Build/Dev:**

- TypeScript ~5.7.2 - Type checking and compilation
- ESLint 9.17.0 - Linting
- Prettier 3.4.2 - Code formatting

## Styling

**CSS Framework:**

- Tailwind CSS 3.4.17 - Utility-first CSS
- tailwindcss-animate 1.0.7 - Animation utilities
- PostCSS 8.4.49 - CSS processing
- Autoprefixer 10.4.20 - Browser prefix handling

**Design System:**

- Custom theme with CSS variables (HSL colors)
- Dark mode enabled via `class` strategy
- Custom fonts: Inter (sans), Space Grotesk (display)

## Key Dependencies

**TTS Engines:**

- `kokoro-js` ^1.2.1 - 82M parameter neural TTS (ONNX, WebGPU/WASM)
- `@met4citizen/headtts` ^1.2.0 - Neural TTS with word timestamps
- `sam-js` ^0.3.1 - Classic 1982 SAM speech synthesizer
- `mespeak` ^2.0.2 - eSpeak-based multi-language TTS

**Audio Processing:**

- `@breezystack/lamejs` ^1.2.7 - MP3 encoding (LAME port)
- `@ffmpeg/ffmpeg` ^0.12.10 - FFmpeg WASM (available but not primary)
- `@ffmpeg/util` ^0.12.1 - FFmpeg utilities
- `mp4box` ^2.3.0 - MP4/M4B container muxing
- `jszip` ^3.10.1 - ZIP file creation for multi-part exports

**Infrastructure:**

- WebCodecs AudioEncoder API (browser native) - AAC encoding for M4B
- Web Audio API (browser native) - Audio resampling

## Configuration

**TypeScript:**

- Config: `tsconfig.json`
- Target: ES2020
- Module: ESNext with bundler resolution
- Strict mode enabled
- Path alias: `@/*` -> `./src/*`

**Build:**

- Config: `vite.config.ts`
- React plugin via `@vitejs/plugin-react`
- ES module workers
- Build-time variables: `__APP_VERSION__`, `__GIT_HASH__`, `__BUILD_DATETIME__`
- GitHub Pages base path support

**Linting:**

- Config: `eslint.config.js`
- TypeScript-ESLint with recommended rules
- React Hooks plugin
- React Refresh plugin

**Formatting:**

- Config: `.prettierrc`
- No semicolons
- Single quotes
- 2-space tabs
- ES5 trailing commas
- 100 character print width

**Testing:**

- Config: `vitest.config.ts`
- Node environment
- Test pattern: `src/**/*.test.ts`

## Platform Requirements

**Development:**

- Node.js 20+
- npm

**Production:**

- Modern browser with:
  - ES2020 support
  - WebAssembly support
  - Optional: WebGPU (accelerates Kokoro TTS)
  - Optional: WebCodecs AudioEncoder (M4B export)
- Best support: Chrome/Edge on desktop
- Partial support: Firefox, Safari

**Deployment:**

- GitHub Pages (static hosting)
- CI: GitHub Actions

## Browser API Dependencies

**Required:**

- Web Audio API - Audio playback and resampling
- Blob/URL APIs - File downloads
- WebAssembly - TTS engines

**Optional (feature-gated):**

- WebGPU - Accelerated neural TTS (falls back to WASM)
- WebCodecs AudioEncoder - M4B/AAC encoding (M4B unavailable without it)
- Web Speech API - Preview playback only (no export)

---

_Stack analysis: 2026-01-20_
