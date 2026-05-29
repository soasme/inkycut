import type { CanvasElement, DocData } from "@/types/canvas"
import { NHead } from "@/components/canvas/nodes/NodeWrapper"

export function DocNode({ element }: { element: CanvasElement }) {
  const data = element.data as DocData
  return (
    <>
      <NHead label={data.title ?? "Document"} type="doc" />
      <div className="doc-body" data-no-drag>
        <div dangerouslySetInnerHTML={{ __html: data.content ?? "" }} />
      </div>
    </>
  )
}
