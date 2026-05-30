import Link from "next/link"
import { FilterBar } from "@/components/ideas/FilterBar"
import { IdeaCard } from "@/components/ideas/IdeaCard"
import { Nav } from "@/components/layout/Nav"
import { getPublishedIdeas } from "@/lib/db/queries/ideas"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function IdeasPage() {
  const ideas = await getPublishedIdeas(60)
  const featured = ideas.slice(0, 2)
  const rest = ideas.slice(2)

  return (
    <>
      <Nav activeHref="/ideas" />
      <section className="section gallery-head">
        <div className="wrap">
          <span className="eyebrow">Community canvas</span>
          <h1>
            What people are <span className="em">making.</span>
          </h1>
          <p className="lead">Every project starts with a single idea. Here is where they end up.</p>
          <FilterBar total={ideas.length} />
        </div>
      </section>
      <div className="wrap">
        {featured.length > 0 && (
          <div className="feature">
            {featured.map((idea, index) => (
              <IdeaCard key={idea.id} idea={idea} index={index} big={index === 0} />
            ))}
          </div>
        )}
        {rest.length > 0 && (
          <div className="masonry">
            {rest.map((idea, index) => (
              <IdeaCard key={idea.id} idea={idea} index={index + 2} />
            ))}
          </div>
        )}
        {ideas.length === 0 && (
          <div className="empty-gallery">
            <p>No ideas published yet.</p>
            <Link className="btn btn-accent" href="/login">
              Start creating
            </Link>
          </div>
        )}
        <div className="ideas-cta">
          <div>
            <h2>Start your own.</h2>
            <p>Open a canvas and let an idea run.</p>
          </div>
          <Link className="btn btn-accent" href="/login">
            Open Inkycut
          </Link>
        </div>
      </div>
    </>
  )
}
