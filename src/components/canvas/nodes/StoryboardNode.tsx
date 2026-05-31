import { Frame } from "@/components/ui/Frame"
import type { CanvasElement, StoryboardData } from "@/types/canvas"
import { NHead } from "@/components/canvas/nodes/NodeWrapper"

export function StoryboardNode({ element, onGenerateShotlist, busy }: { element: CanvasElement; onGenerateShotlist: (element: CanvasElement) => void; busy: boolean }) {
  const data = element.data as StoryboardData
  const hues = data.hues ?? ["slate", "rain", "amber", "forest"]
  return (
    <>
      <NHead label={data.title ?? "Storyboard"} type="board" />
      <div className="sb-body">
        <div className="sb-strip">
          {hues.map((hue, index) => (
            <Frame key={`${hue}-${index}`} hue={hue as "slate"} slug={`S${index + 1}`} />
          ))}
        </div>
        <div className="sb-foot">
          <span className="lbl">sequence sketch</span>
          <button type="button" data-no-drag className="btn-mini" disabled={busy} onClick={() => onGenerateShotlist(element)}>
            Shot list
          </button>
        </div>
      </div>
    </>
  )
}
