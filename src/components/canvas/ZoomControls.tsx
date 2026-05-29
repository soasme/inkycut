"use client"

import { useCanvasStore } from "@/hooks/useCanvas"

export function ZoomControls() {
  const viewport = useCanvasStore((state) => state.viewport)
  const setViewport = useCanvasStore((state) => state.setViewport)
  const zoom = (factor: number) => setViewport({ ...viewport, scale: Math.max(0.25, Math.min(2, viewport.scale * factor)) })
  return (
    <div className="zoomctl">
      <button type="button" onClick={() => zoom(0.9)}>
        -
      </button>
      <span className="pct">{Math.round(viewport.scale * 100)}%</span>
      <button type="button" onClick={() => zoom(1.1)}>
        +
      </button>
    </div>
  )
}
