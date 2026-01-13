export interface Chapter {
  title: string
  text: string
  startIndex: number
  endIndex: number
}

export function parseChapters(text: string): Chapter[] {
  if (!text.trim()) {
    return []
  }

  const lines = text.split('\n')
  const chapters: Chapter[] = []
  let currentChapter: Chapter | null = null
  let currentIndex = 0
  let hasChapterMarkers = false
  let preMarkerChapterIndex = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineStart = currentIndex

    // Check if this line is a chapter marker (starts with "# ")
    if (line.startsWith('# ')) {
      // Save previous chapter if exists
      if (currentChapter) {
        currentChapter.endIndex = lineStart - 1
        currentChapter.text = currentChapter.text.trim()
        if (currentChapter.text) {
          // If this is the first chapter marker and we have pre-marker content
          if (!hasChapterMarkers && currentChapter.title === 'Chapter 1') {
            preMarkerChapterIndex = chapters.length
          }
          chapters.push(currentChapter)
        }
      }

      hasChapterMarkers = true

      // Start new chapter
      const title = line.slice(2).trim() || `Chapter ${chapters.length + 1}`
      currentChapter = {
        title,
        text: '',
        startIndex: lineStart,
        endIndex: lineStart,
      }
    } else if (currentChapter) {
      currentChapter.text += line + '\n'
    } else {
      // No chapter yet - create initial chapter
      currentChapter = {
        title: 'Chapter 1',
        text: line + '\n',
        startIndex: 0,
        endIndex: 0,
      }
    }

    currentIndex += line.length + 1 // +1 for newline
  }

  // Save last chapter
  if (currentChapter) {
    currentChapter.endIndex = currentIndex
    currentChapter.text = currentChapter.text.trim()
    if (currentChapter.text) {
      chapters.push(currentChapter)
    }
  }

  // If we found chapter markers, rename any pre-marker content to "Introduction"
  if (hasChapterMarkers && preMarkerChapterIndex >= 0) {
    chapters[preMarkerChapterIndex].title = 'Introduction'
  }

  return chapters
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 100)
}

export function estimateDuration(text: string, rate: number = 1.0): number {
  // Rough estimate: ~150 words per minute at normal rate
  const words = text.split(/\s+/).length
  const wordsPerMinute = 150 * rate
  return (words / wordsPerMinute) * 60 // Return seconds
}

export function getTextStatistics(text: string): {
  characters: number
  words: number
  sentences: number
  paragraphs: number
} {
  const characters = text.length
  const words = text.split(/\s+/).filter(w => w.length > 0).length
  const sentences = (text.match(/[.!?]+/g) || []).length || 1
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length || 1

  return { characters, words, sentences, paragraphs }
}
