"use client"

import { useEffect, useRef, useState } from "react"

export function NewProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => inputRef.current?.focus(), [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || loading) return
    setLoading(true)
    await onCreate(name.trim())
    setLoading(false)
  }

  return (
    <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-panel" onSubmit={submit}>
        <h2>New project</h2>
        <input ref={inputRef} value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" maxLength={80} />
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-accent" disabled={!name.trim() || loading}>
            {loading ? "Creating..." : "Create project"}
          </button>
        </div>
      </form>
    </div>
  )
}
