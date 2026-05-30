"use client"

import type { CanvasElement, NoteData } from "@/types/canvas"
import { NHead } from "@/components/canvas/nodes/NodeWrapper"

export function NoteNode({ element, onChange }: { element: CanvasElement; onChange: (id: string, text: string) => void }) {
  const data = element.data as NoteData
  return (
    <>
      <NHead label="Note" type="note" />
      <textarea aria-label="Note text" data-no-drag className="note-body note-editor" value={data.text} onChange={(event) => onChange(element.id, event.target.value)} />
    </>
  )
}
