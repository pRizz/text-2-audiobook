# Testing Patterns

**Analysis Date:** 2026-01-20

## Test Framework

**Runner:**

- Vitest 2.1.8
- Config: `vitest.config.ts`

**Assertion Library:**

- Vitest built-in assertions (`expect`)

**Run Commands:**

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode for development
```

## Test File Organization

**Location:**

- Co-located with source files (e.g., `parseChapters.test.ts` next to `parseChapters.ts`)

**Naming:**

- Pattern: `{module}.test.ts`
- Examples: `parseChapters.test.ts`, `pcm.test.ts`

**Structure:**

```
src/
├── chapters/
│   ├── parseChapters.ts
│   └── parseChapters.test.ts
├── audio/
│   ├── pcm.ts
│   └── pcm.test.ts
```

## Test Structure

**Suite Organization:**

```typescript
import { describe, it, expect } from 'vitest'
import {
  parseChapters,
  sanitizeFilename,
  estimateDuration,
  getTextStatistics,
} from './parseChapters'

describe('parseChapters', () => {
  it('should parse text with chapter markers', () => {
    // Arrange
    const text = `# Chapter 1
This is the first chapter content.

# Chapter 2
This is the second chapter content.`

    // Act
    const chapters = parseChapters(text)

    // Assert
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('Chapter 1')
    expect(chapters[0].text).toContain('first chapter')
  })

  it('should handle text without chapter markers', () => {
    const text = 'Just some plain text without any chapters.'

    const chapters = parseChapters(text)

    expect(chapters).toHaveLength(1)
    expect(chapters[0].title).toBe('Chapter 1')
    expect(chapters[0].text).toBe(text)
  })
})
```

**Patterns:**

- One `describe` block per function or logical unit
- Clear `it` descriptions starting with "should"
- Tests follow implicit Arrange/Act/Assert structure
- Related functions grouped in same test file

## Test Assertions

**Common Assertions Used:**

```typescript
expect(result).toBe(value) // Strict equality
expect(result).toHaveLength(n) // Array/string length
expect(result).toContain('substring') // String/array contains
expect(result).toBeCloseTo(value, n) // Floating point comparison
```

**Edge Case Testing:**

```typescript
it('should handle empty text', () => {
  expect(parseChapters('')).toHaveLength(0)
  expect(parseChapters('   ')).toHaveLength(0)
})

it('should return empty array for empty text', () => {
  expect(parseChapters('')).toHaveLength(0)
  expect(parseChapters('   ')).toHaveLength(0)
})
```

## Mocking

**Framework:** Vitest built-in mocking (not currently used in existing tests)

**Patterns:**

- Tests currently use real implementations
- No mocking of external dependencies in existing tests
- Pure function testing without mocks preferred

**What to Mock (guidance):**

- External API calls
- Browser APIs (Web Audio, Speech Synthesis)
- File system operations

**What NOT to Mock:**

- Pure utility functions
- Data transformations
- Simple calculations

## Fixtures and Factories

**Test Data:**

```typescript
// Inline test data for simple cases
const text = `# Chapter 1
This is the first chapter content.`

// Arrays for parameterized-style tests
const words = Array(150).fill('word').join(' ')
```

**Location:**

- Test data defined inline in test files
- No separate fixtures directory

## Coverage

**Requirements:** None enforced currently

**View Coverage:**

```bash
# Coverage not configured in current vitest.config.ts
# Would need to add:
# test: { coverage: { provider: 'v8' } }
```

## Test Types

**Unit Tests:**

- Focus on pure functions: `parseChapters`, `sanitizeFilename`, `estimateDuration`, `getTextStatistics`
- PCM audio utilities: `concatenatePcmAudio`, `getDurationSeconds`
- Formatting utilities: `formatDuration`

**Integration Tests:**

- Not present in current codebase

**E2E Tests:**

- Not present; no Playwright/Cypress setup

## Test Environment

**Configuration in `vitest.config.ts`:**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- Environment: Node (not jsdom)
- Includes only `*.test.ts` files in `src/`

## Common Patterns

**Async Testing:**

- Not used in current tests; all tested functions are synchronous

**Error Testing:**

```typescript
// Edge cases return expected empty values rather than throwing
it('should handle empty text', () => {
  const stats = getTextStatistics('')
  expect(stats.characters).toBe(0)
  expect(stats.words).toBe(0)
  expect(stats.sentences).toBe(1) // Default minimum
  expect(stats.paragraphs).toBe(1) // Default minimum
})
```

**Numeric Precision:**

```typescript
it('should estimate duration based on word count', () => {
  const words = Array(150).fill('word').join(' ')
  const duration = estimateDuration(words, 1.0)

  expect(duration).toBeCloseTo(60, 0) // Within 1 second precision
})
```

**Data-Driven Tests:**

```typescript
describe('formatDuration', () => {
  it('should format seconds correctly', () => {
    expect(formatDuration(45)).toBe('0:45')
  })

  it('should format minutes correctly', () => {
    expect(formatDuration(125)).toBe('2:05')
  })

  it('should format hours correctly', () => {
    expect(formatDuration(3661)).toBe('1:01:01')
  })

  it('should handle zero', () => {
    expect(formatDuration(0)).toBe('0:00')
  })
})
```

## Current Test Files

| File                                 | Functions Tested                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| `src/chapters/parseChapters.test.ts` | `parseChapters`, `sanitizeFilename`, `estimateDuration`, `getTextStatistics` |
| `src/audio/pcm.test.ts`              | `concatenatePcmAudio`, `getDurationSeconds`, `formatDuration`                |

## Areas Without Tests

**Not Tested:**

- TTS engine implementations (`src/tts/fullExportEngine/*.ts`)
- Audio encoders (`src/audio/mp3Encoder.ts`, `src/audio/m4bEncoder.ts`)
- React components (`src/ui/components/*.tsx`)
- Main App component (`src/App.tsx`)
- Text splitter utility (`src/utils/textSplitter.ts`)
- Format utilities (`src/utils/format.ts` - only `formatDuration` tested via pcm.test.ts)

**Recommendations for New Tests:**

- Add tests for `splitTextIntoParts` in `textSplitter.ts`
- Add tests for `formatBytes`, `formatBytesPerSecond` in `format.ts`
- Consider jsdom environment for component tests

---

_Testing analysis: 2026-01-20_
