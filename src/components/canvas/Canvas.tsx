"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CanvasTopbar } from "@/components/canvas/CanvasTopbar"
import { ChatPanel } from "@/components/canvas/chat/ChatPanel"
import { ExportModal } from "@/components/canvas/export/ExportModal"
import { Stage } from "@/components/canvas/Stage"
import { Toolbar } from "@/components/canvas/Toolbar"
import { ZoomControls } from "@/components/canvas/ZoomControls"
import { useCanvasStore } from "@/hooks/useCanvas"
import { useAutosave } from "@/hooks/useAutosave"
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
  const setElements = useCanvasStore((state) => state.setElements)
  const setViewport = useCanvasStore((state) => state.setViewport)
  const elements = useCanvasStore((state) => state.elements)
  const updateElement = useCanvasStore((state) => state.updateElement)
  const createDraftElement = useCanvasStore((state) => state.createDraftElement)
  const addElementToStore = useCanvasStore((state) => state.addElement)
  const collaborators = usePresenceStore((state) => state.collaborators)
  const chatRef = useRef<{ focus: () => void }>(null)
  const { emitCursor } = useSocket({ projectId: project.id })
  const [connections, setConnections] = useState<Array<{ fromElementId: string; toElementId: string }>>([])
  const [showExport, setShowExport] = useState(false)
  const saveViewport = useCallback(
    async (viewport: { x: number; y: number; scale: number }) => {
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewport }),
      })
    },
    [project.id],
  )
  const viewportAutosave = useAutosave(saveViewport, 300)

  useEffect(() => {
    setElements(initialElements)
    setViewport({ x: project.viewportX, y: project.viewportY, scale: project.viewportScale })
  }, [initialElements, project.viewportScale, project.viewportX, project.viewportY, setElements, setViewport])

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
    updateElement(id, patch)
    await fetch(`/api/elements/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) })
  }

  async function addElement(type: ElementType) {
    const draft = createDraftElement(type)
    const res = await fetch("/api/elements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, projectId: project.id }),
    })
    if (res.ok) addElementToStore(await res.json())
  }

  async function noteChange(id: string, text: string) {
    const element = elements.find((item) => item.id === id)
    if (!element) return
    await patchElement(id, { data: { ...(element.data as object), text } as CanvasElement["data"] })
  }

  async function imageUpload(id: string, url: string) {
    const element = elements.find((item) => item.id === id)
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

  async function changeProjectName(name: string) {
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
  }

  return (
    <div className="app">
      <CanvasTopbar projectName={project.name} collaborators={collaborators} onExport={() => setShowExport(true)} onProjectNameChange={changeProjectName} />
      <div className="body">
        <Stage
          onNodeUpdate={patchElement}
          onGenerateShotlist={() => chatRef.current?.focus()}
          onNoteChange={noteChange}
          onImageUpload={imageUpload}
          onCursorMove={emitCursor}
          onConnectFrames={connectFrames}
          connections={connections}
          busy={false}
          onViewportChange={viewportAutosave.trigger}
          collaborators={collaborators}
        />
        <Toolbar onAdd={addElement} onFocusChat={() => chatRef.current?.focus()} />
        <ZoomControls onViewportChange={viewportAutosave.trigger} />
        <ChatPanel ref={chatRef} projectId={project.id} conversationId={conversationId} />
      </div>
      {showExport && <ExportModal elements={elements} connections={connections} onClose={() => setShowExport(false)} />}
    </div>
  )
}
