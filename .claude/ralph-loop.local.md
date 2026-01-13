---
active: true
iteration: 1
max_iterations: 50
completion_promise: "TEXT_TO_SPEECH_CONVERTER_COMPLETE"
started_at: "2026-01-13T19:55:33Z"
---


You are Claude Code running in “Ralph Wiggum loop” mode. Build a complete, working, frontend-only web app in a fresh GitHub repo. It must build and deploy to GitHub Pages using GitHub Actions. No backend. No paid APIs. No external services. Use npm packages only. Use TypeScript.

High-level goal
Create a web app that takes user-entered text and converts it to speech and exports downloadable audio. The user can choose voice + speaking rate (and pitch if supported). Output: MP3 (required) and M4B (experimental). WebGPU is allowed but MUST have a WASM-only fallback. There must be a visible progress bar during generation/encoding.

## Progress Tracking (CRITICAL)
Maintain PROGRESS.md in repo root. Update at START of each iteration:

# Text to Speech Converter Progress

## Current Status
- Phase: [1-5]
- Iteration: [N]
- Last Updated: [timestamp]

## Completed
- [x] Task description

## In Progress
- [ ] Current task

## Blocked
- Issue description (if any)

## Next Steps
- What comes after current task

---

Also append to DEVLOG.md at end of each iteration:
---
### Iteration [N] - [timestamp]
**Worked on:** [description]
**Files changed:** [list]
**Tests:** [pass/fail/skipped]
**Result:** [success/partial/blocked]
**Next:** [plan]
---

Commit after each meaningful milestone:
- Use conventional commits (feat:, fix:, refactor:, docs:)
- Commit PROGRESS.md and DEVLOG.md with code changes

# Text to Speech Converter Requirements

Hard constraints
- Fully front-end. No server, no keys, no external TTS APIs.
- Must work on modern Chrome and Safari as much as possible.
- Deployable on GitHub Pages via GitHub Actions (build output to /dist).
- Must not ship broken placeholder code: build must pass.

Architecture requirements
- Use Vite + React + TypeScript.
- Create a clean engine abstraction:
  interface TtsEngine {
    name: string;
    isAvailable(): Promise<boolean>;
    listVoices(): Promise<Voice[]>;
    synthesizeToPcm(text: string, opts: TtsOptions, onProgress: (p: Progress) => void, signal: AbortSignal): Promise<PcmAudio>;
  }
- Implement engine selection:
  1) Prefer “Full Export Mode” engine that can produce PCM in-browser.
     - WebGPU path if available (faster) AND a WASM-only fallback (slower).
  2) If no PCM-capable engine can run, fall back to “Lite Mode”:
     - Web Speech API for preview playback only
     - Export buttons disabled, with clear UI text explaining why.

Audio pipeline requirements
- MP3 export (required):
  - Encode PCM -> MP3 in the browser using a suitable npm library (e.g., lamejs or better-maintained equivalent).
  - Run encoding in a Web Worker to keep UI responsive.
- M4B export (experimental but attempt it):
  - Use ffmpeg.wasm in a worker (or similar) to wrap/transcode to AAC in MP4 container and save as .m4b.
  - If ffmpeg.wasm is too heavy or unreliable on iOS Safari, still ship the feature behind a toggle with clear warning; do not break MP3.
- If generating one format makes the other easy:
  - Preferred: generate PCM once, then allow “Download as MP3” and “Download as M4B” buttons without re-running TTS.
  - If M4B generation requires extra processing, do it from the stored PCM (not from re-synthesizing).

Progress bar requirements (must be real, not fake)
- Show a progress bar that updates through stages:
  1) Text parsing / chapter splitting
  2) TTS synthesis (per chunk or per chapter)
  3) MP3 encoding
  4) (Optional) M4B packaging/transcode
- Progress must reflect actual work:
  - For synthesis: update per chunk/chapter completed and estimate remaining from total chunks.
  - For encoding: update by frames/blocks encoded.
  - For ffmpeg: parse ffmpeg log or report coarse steps (start/transcode/finish) with intermediate milestones.
- Show current stage label and percentage.
- Provide a Cancel button using AbortController that stops synthesis/encoding and cleans up memory.

UI requirements
Single page app with:
- Text area input
- TTS Engine picker (at least 2 engines if possible; otherwise one plus explanation)
- Voice picker (at least 2 voices if possible; otherwise one plus explanation)
- Rate slider; pitch slider if supported by engine
- “Preview” button (works in both Full Export and Lite Mode)
- One “Generate” button that produces PCM and enables downloads when done OR two buttons:
  - “Generate MP3” and “Generate M4B”
  But prefer: one Generate -> then Download as MP3 / Download as M4B buttons.
- Download buttons disabled until generation completes.
- Output info: duration estimate, sample rate, file sizes, mode (Full Export vs Lite).
- Chapter mode:
  - If user selects chapter mode, show a checkbox to enable it. Explain that it will split the text into chapters based on what what we've discussed or perhaps provide reasonable options.
  - If lines start with “# ” treat as chapter markers.
  - Allow “Single file” concatenation.
  - Optionally allow “Per-chapter files” zipped download (use an npm zip library).

Performance & compatibility requirements
- Must support WebGPU when available but never require it.
- Must have WASM-only fallback path for synthesis.
- Use chunking:
  - Split long text into manageable segments (e.g., 1–3 sentences per chunk or N characters).
  - Provide warnings for very long text and recommend chapters.
- Avoid building massive arrays:
  - Use typed arrays, incremental concatenation, or chunk lists.
- Use workers for heavy tasks (encoding/ffmpeg).
- Ensure Safari doesn’t crash:
  - Keep default chunk sizes conservative.
  - Include “Low memory mode” toggle if needed.
- Have reasonable default values for the UI.

Repo structure
- src/
  - tts/
    - engine.ts (interfaces/types)
    - fullExportEngine/ (webgpu + wasm fallback)
    - liteSpeechEngine/ (web speech preview only)
  - audio/
    - pcm.ts
    - mp3Encoder.worker.ts
    - m4bEncoder.worker.ts
    - wav.ts (optional for debug)
  - chapters/
    - parseChapters.ts
  - ui/
    - components
- Add ESLint + Prettier.
- Prefer Shadcn UI for components.
- Add basic unit tests (Vitest) for:
  - Chapter parsing
  - Concatenation logic
  - File naming/sanitization

GitHub Pages deployment
- Add a workflow that builds and deploys to GitHub Pages on push to main:
  - Use actions/upload-pages-artifact and actions/deploy-pages.
- Configure Vite base path correctly for Pages:
  - Read from env or set base in vite.config.ts with repo-name placeholder and README instructions.
- README must explain:
  - How to run locally
  - How to deploy to Pages
  - Engine modes + limitations (esp. iOS + ffmpeg.wasm)
  - Privacy note: all local, no uploads.

TTS engine implementation guidance (important)
- Use a local, open-source TTS model runnable in-browser via npm (WASM, optionally WebGPU acceleration).
- If a high-quality model is too heavy, ship something smaller that works reliably.
- If you cannot find a viable npm TTS model that runs client-side, you MUST still ship the app with Lite Mode preview only, and clearly show export disabled.
- But make a best effort to implement Full Export Mode with actual PCM output.

Process (Ralph Wiggum loop)
1) Start with a checklist plan.
2) Create repo structure and implement incrementally.
3) Ensure npm install, build, and tests pass.
4) Verify Pages base path works.
5) No broken imports. No TODOs that break build.

Final UX detail requested by user (must implement)
- WebGPU ok with fallback to WASM.
- Implement a real progress bar during conversion.
- Prefer one Generate action that produces PCM once, then enable:
  - “Download as MP3”
  - “Download as M4B”
  If M4B requires extra time, show progress again but do not re-run TTS.

## On Start
Read PROGRESS.md and DEVLOG.md if they exist. Resume from where you left off. Do not redo completed work.

## If stuck after 40 iterations
- Document what's blocking in PROGRESS.md
- List components that ARE working
- Commit current state
- Suggest manual intervention needed

Output <promise> TEXT_TO_SPEECH_CONVERTER_COMPLETE </promise> when all success criteria verified.

