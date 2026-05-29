import { useCallback, useRef } from "react"

export function useAutosave<T>(saveFn: (data: T) => Promise<void>, delayMs: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestData = useRef<T | null>(null)

  const trigger = useCallback(
    (data: T) => {
      latestData.current = data
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        if (latestData.current !== null) void saveFn(latestData.current)
      }, delayMs)
    },
    [delayMs, saveFn],
  )

  return { trigger }
}
