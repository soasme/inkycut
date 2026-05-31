import type { Server as HTTPServer } from "http"
import { getToken } from "next-auth/jwt"
import { Server } from "socket.io"
import { getProjectById } from "@/lib/db/queries/projects"

const socketGlobal = globalThis as typeof globalThis & { inkycutIO?: Server }

function getE2EUser(cookieHeader: string | undefined) {
  if (process.env.E2E_AUTH_BYPASS !== "1") return null
  const value = cookieHeader
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("inkycut-e2e-user="))
    ?.slice("inkycut-e2e-user=".length)
  if (!value) return null
  try {
    return JSON.parse(decodeURIComponent(value)) as { id: string; name?: string; image?: string }
  } catch {
    return null
  }
}

export function getRoomName(projectId: string) {
  return `project:${projectId}`
}

export function initSocketServer(httpServer: HTTPServer) {
  if (socketGlobal.inkycutIO) return socketGlobal.inkycutIO

  const io = new Server(httpServer, {
    path: "/api/socket",
    cors: { origin: process.env.NEXTAUTH_URL ?? "http://localhost:3000", credentials: true },
  })
  socketGlobal.inkycutIO = io

  io.on("connection", async (socket) => {
    const projectId = socket.handshake.auth.projectId as string | undefined
    const e2eUser = getE2EUser(socket.request.headers.cookie)
    const token = e2eUser
      ? null
      : await getToken({
          req: socket.request as unknown as Request,
          secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
        })
    const userId = e2eUser?.id ?? token?.sub
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
      name: e2eUser?.name ?? (token?.name as string | undefined) ?? "",
      image: e2eUser?.image ?? (token?.picture as string | undefined) ?? "",
    })
    socket.on("viewport:cursor", (data) => socket.to(room).emit("viewport:cursor", { userId, ...data }))
    socket.on("disconnect", () => socket.to(room).emit("presence:leave", { userId }))
  })

  return io
}

export function getIO() {
  if (!socketGlobal.inkycutIO) throw new Error("Socket.io not initialised")
  return socketGlobal.inkycutIO
}

export function broadcastToProject(projectId: string, event: string, data: unknown) {
  getIO().to(getRoomName(projectId)).emit(event, data)
}
