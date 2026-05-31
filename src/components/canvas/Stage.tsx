"use client"

import { useRef, useState } from "react"
import { useCanvasStore } from "@/hooks/useCanvas"
import { CharacterNode } from "@/components/canvas/nodes/CharacterNode"
import { DocNode } from "@/components/canvas/nodes/DocNode"
import { FrameNode } from "@/components/canvas/nodes/FrameNode"
import { NodeWrapper } from "@/components/canvas/nodes/NodeWrapper"
import { NoteNode } from "@/components/canvas/nodes/NoteNode"
import { ShotlistNode } from "@/components/canvas/nodes/ShotlistNode"
import { StoryboardNode } from "@/components/canvas/nodes/StoryboardNode"
import type { Collaborator } from "@/hooks/usePresence"
import type { CanvasElement } from "@/types/canvas"

interface StageProps {
  onNodeUpdate: (id: string, patch: Partial<CanvasElement>) => void
  onGenerateShotlist: (element: CanvasElement) => void
  onNoteChange: (id: string, text: string) => void
  onImageUpload: (elementId: string, url: string) => void
  onCursorMove: (x: number, y: number) => void
  onConnectFrames: (fromId: string, toId: string) => void
  connections: Array<{ fromElementId: string; toElementId: string }>
  busy: boolean
  onViewportChange: (viewport: { x: number; y: number; scale: number }) => void
  collaborators: Collaborator[]
}

export function Stage({ onNodeUpdate, onGenerateShotlist, onNoteChange, onImageUpload, onCursorMove, onConnectFrames, connections, busy, onViewportChange, collaborators }: StageProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const cursorThrottle = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; x: number; y: number } | null>(null)
  const panRef = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null)
  const [connectSource, setConnectSource] = useState<string | null>(null)
  const { elements, viewport, selectedId, draggingId, setDraggingId, setSelectedId, setViewport } = useCanvasStore()

  function down(event: React.PointerEvent, element: CanvasElement) {
    if ((event.target as HTMLElement).closest("[data-no-drag]")) return
    if (event.shiftKey && element.type === "frame") {
      event.stopPropagation()
      if (!connectSource) setConnectSource(element.id)
      else if (connectSource !== element.id) {
        onConnectFrames(connectSource, element.id)
        setConnectSource(null)
      } else setConnectSource(null)
      return
    }
    setSelectedId(element.id)
    setDraggingId(element.id)
    dragRef.current = { id: element.id, startX: event.clientX, startY: event.clientY, x: element.x, y: element.y }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function move(event: React.PointerEvent) {
    const rect = stageRef.current!.getBoundingClientRect()
    if (!cursorThrottle.current) {
      cursorThrottle.current = setTimeout(() => (cursorThrottle.current = null), 33)
      onCursorMove((event.clientX - rect.left - viewport.x) / viewport.scale, (event.clientY - rect.top - viewport.y) / viewport.scale)
    }
    if (!dragRef.current) return
    const next = {
      x: dragRef.current.x + (event.clientX - dragRef.current.startX) / viewport.scale,
      y: dragRef.current.y + (event.clientY - dragRef.current.startY) / viewport.scale,
    }
    onNodeUpdate(dragRef.current.id, next)
  }

  function stageMove(event: React.PointerEvent) {
    move(event)
    if (!panRef.current) return
    const next = {
      ...viewport,
      x: panRef.current.x + event.clientX - panRef.current.startX,
      y: panRef.current.y + event.clientY - panRef.current.startY,
    }
    setViewport(next)
    onViewportChange(next)
  }

  function up() {
    setDraggingId(null)
    dragRef.current = null
    panRef.current = null
  }

  function wheel(event: React.WheelEvent) {
    event.preventDefault()
    const scale = Math.max(0.25, Math.min(2, viewport.scale * (event.deltaY > 0 ? 0.94 : 1.06)))
    const next = { ...viewport, scale }
    setViewport(next)
    onViewportChange(next)
  }

  function stageDown(event: React.PointerEvent) {
    setConnectSource(null)
    if (event.target !== event.currentTarget) return
    panRef.current = { startX: event.clientX, startY: event.clientY, x: viewport.x, y: viewport.y }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  return (
    <div ref={stageRef} data-testid="canvas-stage" className="stage" onPointerMove={stageMove} onPointerUp={up} onWheel={wheel} onPointerDown={stageDown}>
      <div className="stage-dots" />
      <div data-testid="canvas-layer" className="canvas-layer" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}>
        <svg style={{ position: "absolute", inset: 0, width: 1, height: 1, overflow: "visible", pointerEvents: "none" }}>
          {connections.map((connection) => {
            const from = elements.find((element) => element.id === connection.fromElementId)
            const to = elements.find((element) => element.id === connection.toElementId)
            if (!from || !to) return null
            const x1 = from.x + from.w / 2
            const y1 = from.y + (from.h ?? 200) / 2
            const x2 = to.x + to.w / 2
            const y2 = to.y + (to.h ?? 200) / 2
            return <line key={`${connection.fromElementId}-${connection.toElementId}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--accent)" strokeWidth={2 / viewport.scale} strokeDasharray="8 6" />
          })}
        </svg>
        {elements.map((element) => (
          <NodeWrapper key={element.id} element={element} selected={selectedId === element.id || connectSource === element.id} dragging={draggingId === element.id} onPointerDown={(event) => down(event, element)}>
            {element.type === "frame" && <FrameNode element={element} onImageUpload={onImageUpload} />}
            {element.type === "character" && <CharacterNode element={element} />}
            {element.type === "doc" && <DocNode element={element} />}
            {element.type === "storyboard" && <StoryboardNode element={element} onGenerateShotlist={onGenerateShotlist} busy={busy} />}
            {element.type === "shotlist" && <ShotlistNode element={element} />}
            {element.type === "note" && <NoteNode element={element} onChange={onNoteChange} />}
          </NodeWrapper>
        ))}
      </div>
      <div className="hint">{connectSource ? "shift+click another frame to connect" : "drag nodes · scroll to zoom · shift+click frames to connect"}</div>
      {collaborators.flatMap((collaborator) =>
        collaborator.cursor ? (
          <div
            key={collaborator.userId}
            data-testid="collaborator-cursor"
            className="collaborator-cursor"
            style={{ left: viewport.x + collaborator.cursor.x * viewport.scale, top: viewport.y + collaborator.cursor.y * viewport.scale }}
          >
            {collaborator.name || collaborator.userId}
          </div>
        ) : [],
      )}
    </div>
  )
}
