"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { NewProjectModal } from "@/components/dashboard/NewProjectModal"
import { ProjectCard } from "@/components/dashboard/ProjectCard"

interface Project {
  id: string
  name: string
  updatedAt: Date | string
  coverElement: { type: string; data: unknown } | null
}

export function ProjectGrid({ initialProjects }: { initialProjects: Project[] }) {
  const router = useRouter()
  const [projects, setProjects] = useState(initialProjects)
  const [showModal, setShowModal] = useState(false)

  async function create(name: string) {
    const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) })
    if (!res.ok) return
    const project = await res.json()
    router.push(`/projects/${project.id}`)
  }

  async function remove(id: string) {
    const previous = projects
    setProjects((items) => items.filter((item) => item.id !== id))
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" })
    if (!res.ok) setProjects(previous)
  }

  return (
    <>
      <div className="dashboard-head">
        <h1>My Projects</h1>
        <button className="btn btn-accent" onClick={() => setShowModal(true)}>
          New project
        </button>
      </div>
      <div className="project-grid">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} onDelete={remove} />
        ))}
        {projects.length === 0 && (
          <button className="empty-project" onClick={() => setShowModal(true)}>
            +
          </button>
        )}
      </div>
      {showModal && <NewProjectModal onClose={() => setShowModal(false)} onCreate={create} />}
    </>
  )
}
