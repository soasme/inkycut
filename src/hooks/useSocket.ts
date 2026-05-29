"use client"

import { useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { useCanvasStore } from "@/hooks/useCanvas"
import { usePresenceStore } from "@/hooks/usePresence"
import type { CanvasElement } from "@/types/canvas"

export function useSocket({ projectId }: { projectId: string }) {
  const socketRef = useRef<Socket | null>(null)
  const canvasStore = useCanvasStore()
  const presenceStore = usePresenceStore()

  useEffect(() => {
    const socket = io({ path: "/api/socket", auth: { projectId } })
    socketRef.current = socket
    socket.on("element:created", (element: CanvasElement) => canvasStore.addElement(element))
    socket.on("element:updated", ({ elementId, patch }: { elementId: string; patch: Partial<CanvasElement> }) => canvasStore.updateElement(elementId, patch))
    socket.on("element:deleted", ({ elementId }: { elementId: string }) => canvasStore.removeElement(elementId))
    socket.on("presence:join", (data: { userId: string; name: string; image?: string }) => presenceStore.addCollaborator(data))
    socket.on("presence:leave", ({ userId }: { userId: string }) => presenceStore.removeCollaborator(userId))
    socket.on("viewport:cursor", ({ userId, x, y }: { userId: string; x: number; y: number }) => presenceStore.updateCursor(userId, { x, y }))
    socket.on("element:connected", () => window.dispatchEvent(new CustomEvent("inkycut:connections-changed")))
    return () => {
      socket.disconnect()
      presenceStore.reset()
    }
  }, [canvasStore, presenceStore, projectId])

  return {
    emitCursor: (x: number, y: number) => socketRef.current?.emit("viewport:cursor", { x, y }),
  }
}
