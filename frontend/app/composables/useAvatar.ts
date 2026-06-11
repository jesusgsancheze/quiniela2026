export function useAvatar() {
  const config = useRuntimeConfig()

  function avatarUrl(filename: string | null | undefined): string | null {
    if (!filename) return null
    // Newer avatars are stored as full URLs (e.g. R2 public links) — use as-is.
    if (/^https?:\/\//i.test(filename)) return filename
    // Legacy values are bare filenames served from the API's /uploads folder.
    return `${config.public.apiBase}/uploads/${filename}`
  }

  return { avatarUrl }
}
