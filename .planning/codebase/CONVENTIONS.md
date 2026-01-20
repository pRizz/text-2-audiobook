# Coding Conventions

**Analysis Date:** 2026-01-20

## Naming Patterns

**Files:**

- React components: PascalCase (e.g., `VoiceSelector.tsx`, `ProgressBar.tsx`)
- Utility modules: camelCase (e.g., `textSplitter.ts`, `format.ts`)
- Test files: `{module}.test.ts` co-located with source
- Type declarations: `{library}.d.ts` in `src/types/`
- Engine implementations: camelCase with Engine suffix (e.g., `kokoroEngine.ts`, `samEngine.ts`)

**Functions:**

- camelCase for all functions (e.g., `parseChapters`, `encodeToMp3`, `formatDuration`)
- Event handlers prefixed with `handle` (e.g., `handleGenerate`, `handleCancel`, `handleEngineChange`)
- Getters prefixed with `get` (e.g., `getTextStatistics`, `getDefaultEngine`, `getAvailableEngines`)
- Boolean checks prefixed with `is` or `has` (e.g., `isAvailable`, `isM4bSupported`)

**Variables:**

- camelCase for all variables
- Prefix nullable/optional values with `maybe` (e.g., `maybeEngineUnavailableMessage`, `maybeEtaSeconds`, `maybeAudioBytesHeld`)
- Boolean state variables use `is`/`has` prefix (e.g., `isGenerating`, `isEncodingMp3`, `hasError`)
- Refs suffixed with `Ref` (e.g., `abortControllerRef`, `fileInputRef`, `startTimeRef`)

**Types:**

- PascalCase for interfaces and types (e.g., `TtsEngine`, `Voice`, `PcmAudio`, `Progress`)
- Interface names describe the entity (e.g., `TextInputProps`, `PartState`, `EngineInfo`)
- Exported interfaces for component props follow `{ComponentName}Props` pattern

**Constants:**

- SCREAMING_SNAKE_CASE for module-level constants (e.g., `KOKORO_VOICES`, `GITHUB_REPO_URL`, `TAU`)

## Code Style

**Formatting:**

- Prettier with configuration in `.prettierrc`
- No semicolons (`"semi": false`)
- Single quotes (`"singleQuote": true`)
- Tab width: 2 spaces
- Trailing commas: ES5 (`"trailingComma": "es5"`)
- Print width: 100 characters

**Linting:**

- ESLint 9 with TypeScript support
- Plugins: `react-hooks`, `react-refresh`
- Extends: `@eslint/js` recommended and `typescript-eslint` recommended
- React hooks rules enforced

## Import Organization

**Order:**

1. React imports first (`react`, `react-dom`)
2. Third-party libraries (`kokoro-js`, `lamejs`, etc.)
3. Internal modules with `@/` alias (e.g., `@/tts/engine`)
4. Relative imports (`./`, `../`)

**Path Aliases:**

- `@/*` maps to `./src/*` (configured in `tsconfig.json` and `vite.config.ts`)

**Example:**

```typescript
import { useState, useCallback, useRef, useEffect } from 'react'
import { TtsEngine, Voice, TtsOptions, PcmAudio, Progress, EngineInfo } from './tts/engine'
import { getAvailableEngines, getEngineById, getDefaultEngine } from './tts/engineFactory'
import { encodeToMp3 } from './audio/mp3Encoder'
```

## Error Handling

**Patterns:**

- Async errors caught with try/catch blocks
- AbortError specifically checked by name: `(error as Error).name !== 'AbortError'`
- Errors logged to console with `console.error('Context:', error)`
- User-facing errors shown via simple `alert()` for now
- Failed operations gracefully degrade (e.g., chunks that fail to synthesize are skipped with `console.warn`)

**Type assertions:**

- Use `as` for type narrowing: `error instanceof Error ? error.message : String(error)`
- Explicit any suppressed with eslint comment when unavoidable: `// eslint-disable-next-line @typescript-eslint/no-explicit-any`

## Logging

**Framework:** Browser console (`console.log`, `console.warn`, `console.error`)

**Patterns:**

- `console.warn` for non-critical failures that continue execution
- `console.error` for critical failures
- Progress/status callbacks passed as function parameters rather than direct logging

## Comments

**When to Comment:**

- File-level comments describe module purpose (e.g., `// Kokoro.js TTS Engine...`)
- JSDoc for exported public APIs with complex parameters
- Inline comments for non-obvious logic (e.g., `// SAM speed is inverse - higher = slower`)

**JSDoc/TSDoc:**

- Used for utility functions with clear purpose documentation
- `@param` and `@returns` tags for function documentation
- Example from `src/utils/textSplitter.ts`:

```typescript
/**
 * Split text into parts of approximately the target word count.
 * Respects sentence boundaries to avoid splitting mid-sentence.
 *
 * @param text - The text to split
 * @param targetWordsPerPart - Target number of words per part (default: 30000)
 * @returns Array of text parts with metadata
 */
```

## Function Design

**Size:** Functions generally under 50 lines, with larger React components being exceptions

**Parameters:**

- Destructure props in function signature for React components
- Use options objects for functions with many parameters
- Callback functions passed as parameters for progress reporting

**Return Values:**

- Return `null` for missing optional values
- Return empty arrays for no-result queries
- Use explicit return types on exported functions

**Example pattern:**

```typescript
export function splitTextIntoParts(text: string, targetWordsPerPart: number = 30000): TextPart[] {
  if (!text.trim()) {
    return []
  }
  // ...
}
```

## Module Design

**Exports:**

- Named exports preferred over default exports
- One main export per module with related helpers
- Re-exports for backwards compatibility: `export async function getAvailableEngine(): Promise<TtsEngine | null>`

**Barrel Files:**

- Not used; direct imports to specific modules

## React Patterns

**Component Structure:**

- Functional components with hooks
- Props interface defined above component
- Internal helper components defined after main component
- State at top of component, then effects, then handlers, then render

**State Management:**

- React useState for local component state
- useRef for mutable values that don't trigger re-renders
- useCallback for memoized event handlers
- useEffect for side effects and subscriptions

**Example pattern from `src/App.tsx`:**

```typescript
function App() {
  // State declarations
  const [text, setText] = useState(gettysburgAddress.trim())
  const [engines, setEngines] = useState<EngineInfo[]>([])

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null)

  // Effects
  useEffect(() => {
    const initEngines = async () => { /* ... */ }
    initEngines()
  }, [])

  // Handlers
  const handleGenerate = useCallback(async () => { /* ... */ }, [deps])

  // Render
  return (/* JSX */)
}
```

## Styling Conventions

**CSS Framework:** Tailwind CSS with custom configuration

**Class naming:**

- Utility classes directly in className
- Custom component classes in `index.css` using `@layer components`
- Custom classes: `glass-panel`, `text-gradient`, `glow-effect`, `waveform-bg`

**Color system:**

- HSL CSS custom properties (e.g., `--primary`, `--secondary`, `--muted`)
- Semantic color names over raw values

---

_Convention analysis: 2026-01-20_
