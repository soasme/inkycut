"use client"

import { useState } from "react"

const GENRES = ["Action", "Drama", "Comedy", "Sci-Fi", "Horror", "Documentary", "Animation", "Other"]

export function PublishModal({
  projectName,
  idea,
  onClose,
  onPublish,
  onUnpublish,
}: {
  projectId: string
  projectName: string
  idea: { title: string; description: string | null; genre: string | null } | null
  onClose: () => void
  onPublish: (data: { title: string; description: string; genre: string }) => Promise<void>
  onUnpublish: () => Promise<void>
}) {
  const [title, setTitle] = useState(idea?.title ?? projectName)
  const [description, setDescription] = useState(idea?.description ?? "")
  const [genre, setGenre] = useState(idea?.genre ?? "Drama")
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim() || loading) return
    setLoading(true)
    await onPublish({ title: title.trim(), description, genre })
    setLoading(false)
    onClose()
  }

  async function unpublish() {
    setLoading(true)
    await onUnpublish()
    setLoading(false)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-panel" onSubmit={submit}>
        <h2>Publish to Ideas gallery</h2>
        {idea && <p className="modal-note">Currently published. Update or unpublish below.</p>}
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" maxLength={80} />
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" maxLength={200} />
        <select value={genre} onChange={(event) => setGenre(event.target.value)}>
          {GENRES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <div className="modal-actions">
          {idea && (
            <button type="button" className="btn btn-ghost" disabled={loading} onClick={unpublish}>
              Unpublish
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-accent" disabled={!title.trim() || loading}>
            {idea ? "Update" : "Publish"}
          </button>
        </div>
      </form>
    </div>
  )
}
