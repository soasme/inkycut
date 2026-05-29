import { Frame } from "@/components/ui/Frame"
import type { CanvasElement, CharacterData } from "@/types/canvas"
import { NHead } from "@/components/canvas/nodes/NodeWrapper"

export function CharacterNode({ element }: { element: CanvasElement }) {
  const data = element.data as CharacterData
  const hues = data.hues ?? ["slate", "rain", "amber"]
  return (
    <>
      <NHead label="Character" type="universe" />
      <div className="char-body">
        <div className="char-meta">
          <span className="cn">{data.name}</span>
          <span className="cr">{data.role}</span>
        </div>
        <div className="char-row">
          <Frame hue={hues[0] as "slate"} slug="FRONT" />
          <Frame hue={hues[1] as "slate"} slug="3/4" />
          <Frame hue={hues[2] as "slate"} slug="BACK" />
        </div>
      </div>
    </>
  )
}
