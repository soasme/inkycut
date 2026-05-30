"use client"

import { useState } from "react"

const GENRES = ["All", "Action", "Drama", "Comedy", "Sci-Fi", "Horror", "Documentary", "Animation"]

export function FilterBar({ total, onFilter }: { total: number; onFilter?: (genre: string) => void }) {
  const [active, setActive] = useState("All")
  return (
    <div className="filters">
      {GENRES.map((genre) => (
        <button
          key={genre}
          type="button"
          className={active === genre ? "filt on" : "filt"}
          onClick={() => {
            setActive(genre)
            onFilter?.(genre)
          }}
        >
          {genre}
        </button>
      ))}
      <span className="sp">{total} projects</span>
    </div>
  )
}
