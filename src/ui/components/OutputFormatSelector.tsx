interface OutputFormatSelectorProps {
  m4bSupported: boolean
}

export function OutputFormatSelector({
  m4bSupported,
}: OutputFormatSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <HeadphoneIcon />
        <h2 className="font-display font-semibold text-lg">Available Formats</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-lg border-2 border-border bg-transparent text-foreground">
          <div className="font-display font-semibold text-lg mb-1">MP3</div>
          <div className="text-xs opacity-70">Universal compatibility</div>
        </div>

        <div
          className={`p-4 rounded-lg border-2 border-border bg-transparent text-left ${
            !m4bSupported ? 'opacity-50' : ''
          }`}
          title={!m4bSupported ? 'M4B requires cross-origin isolation' : ''}
        >
          <div className="font-display font-semibold text-lg mb-1">M4B</div>
          <div className="text-xs opacity-70">Chapters & bookmarks</div>
          {!m4bSupported && (
            <div className="text-xs opacity-50 mt-1">Requires WebCodecs support</div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Both formats will be available for download after generation.
      </p>
    </div>
  )
}

function HeadphoneIcon() {
  return (
    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
      />
    </svg>
  )
}