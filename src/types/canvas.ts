export type ElementType = "frame" | "character" | "doc" | "storyboard" | "shotlist" | "note"
export type MessageRole = "user" | "agent" | "stamp"

export interface FrameData {
  slug?: string
  hue?: string
  meta?: string
  ar?: string
  rec?: boolean
  duration?: number
  imageUrl?: string
}

export interface CharacterData {
  name: string
  role?: string
  hues?: string[]
  palette?: string[]
  imageUrl?: string
}

export interface DocData {
  title?: string
  content?: string
}

export interface StoryboardData {
  title: string
  hues?: string[]
  hasShotList?: boolean
}

export interface Shot {
  n: string
  d: string
  l: string
  m: string
  t: string
}

export interface ShotlistData {
  title: string
  shots?: Shot[]
}

export interface NoteData {
  text: string
}

export type ElementData = FrameData | CharacterData | DocData | StoryboardData | ShotlistData | NoteData

export interface CanvasElement {
  id: string
  projectId: string
  type: ElementType
  x: number
  y: number
  w: number
  h: number | null
  data: ElementData
  createdAt: Date
  updatedAt: Date
}

export interface CanvasViewport {
  x: number
  y: number
  scale: number
}
