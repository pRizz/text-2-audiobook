# Text to Audiobook

A fully frontend web application that converts text to speech and exports downloadable audio files. All processing happens locally in your browser - no data is uploaded to any server.

## Features

- **Text-to-Speech Conversion**: Convert any text to spoken audio
- **Multiple Export Formats**:
  - MP3 (required, always available)
  - M4B (experimental, requires cross-origin isolation)
- **Chapter Support**: Use `# ` prefixed lines to create chapters
- **Real Progress Tracking**: See actual progress during synthesis and encoding
- **Voice Customization**: Choose voice, speed, and pitch
- **Two Engine Modes**:
  - **Full Export Mode**: Generates PCM audio for download (requires WASM support)
  - **Lite Mode**: Preview-only using Web Speech API (fallback when full export unavailable)

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

### Deploying to GitHub Pages

This project includes a GitHub Actions workflow for automatic deployment to GitHub Pages.

1. **Fork or clone this repository**

2. **Enable GitHub Pages in repository settings**:
   - Go to Settings > Pages
   - Under "Build and deployment", select "GitHub Actions"

3. **Update base path** (if your repo name differs):
   - Edit `vite.config.ts` and change the base path to match your repository name:
     ```ts
     base: process.env.GITHUB_PAGES === 'true' ? '/your-repo-name/' : '/',
     ```

4. **Push to main branch**:
   - The GitHub Action will automatically build and deploy

5. **Access your app**:
   - Visit `https://[username].github.io/[repo-name]/`

## Engine Modes

### Full Export Mode (Default)

Uses a WASM-based TTS engine that generates actual PCM audio data. This mode:
- Supports WebGPU acceleration when available
- Falls back to WASM-only processing when WebGPU is unavailable
- Enables MP3 and M4B export

### Lite Mode (Fallback)

When the full TTS engine cannot initialize, the app falls back to Web Speech API:
- Provides text preview functionality only
- Export buttons are disabled
- Works in more browsers but cannot export audio

## Audio Formats

### MP3 (Always Available)

- Uses lamejs for in-browser MP3 encoding
- 128kbps bitrate
- Mono audio
- Progress tracking during encoding

### M4B (Experimental)

- Uses ffmpeg.wasm for AAC encoding in MP4 container
- Requires SharedArrayBuffer (cross-origin isolation)
- Supports chapter metadata
- May not work on iOS Safari

**Note**: M4B encoding requires the page to be served with specific headers:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

GitHub Pages does not support these headers by default, so M4B may only work locally.

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Full Export Mode | Yes | Yes | Partial | Yes |
| MP3 Export | Yes | Yes | Yes | Yes |
| M4B Export | Yes | Yes | No* | Yes |
| WebGPU Acceleration | Yes | No | No | Yes |

*Safari does not support SharedArrayBuffer without specific server configuration.

## Project Structure

```
src/
├── tts/
│   ├── engine.ts              # TTS engine interfaces
│   ├── engineFactory.ts       # Engine selection logic
│   ├── fullExportEngine/      # WASM-based TTS (PCM output)
│   └── liteSpeechEngine/      # Web Speech API (preview only)
├── audio/
│   ├── pcm.ts                 # PCM audio utilities
│   ├── mp3Encoder.ts          # lamejs MP3 encoding
│   └── m4bEncoder.ts          # ffmpeg.wasm M4B encoding
├── chapters/
│   └── parseChapters.ts       # Chapter parsing utilities
├── ui/
│   └── components/            # React UI components
├── types/
│   └── lamejs.d.ts            # Type declarations
├── App.tsx                    # Main application
└── main.tsx                   # Entry point
```

## Privacy

All text processing happens locally in your browser:
- No text is sent to any server
- No API keys required
- No external TTS services used
- Audio files are generated and downloaded locally

## Limitations

- **TTS Quality**: The current implementation uses a simplified audio generator. For production use, consider integrating a real WASM TTS model like Piper or Coqui.
- **M4B on iOS**: M4B encoding requires SharedArrayBuffer which has limited support on iOS Safari.
- **Long Text**: Very long texts may use significant memory. Consider using chapter mode and processing in chunks.

## Tech Stack

- **Vite** - Build tool and dev server
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **lamejs** - MP3 encoding
- **ffmpeg.wasm** - M4B encoding
- **Vitest** - Testing

## License

MIT License - see LICENSE file for details.
