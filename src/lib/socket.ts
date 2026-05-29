import type { Server as HTTPServer } from "http"
import { getToken } from "next-auth/jwt"
import { Server } from "socket.io"
import { getProjectById } from "@/lib/db/queries/projects"

let io: Server | null = null

export function getRoomName(projectId: string) {
  return `project:${projectId}`
}

export function initSocketServer(httpServer: HTTPServer) {
  if (io) return io

  io = new Server(httpServer, {
    path: "/api/socket",
    cors: { origin: process.env.NEXTAUTH_URL ?? "http://localhost:3000", credentials: true },
  })

  io.on("connection", async (socket) => {
    const projectId = socket.handshake.auth.projectId as string | undefined
    const token = await getToken({
      req: socket.request as unknown as Request,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    })
    const userId = token?.sub
    if (!projectId || !userId) {
      socket.disconnect()
      return
    }

    const project = await getProjectById(projectId, userId)
    if (!project) {
      socket.disconnect()
      return
    }

    const room = getRoomName(projectId)
    socket.join(room)
    socket.to(room).emit("presence:join", {
      userId,
      name: (token.name as string | undefined) ?? "",
      image: (token.picture as string | undefined) ?? "",
    })
    socket.on("viewport:cursor", (data) => socket.to(room).emit("viewport:cursor", { userId, ...data }))
    socket.on("disconnect", () => socket.to(room).emit("presence:leave", { userId }))
  })

  return io
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialised")
  return io
}

export function broadcastToProject(projectId: string, event: string, data: unknown) {
  getIO().to(getRoomName(projectId)).emit(event, data)
}
