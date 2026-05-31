"use client"

import type { ElementType } from "@/types/canvas"

const TOOLS: Array<{ type: ElementType; label: string }> = [
  { type: "frame", label: "Frame" },
  { type: "character", label: "Character" },
  { type: "storyboard", label: "Storyboard" },
  { type: "shotlist", label: "Shot list" },
  { type: "doc", label: "Doc" },
  { type: "note", label: "Note" },
]

export function Toolbar({ onAdd, onFocusChat }: { onAdd: (type: ElementType) => void; onFocusChat: () => void }) {
  return (
    <div className="toolbar">
      {TOOLS.map((tool) => (
        <button type="button" key={tool.type} className="tool" aria-label={`Add ${tool.label}`} onClick={() => onAdd(tool.type)}>
          {tool.label.slice(0, 1)}
          <span className="tip">{tool.label}</span>
        </button>
      ))}
      <button type="button" className="tool" aria-label="Ask a specialist" onClick={onFocusChat}>
        /
        <span className="tip">Ask a specialist</span>
      </button>
    </div>
  )
}
