import type { CanvasElement } from "@/types/canvas"

interface Connection {
  fromElementId: string
  toElementId: string
}

export function discoverChains(elements: CanvasElement[], connections: Connection[]) {
  const frames = elements.filter((element) => element.type === "frame")
  const frameIds = new Set(frames.map((frame) => frame.id))
  const frameById = new Map(frames.map((frame) => [frame.id, frame]))
  const outgoing = new Map<string, string[]>()
  const incoming = new Set<string>()

  for (const connection of connections) {
    if (!frameIds.has(connection.fromElementId) || !frameIds.has(connection.toElementId)) continue
    outgoing.set(connection.fromElementId, [...(outgoing.get(connection.fromElementId) ?? []), connection.toElementId])
    incoming.add(connection.toElementId)
  }

  const roots = [...frameIds].filter((id) => !incoming.has(id) && outgoing.has(id))
  return roots.map((root) => {
    const chain: CanvasElement[] = []
    const visited = new Set<string>()
    let current: string | undefined = root

    while (current && !visited.has(current)) {
      visited.add(current)
      chain.push(frameById.get(current)!)
      current = outgoing.get(current)?.[0]
    }

    return chain
  })
}
