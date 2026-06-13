/**
 * Background polling helper for live data.
 *
 * Calls `refresh` on an interval that adapts to whether something is live:
 * a short interval while `isLive()` is true, a slow one otherwise. Polling
 * pauses while the browser tab is hidden and stops automatically when the
 * component unmounts. Server-side it does nothing.
 */
export function useLivePolling(
  refresh: () => Promise<void> | void,
  opts: {
    /** Interval (ms) while a match is live. Default 20s. */
    activeMs?: number
    /** Interval (ms) when nothing is live. Default 2min. */
    idleMs?: number
    /** Whether a match is currently live, to pick the interval. */
    isLive?: () => boolean
  } = {},
) {
  if (import.meta.server) return

  const activeMs = opts.activeMs ?? 20_000
  const idleMs = opts.idleMs ?? 120_000
  let timer: ReturnType<typeof setTimeout> | null = null
  let stopped = false

  function schedule() {
    if (stopped) return
    const delay = opts.isLive?.() ? activeMs : idleMs
    timer = setTimeout(tick, delay)
  }

  async function tick() {
    if (typeof document !== 'undefined' && document.hidden) {
      schedule()
      return
    }
    try {
      await refresh()
    } catch {
      // Ignore transient errors; next tick will retry.
    }
    schedule()
  }

  onMounted(schedule)
  onBeforeUnmount(() => {
    stopped = true
    if (timer) clearTimeout(timer)
  })
}
