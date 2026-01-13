import { describe, it, expect } from 'vitest'
import { parseChapters, sanitizeFilename, estimateDuration, getTextStatistics } from './parseChapters'

describe('parseChapters', () => {
  it('should parse text with chapter markers', () => {
    const text = `# Chapter 1
This is the first chapter content.

# Chapter 2
This is the second chapter content.`

    const chapters = parseChapters(text)

    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('Chapter 1')
    expect(chapters[0].text).toContain('first chapter')
    expect(chapters[1].title).toBe('Chapter 2')
    expect(chapters[1].text).toContain('second chapter')
  })

  it('should handle text without chapter markers', () => {
    const text = 'Just some plain text without any chapters.'

    const chapters = parseChapters(text)

    expect(chapters).toHaveLength(1)
    expect(chapters[0].title).toBe('Chapter 1')
    expect(chapters[0].text).toBe(text)
  })

  it('should handle text before first chapter marker', () => {
    const text = `Some introduction text.

# Chapter 1
Chapter content.`

    const chapters = parseChapters(text)

    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('Introduction')
    expect(chapters[1].title).toBe('Chapter 1')
  })

  it('should return empty array for empty text', () => {
    expect(parseChapters('')).toHaveLength(0)
    expect(parseChapters('   ')).toHaveLength(0)
  })

  it('should handle chapters with empty titles', () => {
    const text = `#
Some content here.`

    const chapters = parseChapters(text)

    expect(chapters).toHaveLength(1)
    expect(chapters[0].title).toBe('Chapter 1')
  })
})

describe('sanitizeFilename', () => {
  it('should remove invalid characters', () => {
    expect(sanitizeFilename('Chapter: The Beginning?')).toBe('Chapter_The_Beginning')
  })

  it('should replace spaces with underscores', () => {
    expect(sanitizeFilename('My Chapter Name')).toBe('My_Chapter_Name')
  })

  it('should truncate long names', () => {
    const longName = 'A'.repeat(150)
    expect(sanitizeFilename(longName).length).toBe(100)
  })

  it('should handle special characters', () => {
    expect(sanitizeFilename('File<>:"/\\|?*Name')).toBe('FileName')
  })
})

describe('estimateDuration', () => {
  it('should estimate duration based on word count', () => {
    // 150 words at 1x rate = 60 seconds
    const words = Array(150).fill('word').join(' ')
    const duration = estimateDuration(words, 1.0)

    expect(duration).toBeCloseTo(60, 0)
  })

  it('should adjust for rate', () => {
    const words = Array(150).fill('word').join(' ')
    const duration1x = estimateDuration(words, 1.0)
    const duration2x = estimateDuration(words, 2.0)

    expect(duration2x).toBeCloseTo(duration1x / 2, 0)
  })
})

describe('getTextStatistics', () => {
  it('should count characters correctly', () => {
    const stats = getTextStatistics('Hello world!')
    expect(stats.characters).toBe(12)
  })

  it('should count words correctly', () => {
    const stats = getTextStatistics('Hello world! How are you?')
    expect(stats.words).toBe(5)
  })

  it('should count sentences correctly', () => {
    const stats = getTextStatistics('First sentence. Second sentence! Third?')
    expect(stats.sentences).toBe(3)
  })

  it('should count paragraphs correctly', () => {
    const text = `Paragraph one.

Paragraph two.

Paragraph three.`
    const stats = getTextStatistics(text)
    expect(stats.paragraphs).toBe(3)
  })

  it('should handle empty text', () => {
    const stats = getTextStatistics('')
    expect(stats.characters).toBe(0)
    expect(stats.words).toBe(0)
    expect(stats.sentences).toBe(1) // Default minimum
    expect(stats.paragraphs).toBe(1) // Default minimum
  })
})
