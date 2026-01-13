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
  chapterMode,
  onChapterModeChange,
  chapters,
}: TextInputProps) {
  const stats = getTextStatistics(value)
  const isLongText = stats.words > 5000

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor="text-input" className="text-lg font-medium">
          Enter your text
        </label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={chapterMode}
              onChange={(e) => onChapterModeChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Chapter mode</span>
          </label>
        </div>
      </div>

      <textarea
        id="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste or type your text here...&#10;&#10;For chapters, start lines with '# ' (e.g., '# Chapter 1')&#10;&#10;Example:&#10;# Chapter 1&#10;This is the first chapter content...&#10;&#10;# Chapter 2&#10;This is the second chapter..."
        className="w-full h-64 p-4 bg-gray-800 border border-gray-600 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
        <span>{stats.characters.toLocaleString()} characters</span>
        <span>{stats.words.toLocaleString()} words</span>
        <span>{stats.sentences.toLocaleString()} sentences</span>
        {chapterMode && <span>{chapters.length} chapters detected</span>}
      </div>

      {isLongText && (
        <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg text-yellow-300 text-sm">
          <strong>Long text detected:</strong> Consider enabling chapter mode for better
          organization. Very long texts may take longer to process.
        </div>
      )}

      {chapterMode && chapters.length > 0 && (
        <div className="p-3 bg-gray-800 border border-gray-600 rounded-lg">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Detected Chapters ({chapters.length}):
          </h4>
          <ul className="space-y-1 text-sm text-gray-400 max-h-32 overflow-y-auto">
            {chapters.map((chapter, index) => (
              <li key={index} className="flex justify-between">
                <span className="truncate">{chapter.title}</span>
                <span className="text-gray-500 ml-2">
                  {chapter.text.split(/\s+/).length} words
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {chapterMode && chapters.length === 0 && value.trim() && (
        <div className="p-3 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-400">
          No chapters detected. Add lines starting with "# " to create chapters.
        </div>
      )}
    </div>
  )
}
