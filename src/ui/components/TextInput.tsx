import { useRef } from 'react'
import { Chapter, getTextStatistics } from '../../chapters/parseChapters'

export const gettysburgAddress = `
Fourscore and seven years ago our fathers brought forth, on this continent, a new nation, conceived in liberty, and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived, and so dedicated, can long endure. We are met on a great battle-field of that war. We have come to dedicate a portion of that field, as a final resting-place for those who here gave their lives, that that nation might live. It is altogether fitting and proper that we should do this. But, in a larger sense, we cannot dedicate, we cannot consecrate—we cannot hallow—this ground. The brave men, living and dead, who struggled here, have consecrated it far above our poor power to add or detract. The world will little note, nor long remember what we say here, but it can never forget what they did here. It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced. It is rather for us to be here dedicated to the great task remaining before us—that from these honored dead we take increased devotion to that cause for which they here gave the last full measure of devotion—that we here highly resolve that these dead shall not have died in vain—that this nation, under God, shall have a new birth of freedom, and that government of the people, by the people, for the people, shall not perish from the earth.
`;

interface TextInputProps {
  value: string
  onChange: (value: string) => void
  chapterMode: boolean
  onChapterModeChange: (enabled: boolean) => void
  chapters: Chapter[]
}

export function TextInput({
  value,
  onChange,
  chapterMode: _chapterMode,
  onChapterModeChange: _onChapterModeChange,
  chapters: _chapters,
}: TextInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stats = getTextStatistics(value)

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      // For now, support text files. PDF/EPUB parsing can be added later
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const text = await file.text()
        onChange(text)
      } else {
        alert('Currently only TXT files are supported. PDF and EPUB support coming soon.')
      }
    } catch (error) {
      console.error('Failed to read file:', error)
      alert('Failed to read file. Please try again.')
    } finally {
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DocumentIcon />
            <h2 className="font-display font-semibold text-lg">Your Text</h2>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-secondary/50 hover:bg-secondary border border-border/50 rounded-lg transition-colors text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <UploadIcon />
            Import File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.text"
            onChange={handleFileImport}
            className="hidden"
          />
        </div>

        <textarea
          id="text-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste or type your text here... Books, articles, scripts — anything you want to hear."
          className="w-full min-h-[300px] bg-muted/50 border border-border/50 rounded-md resize-none text-base leading-relaxed placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring/50 px-3 py-2 text-foreground transition-colors"
        />

        <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
          <span>{stats.words.toLocaleString()} words</span>
          <span>{stats.characters.toLocaleString()} characters</span>
        </div>
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>Supports TXT, PDF, EPUB imports</p>
        {_chapters.length > 1 && (
          <p className="mt-2 text-xs opacity-70">
            {_chapters.length} chapters detected (lines starting with "# "). 
            Chapter timing is estimated based on text position and may not be perfectly accurate.
          </p>
        )}
      </div>
    </div>
  )
}

function DocumentIcon() {
  return (
    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  )
}
