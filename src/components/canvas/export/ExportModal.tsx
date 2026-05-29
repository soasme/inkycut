"use client"

import { useState } from "react"
import { useVideoExport } from "@/components/canvas/export/useVideoExport"
import type { CanvasElement } from "@/types/canvas"

export function ExportModal({ elements, connections, onClose }: { elements: CanvasElement[]; connections: Array<{ fromElementId: string; toElementId: string }>; onClose: () => void }) {
  const { state, progress, errorMsg, buildChains, renderChain, reset } = useVideoExport()
  const [selected, setSelected] = useState<number | null>(null)
  const chains = buildChains(elements, connections)
  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <h2>Export video</h2>
        {chains.length === 0 && <p className="modal-note">No connected frame sequences found.</p>}
        {chains.map((chain, index) => (
          <button key={chain.index} className={selected === index ? "chain on" : "chain"} onClick={() => setSelected(index)}>
            Sequence {index + 1}: {chain.frames.length} frames · {chain.totalDuration.toFixed(1)}s
          </button>
        ))}
        {state === "rendering" && <p className="modal-note">Rendering... {progress}%</p>}
        {state === "done" && <p className="modal-note">Export complete. Download started.</p>}
        {state === "error" && <p className="modal-note">Export failed: {errorMsg}</p>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => { reset(); onClose() }} disabled={state === "rendering"}>
            Close
          </button>
          <button className="btn btn-accent" disabled={selected === null || state === "rendering"} onClick={() => selected !== null && renderChain(chains[selected])}>
            Render
          </button>
        </div>
      </div>
    </div>
  )
}
