# Text to Audiobook

A fully frontend web application that converts text to speech and exports downloadable audio files. All processing happens locally in your browser - no data is uploaded to any server.

## Features

- **Multiple TTS Engines**: Choose from several text-to-speech engines
- **Multiple Export Formats**:
  - MP3 (required, always available)
  - M4B (experimental, requires cross-origin isolation)
- **Chapter Support**: Use `# ` prefixed lines to create chapters
- **Real Progress Tracking**: See actual progress during synthesis and encoding
- **Voice Customization**: Choose voice, speed, and pitch
- **Preview Controls**: Play, pause, and stop preview playback

## TTS Engines

The app supports multiple TTS engines that you can switch between:

### SAM (Software Automatic Mouth) - Recommended
- **Type**: Retro speech synthesizer from 1982
- **Quality**: Classic robotic voice (nostalgic!)
- **Export**: Yes - generates PCM audio
- **Voices**: 6 presets (Default, Elf, Robot, Old Lady, E.T., Stuffy)
- **Size**: ~10KB - extremely lightweight
- **Languages**: English only

### eSpeak (meSpeak)
- **Type**: Open-source formant synthesizer
- **Quality**: Robotic but clear
- **Export**: Yes - generates PCM audio
- **Voices**: 20+ languages including English, German, French, Spanish, etc.
- **Size**: ~200KB + voice files loaded on demand
- **Languages**: Multi-language support

### Piper TTS (Demo)
- **Type**: Neural TTS placeholder
- **Quality**: Demo/testing quality
- **Export**: Yes - generates test audio
- **Note**: This is a placeholder for future neural TTS integration

### Web Speech API
- **Type**: Native browser TTS
- **Quality**: Best quality (system voices)
- **Export**: No - preview only
- **Voices**: All system-installed voices
- **Languages**: Depends on OS/browser

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
| SAM Engine | Yes | Yes | Yes | Yes |
| eSpeak Engine | Yes | Yes | Yes | Yes |
| Web Speech Preview | Yes | Yes | Yes | Yes |
| MP3 Export | Yes | Yes | Yes | Yes |
| M4B Export | Yes | Yes | No* | Yes |

*Safari does not support SharedArrayBuffer without specific server configuration.

## Project Structure

```
src/
├── tts/
│   ├── engine.ts                    # TTS engine interfaces
│   ├── engineFactory.ts             # Engine selection logic
│   ├── fullExportEngine/
│   │   ├── samEngine.ts             # SAM (1982 retro) engine
│   │   ├── meSpeakEngine.ts         # eSpeak-based engine
│   │   └── piperEngine.ts           # Piper TTS placeholder
│   └── liteSpeechEngine/
│       └── webSpeechEngine.ts       # Web Speech API (preview)
├── audio/
│   ├── pcm.ts                       # PCM audio utilities
│   ├── mp3Encoder.ts                # lamejs MP3 encoding
│   └── m4bEncoder.ts                # ffmpeg.wasm M4B encoding
├── chapters/
│   └── parseChapters.ts             # Chapter parsing utilities
├── ui/
│   └── components/
│       ├── EngineSelector.tsx       # Engine selection UI
│       ├── PreviewPlayer.tsx        # Play/pause/stop controls
│       ├── VoiceSelector.tsx        # Voice & settings
│       ├── TextInput.tsx            # Text input with chapters
│       ├── ProgressBar.tsx          # Progress display
│       ├── ControlPanel.tsx         # Generate/download buttons
│       └── OutputInfo.tsx           # Audio info display
├── types/
│   ├── lamejs.d.ts                  # lamejs type declarations
│   └── sam-js.d.ts                  # sam-js type declarations
├── App.tsx                          # Main application
└── main.tsx                         # Entry point
```

## Privacy

All text processing happens locally in your browser:
- No text is sent to any server
- No API keys required
- No external TTS services used
- Audio files are generated and downloaded locally

## Limitations

- **TTS Quality**: SAM and eSpeak produce robotic voices. For higher quality, use Web Speech API preview or consider integrating a neural TTS model.
- **M4B on iOS**: M4B encoding requires SharedArrayBuffer which has limited support on iOS Safari.
- **Long Text**: Very long texts may use significant memory. Consider using chapter mode and processing in chunks.
- **eSpeak Loading**: eSpeak loads voice files from CDN on first use, which may take a moment.

## Tech Stack

- **Vite** - Build tool and dev server
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **sam-js** - SAM speech synthesizer
- **mespeak** - eSpeak port to JavaScript
- **lamejs** - MP3 encoding
- **ffmpeg.wasm** - M4B encoding
- **Vitest** - Testing

## Credits

- **SAM**: Original by Don't Ask Software (1982), JS port by [discordier](https://github.com/discordier/sam)
- **meSpeak**: eSpeak port by [Norbert Landsteiner](https://www.masswerk.at/mespeak/)
- **lamejs**: MP3 encoder by [AnthumChris](https://github.com/AnthumChris/lamejs)

## License

MIT License - see LICENSE file for details.
