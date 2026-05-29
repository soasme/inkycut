"use client"

import { useCallback, useState } from "react"
import { discoverChains } from "@/lib/chains"
import type { CanvasElement, FrameData } from "@/types/canvas"

export type ExportState = "idle" | "rendering" | "done" | "error"
type Connection = { fromElementId: string; toElementId: string }
type Chain = { index: number; frames: CanvasElement[]; totalDuration: number }

export function useVideoExport() {
  const [state, setState] = useState<ExportState>("idle")
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState("")

  function buildChains(elements: CanvasElement[], connections: Connection[]): Chain[] {
    return discoverChains(elements, connections).map((frames, index) => ({
      index,
      frames,
      totalDuration: frames.reduce((sum, frame) => sum + ((frame.data as FrameData).duration ?? 3), 0),
    }))
  }

  const renderChain = useCallback(async (chain: Chain) => {
    setState("rendering")
    setProgress(10)
    try {
      const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, QUALITY_HIGH } = await import("mediabunny")
      const canvas = document.createElement("canvas")
      canvas.width = 1920
      canvas.height = 1080
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas unavailable")
      const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() })
      const videoSource = new CanvasSource(canvas, { codec: "avc", bitrate: QUALITY_HIGH })
      output.addVideoTrack(videoSource)
      await output.start()
      let timestamp = 0
      for (let index = 0; index < chain.frames.length; index += 1) {
        const data = chain.frames[index].data as FrameData
        ctx.fillStyle = "#111"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = "#fff"
        ctx.font = "72px sans-serif"
        ctx.fillText(data.slug ?? `Frame ${index + 1}`, 120, 160)
        const duration = data.duration ?? 3
        await videoSource.add(timestamp, duration)
        timestamp += duration
        setProgress(Math.round(((index + 1) / chain.frames.length) * 90))
      }
      await output.finalize()
      if (!output.target.buffer) throw new Error("Export produced no bytes")
      const blob = new Blob([output.target.buffer], { type: output.format.mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `inkycut-sequence-${chain.index + 1}.mp4`
      link.click()
      URL.revokeObjectURL(url)
      setProgress(100)
      setState("done")
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Export failed")
      setState("error")
    }
  }, [])

  function reset() {
    setState("idle")
    setProgress(0)
    setErrorMsg("")
  }

  return { state, progress, errorMsg, buildChains, renderChain, reset }
}
