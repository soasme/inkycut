interface FrameProps {
  hue?: "slate" | "amber" | "rain" | "crimson" | "forest"
  slug?: string
  meta?: string
  rec?: boolean
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function Frame({ hue = "slate", slug, meta, rec, children, className, style }: FrameProps) {
  const classNames = `frame f-${hue}${className ? ` ${className}` : ""}`

  return (
    <div className={classNames} style={style}>
      {slug && (
        <span className="slug">
          {rec && <span className="rec" />}
          {slug}
        </span>
      )}
      <div className="ticks" />
      {meta && <span className="meta">{meta}</span>}
      {children}
    </div>
  )
}
