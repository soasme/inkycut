"use client"

import { useEffect, useMemo, useState } from "react"
import { CanvasTopbar } from "@/components/canvas/CanvasTopbar"
import { ChatPanel } from "@/components/canvas/chat/ChatPanel"
import { ExportModal } from "@/components/canvas/export/ExportModal"
import { Stage } from "@/components/canvas/Stage"
import { Toolbar } from "@/components/canvas/Toolbar"
import { ZoomControls } from "@/components/canvas/ZoomControls"
import { useCanvasStore } from "@/hooks/useCanvas"
import { usePresenceStore } from "@/hooks/usePresence"
import { useSocket } from "@/hooks/useSocket"
import type { CanvasElement, ElementType } from "@/types/canvas"

interface Project {
  id: string
  name: string
  viewportX: number
  viewportY: number
  viewportScale: number
}

export function Canvas({
  project,
  initialElements,
  conversationId,
}: {
  project: Project
  initialElements: CanvasElement[]
  conversationId: string | null
  userId: string
  userName: string
  userImage: string
}) {
  const store = useCanvasStore()
  const collaborators = usePresenceStore((state) => state.collaborators)
  const { emitCursor } = useSocket({ projectId: project.id })
  const [connections, setConnections] = useState<Array<{ fromElementId: string; toElementId: string }>>([])
  const [showExport, setShowExport] = useState(false)

  useEffect(() => {
    store.setElements(initialElements)
    store.setViewport({ x: project.viewportX, y: project.viewportY, scale: project.viewportScale })
  }, [initialElements, project.viewportScale, project.viewportX, project.viewportY, store])

  useEffect(() => {
    function loadConnections() {
      fetch(`/api/connections?projectId=${project.id}`)
        .then((res) => (res.ok ? res.json() : []))
        .then(setConnections)
        .catch(() => setConnections([]))
    }
    loadConnections()
    window.addEventListener("inkycut:connections-changed", loadConnections)
    return () => window.removeEventListener("inkycut:connections-changed", loadConnections)
  }, [project.id])

  async function patchElement(id: string, patch: Partial<CanvasElement>) {
    store.updateElement(id, patch)
    await fetch(`/api/elements/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) })
  }

  async function addElement(type: ElementType) {
    const draft = store.createDraftElement(type)
    const res = await fetch("/api/elements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, projectId: project.id }),
    })
    if (res.ok) store.addElement(await res.json())
  }

  async function noteChange(id: string, text: string) {
    const element = store.elements.find((item) => item.id === id)
    if (!element) return
    await patchElement(id, { data: { ...(element.data as object), text } as CanvasElement["data"] })
  }

  async function imageUpload(id: string, url: string) {
    const element = store.elements.find((item) => item.id === id)
    if (!element) return
    await patchElement(id, { data: { ...(element.data as object), imageUrl: url } as CanvasElement["data"] })
  }

  async function connectFrames(fromElementId: string, toElementId: string) {
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, fromElementId, toElementId }),
    })
    if (res.ok) {
      const connection = await res.json()
      setConnections((items) => [...items, connection])
    }
  }

  const elements = useMemo(() => store.elements, [store.elements])

  return (
    <div className="app">
      <CanvasTopbar projectName={project.name} collaborators={collaborators} onExport={() => setShowExport(true)} />
      <div className="body">
        <Stage
          onNodeUpdate={patchElement}
          onGenerateShotlist={() => undefined}
          onNoteChange={noteChange}
          onImageUpload={imageUpload}
          onCursorMove={emitCursor}
          onConnectFrames={connectFrames}
          connections={connections}
          busy={false}
        />
        <Toolbar onAdd={addElement} />
        <ZoomControls />
        <ChatPanel projectId={project.id} conversationId={conversationId} />
      </div>
      {showExport && <ExportModal elements={elements} connections={connections} onClose={() => setShowExport(false)} />}
    </div>
  )
}
