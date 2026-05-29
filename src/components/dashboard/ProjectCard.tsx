"use client"

import { useState } from "react"
import Link from "next/link"
import { Frame } from "@/components/ui/Frame"
import { PublishModal } from "@/components/dashboard/PublishModal"

interface Project {
  id: string
  name: string
  updatedAt: Date | string
  coverElement: { type: string; data: unknown } | null
}

function timeAgo(date: Date | string) {
  const hours = Math.floor((Date.now() - new Date(date).getTime()) / 3_600_000)
  if (hours < 1) return "just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days < 7 ? `${days}d ago` : new Date(date).toLocaleDateString()
}

export function ProjectCard({ project, onDelete }: { project: Project; onDelete: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const data = (project.coverElement?.data ?? {}) as Record<string, unknown>
  const hue = (data.hue as "slate" | "amber" | "rain" | "crimson" | "forest" | undefined) ?? "slate"

  return (
    <article className="project-card">
      <Link href={`/projects/${project.id}`} className="project-thumb">
        <Frame hue={hue} style={{ aspectRatio: "16 / 9", borderRadius: 0 }} />
      </Link>
      <div className="project-info">
        <Link href={`/projects/${project.id}`}>
          <strong>{project.name}</strong>
          <span>{timeAgo(project.updatedAt)}</span>
        </Link>
      </div>
      <button aria-label="Publish project" className="project-publish" onClick={() => setShowPublish(true)}>
        Publish
      </button>
      <button aria-label="Delete project" className="project-delete" onClick={() => setConfirming(true)}>
        x
      </button>
      {confirming && (
        <div className="project-confirm">
          <p>Delete project?</p>
          <button onClick={() => onDelete(project.id)}>Delete</button>
          <button onClick={() => setConfirming(false)}>Cancel</button>
        </div>
      )}
      {showPublish && (
        <PublishModal
          projectId={project.id}
          projectName={project.name}
          isPublished={isPublished}
          onClose={() => setShowPublish(false)}
          onPublish={async (data) => {
            await fetch(`/api/ideas/${project.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
            setIsPublished(true)
          }}
          onUnpublish={async () => {
            await fetch(`/api/ideas/${project.id}`, { method: "DELETE" })
            setIsPublished(false)
          }}
        />
      )}
    </article>
  )
}
