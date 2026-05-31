"use client"

import type { CanvasElement } from "@/types/canvas"

export function NodeWrapper({
  element,
  selected,
  dragging,
  onPointerDown,
  children,
}: {
  element: CanvasElement
  selected: boolean
  dragging: boolean
  onPointerDown: (event: React.PointerEvent) => void
  children: React.ReactNode
}) {
  const classes = ["node", element.type === "frame" ? "frame-node" : "", element.type === "note" ? "note-node" : "", selected ? "sel" : "", dragging ? "dragging" : ""]
    .filter(Boolean)
    .join(" ")
  return (
    <div
      className={classes}
      data-testid={`canvas-node-${element.type}`}
      data-element-id={element.id}
      style={{ left: element.x, top: element.y, width: element.w, height: element.h ?? undefined }}
      onPointerDown={onPointerDown}
    >
      {children}
    </div>
  )
}

export function NHead({ label, type }: { label: string; type: string }) {
  return (
    <div className="nhead nh-drag">
      <span className="nh-dot" />
      {label}
      <span className="nh-type">{type}</span>
    </div>
  )
}
