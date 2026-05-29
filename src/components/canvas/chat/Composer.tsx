"use client"

export function Composer({
  draft,
  setDraft,
  onSend,
  thinking,
  taRef,
}: {
  draft: string
  setDraft: (value: string) => void
  onSend: () => void
  thinking: boolean
  taRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  function keyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      onSend()
    }
  }

  return (
    <div className="composer">
      <div className="quick-row">
        {["Board a scene", "Make a shot list", "New character"].map((item) => (
          <button key={item} type="button" className="chip-act" onClick={() => setDraft(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="composer-box">
        <textarea ref={taRef} rows={1} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={keyDown} placeholder="Start from an idea..." />
        <div className="composer-foot">
          <span className="model-pill">Video Specialist</span>
          <button type="button" className="send-btn" disabled={thinking || !draft.trim()} onClick={onSend}>
            →
          </button>
        </div>
      </div>
    </div>
  )
}
