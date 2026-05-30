"use client"

import { useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { useCanvasStore } from "@/hooks/useCanvas"
import { usePresenceStore } from "@/hooks/usePresence"
import type { CanvasElement } from "@/types/canvas"

export function useSocket({ projectId }: { projectId: string }) {
  const socketRef = useRef<Socket | null>(null)
  const addElement = useCanvasStore((state) => state.addElement)
  const updateElement = useCanvasStore((state) => state.updateElement)
  const removeElement = useCanvasStore((state) => state.removeElement)
  const addCollaborator = usePresenceStore((state) => state.addCollaborator)
  const removeCollaborator = usePresenceStore((state) => state.removeCollaborator)
  const updateCursor = usePresenceStore((state) => state.updateCursor)
  const resetPresence = usePresenceStore((state) => state.reset)

  useEffect(() => {
    const socket = io({ path: "/api/socket", auth: { projectId } })
    socketRef.current = socket
    socket.on("element:created", (element: CanvasElement) => addElement(element))
    socket.on("element:updated", ({ elementId, patch }: { elementId: string; patch: Partial<CanvasElement> }) => updateElement(elementId, patch))
    socket.on("element:deleted", ({ elementId }: { elementId: string }) => removeElement(elementId))
    socket.on("presence:join", (data: { userId: string; name: string; image?: string }) => addCollaborator(data))
    socket.on("presence:leave", ({ userId }: { userId: string }) => removeCollaborator(userId))
    socket.on("viewport:cursor", ({ userId, x, y }: { userId: string; x: number; y: number }) => updateCursor(userId, { x, y }))
    socket.on("element:connected", () => window.dispatchEvent(new CustomEvent("inkycut:connections-changed")))
    return () => {
      socket.disconnect()
      resetPresence()
    }
  }, [addCollaborator, addElement, projectId, removeCollaborator, removeElement, resetPresence, updateCursor, updateElement])

  return {
    emitCursor: (x: number, y: number) => socketRef.current?.emit("viewport:cursor", { x, y }),
  }
}
