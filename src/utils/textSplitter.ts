/**
 * Utility for splitting large text into manageable parts for processing.
 */

export interface TextPart {
  text: string
  partNumber: number
  wordCount: number
  characterCount: number
}

/**
 * Split text into parts of approximately the target word count.
 * Respects sentence boundaries to avoid splitting mid-sentence.
 *
 * @param text - The text to split
 * @param targetWordsPerPart - Target number of words per part (default: 30000)
 * @returns Array of text parts with metadata
 */
export function splitTextIntoParts(
  text: string,
  targetWordsPerPart: number = 30000
): TextPart[] {
  if (!text.trim()) {
    return []
  }

  // Split by sentences first
  const sentenceRegex = /[^.!?]+[.!?]+/g
  const sentences: string[] = []
  let match: RegExpExecArray | null

  // Reset regex lastIndex
  sentenceRegex.lastIndex = 0

  while ((match = sentenceRegex.exec(text)) !== null) {
    sentences.push(match[0])
  }

  // If no sentences found, treat entire text as one sentence
  if (sentences.length === 0) {
    sentences.push(text)
  }

  const parts: TextPart[] = []
  let currentPart: string[] = []
  let currentWordCount = 0
  let partNumber = 1

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).filter((w) => w.length > 0)
    const sentenceWordCount = sentenceWords.length

    // If a single sentence exceeds target, we still need to include it
    if (sentenceWordCount > targetWordsPerPart && currentPart.length === 0) {
      // Single sentence is too large - split it anyway
      parts.push({
        text: sentence.trim(),
        partNumber: partNumber++,
        wordCount: sentenceWordCount,
        characterCount: sentence.length,
      })
      continue
    }

    // Check if adding this sentence would exceed target
    if (
      currentWordCount + sentenceWordCount > targetWordsPerPart &&
      currentPart.length > 0
    ) {
      // Save current part
      const partText = currentPart.join(' ').trim()
      if (partText) {
        parts.push({
          text: partText,
          partNumber: partNumber++,
          wordCount: currentWordCount,
          characterCount: partText.length,
        })
      }

      // Start new part
      currentPart = [sentence]
      currentWordCount = sentenceWordCount
    } else {
      // Add sentence to current part
      currentPart.push(sentence)
      currentWordCount += sentenceWordCount
    }
  }

  // Add final part if it has content
  if (currentPart.length > 0) {
    const partText = currentPart.join(' ').trim()
    if (partText) {
      parts.push({
        text: partText,
        partNumber: partNumber++,
        wordCount: currentWordCount,
        characterCount: partText.length,
      })
    }
  }

  return parts.length > 0 ? parts : []
}
