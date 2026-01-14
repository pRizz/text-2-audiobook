/**
 * Formatting helpers for UI display.
 */

/**
 * Format a byte count into a human-friendly string (base-2 / kibibyte-style).
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'

  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

