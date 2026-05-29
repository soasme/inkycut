import type { CanvasElement, ShotlistData } from "@/types/canvas"
import { NHead } from "@/components/canvas/nodes/NodeWrapper"

export function ShotlistNode({ element }: { element: CanvasElement }) {
  const data = element.data as ShotlistData
  const shots = data.shots ?? []
  return (
    <>
      <NHead label={data.title ?? "Shot list"} type="shots" />
      <div className="sl-body">
        <div className="sl-h">
          <span>#</span>
          <span>Description</span>
          <span>Lens</span>
          <span>Move</span>
          <span>Time</span>
        </div>
        {shots.map((shot) => (
          <div key={shot.n} className="sl-r">
            <span className="n">{shot.n}</span>
            <span className="d">{shot.d}</span>
            <span className="l">{shot.l}</span>
            <span className="m">{shot.m}</span>
            <span className="t">{shot.t}</span>
          </div>
        ))}
      </div>
    </>
  )
}
