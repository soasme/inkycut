"use client"

import { LogoMark } from "@/components/ui/Logo"
import type { Collaborator } from "@/hooks/usePresence"

export function CanvasTopbar({
  projectName,
  collaborators,
  onExport,
}: {
  projectName: string
  collaborators: Collaborator[]
  onExport: () => void
}) {
  return (
    <header className="topbar">
      <div className="tb-group">
        <LogoMark size={28} />
        <span className="tb-name">{projectName}</span>
      </div>
      <div className="tb-right">
        <div className="avatars">
          {collaborators.slice(0, 4).map((collaborator) => (
            <span key={collaborator.userId} className="av" style={{ background: "var(--accent)" }}>
              {(collaborator.name || collaborator.userId).slice(0, 2).toUpperCase()}
            </span>
          ))}
        </div>
        <button type="button" className="btn btn-accent" onClick={onExport}>
          Export video
        </button>
      </div>
    </header>
  )
}
