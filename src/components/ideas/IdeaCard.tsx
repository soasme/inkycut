import { Frame } from "@/components/ui/Frame"

interface Idea {
  id: string
  title: string
  description?: string | null
  genre?: string | null
  tags?: string[] | null
  publishedAt?: Date | string | null
  userName?: string | null
}

function timeAgo(date: Date | string | null | undefined) {
  if (!date) return ""
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
  if (days < 1) return "today"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

const HUES: Array<"slate" | "amber" | "rain" | "crimson" | "forest"> = ["slate", "rain", "amber", "crimson", "forest"]

export function IdeaCard({ idea, index, big = false }: { idea: Idea; index: number; big?: boolean }) {
  const initials = (idea.userName ?? "?").slice(0, 2).toUpperCase()
  return (
    <article className={big ? "ucard big" : "ucard"}>
      <div className="art">
        <Frame hue={HUES[index % HUES.length]} className={big ? "wide" : "tall"} />
        {big && <div className="badge-tl">{idea.genre ?? "Video"}</div>}
      </div>
      <div className="body">
        <div className="title-row">
          <h3>{idea.title}</h3>
          {idea.genre && !big && <span className="genre">{idea.genre}</span>}
        </div>
        <div className="by">
          <span className="av">{initials}</span>
          {idea.userName} · {timeAgo(idea.publishedAt)}
        </div>
        {idea.description && (
          <div className="meta-row">
            <span className="mchip">{idea.description.slice(0, 64)}</span>
            <span className="remix">Remix</span>
          </div>
        )}
        {idea.tags && (
          <div className="meta-row">
            {idea.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="mchip">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
