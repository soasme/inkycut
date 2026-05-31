import { act, renderHook } from "@testing-library/react"
import { useAutosave } from "@/hooks/useAutosave"

jest.useFakeTimers()

describe("useAutosave", () => {
  it("calls saveFn after debounce delay", () => {
    const saveFn = jest.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useAutosave(saveFn, 800))
    act(() => result.current.trigger({ x: 100 }))
    expect(saveFn).not.toHaveBeenCalled()
    act(() => jest.advanceTimersByTime(800))
    expect(saveFn).toHaveBeenCalledWith({ x: 100 })
  })

  it("debounces rapid calls", () => {
    const saveFn = jest.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useAutosave(saveFn, 800))
    act(() => {
      result.current.trigger({ x: 1 })
      result.current.trigger({ x: 2 })
    })
    act(() => jest.advanceTimersByTime(800))
    expect(saveFn).toHaveBeenCalledTimes(1)
    expect(saveFn).toHaveBeenCalledWith({ x: 2 })
  })

  it("does not save a null payload", () => {
    const saveFn = jest.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useAutosave(saveFn, 800))
    act(() => result.current.trigger(null))
    act(() => jest.advanceTimersByTime(800))
    expect(saveFn).not.toHaveBeenCalled()
  })
})
