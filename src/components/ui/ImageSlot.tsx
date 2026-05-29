import Image from "next/image"
import { Frame } from "@/components/ui/Frame"

export function ImageSlot({
  url,
  hue = "slate",
  alt = "",
  className,
  style,
}: {
  url: string | null | undefined
  hue?: "slate" | "amber" | "rain" | "crimson" | "forest"
  alt?: string
  className?: string
  style?: React.CSSProperties
}) {
  if (!url) return <Frame hue={hue} className={className} style={style} />
  return <Image src={url} alt={alt} fill sizes="420px" className={className} style={{ objectFit: "cover", ...style }} unoptimized={url.startsWith("/uploads/")} />
}
