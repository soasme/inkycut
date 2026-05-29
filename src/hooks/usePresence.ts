import { create } from "zustand"

export interface Collaborator {
  userId: string
  name: string
  image?: string
  cursor?: { x: number; y: number }
}

interface PresenceStore {
  collaborators: Collaborator[]
  addCollaborator: (collaborator: Collaborator) => void
  removeCollaborator: (userId: string) => void
  updateCursor: (userId: string, cursor: { x: number; y: number }) => void
  reset: () => void
}

export const usePresenceStore = create<PresenceStore>((set) => ({
  collaborators: [],
  addCollaborator: (collaborator) =>
    set((state) => ({
      collaborators: state.collaborators.some((item) => item.userId === collaborator.userId)
        ? state.collaborators
        : [...state.collaborators, collaborator],
    })),
  removeCollaborator: (userId) => set((state) => ({ collaborators: state.collaborators.filter((item) => item.userId !== userId) })),
  updateCursor: (userId, cursor) =>
    set((state) => ({ collaborators: state.collaborators.map((item) => (item.userId === userId ? { ...item, cursor } : item)) })),
  reset: () => set({ collaborators: [] }),
}))
