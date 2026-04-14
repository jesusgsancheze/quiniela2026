export function useAvatar() {
  const config = useRuntimeConfig()

  function avatarUrl(filename: string | null | undefined): string | null {
    if (!filename) return null
    return `${config.public.apiBase}/uploads/${filename}`
  }

  return { avatarUrl }
}
