import { create } from "zustand"
import type { CanvasElement, CanvasViewport, ElementType } from "@/types/canvas"

interface CanvasStore {
  elements: CanvasElement[]
  viewport: CanvasViewport
  selectedId: string | null
  draggingId: string | null
  setElements: (elements: CanvasElement[]) => void
  addElement: (element: CanvasElement) => void
  updateElement: (id: string, patch: Partial<CanvasElement>) => void
  removeElement: (id: string) => void
  setViewport: (viewport: CanvasViewport) => void
  setSelectedId: (id: string | null) => void
  setDraggingId: (id: string | null) => void
  createDraftElement: (type: ElementType) => Omit<CanvasElement, "id" | "createdAt" | "updatedAt">
  reset: () => void
}

const DEFAULT_VIEWPORT: CanvasViewport = { x: 30, y: 24, scale: 0.78 }

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  elements: [],
  viewport: DEFAULT_VIEWPORT,
  selectedId: null,
  draggingId: null,
  setElements: (elements) => set({ elements }),
  addElement: (element) => set((state) => ({ elements: state.elements.some((item) => item.id === element.id) ? state.elements : [...state.elements, element] })),
  updateElement: (id, patch) => set((state) => ({ elements: state.elements.map((item) => (item.id === id ? { ...item, ...patch } : item)) })),
  removeElement: (id) => set((state) => ({ elements: state.elements.filter((item) => item.id !== id) })),
  setViewport: (viewport) => set({ viewport }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setDraggingId: (draggingId) => set({ draggingId }),
  createDraftElement: (type) => {
    const base = { projectId: "", type, x: 160 + get().elements.length * 24, y: 120 + get().elements.length * 24, w: 320, h: null }
    if (type === "frame") return { ...base, w: 360, h: 225, data: { slug: "FRAME", hue: "slate", meta: "16:9" } }
    if (type === "character") return { ...base, w: 340, h: 220, data: { name: "New Character", role: "lead", hues: ["slate", "rain", "amber"] } }
    if (type === "storyboard") return { ...base, w: 420, h: 210, data: { title: "Storyboard", hues: ["slate", "rain", "amber", "forest"] } }
    if (type === "shotlist") return { ...base, w: 480, h: 260, data: { title: "Shot list", shots: [] } }
    if (type === "doc") return { ...base, w: 360, h: 260, data: { title: "Document", content: "<p>Write notes here.</p>" } }
    return { ...base, w: 240, h: 150, data: { text: "New note" } }
  },
  reset: () => set({ elements: [], viewport: DEFAULT_VIEWPORT, selectedId: null, draggingId: null }),
}))
