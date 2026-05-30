"use client"

import { useRef } from "react"
import { ImageSlot } from "@/components/ui/ImageSlot"
import type { CanvasElement, FrameData } from "@/types/canvas"

export function FrameNode({ element, onImageUpload }: { element: CanvasElement; onImageUpload: (elementId: string, url: string) => void }) {
  const data = element.data as FrameData
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: form })
    if (!res.ok) return
    const { url } = await res.json()
    onImageUpload(element.id, url)
  }

  return (
    <div className="fwrap" style={{ aspectRatio: data.ar ?? "16 / 9" }}>
      <div className="fhandle nh-drag" />
      <ImageSlot url={data.imageUrl} hue={(data.hue as "slate") ?? "slate"} style={{ position: "absolute", inset: 0 }} />
      <span className="fslug">
        {data.rec && <span className="rec" />}
        {data.slug ?? "FRAME"}
      </span>
      <span className="fmeta">{data.meta ?? "16:9"}</span>
      <button type="button" data-no-drag className="image-upload-btn" onClick={() => inputRef.current?.click()}>
        image
      </button>
      <input
        ref={inputRef}
        aria-label="Upload frame image"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: "none" }}
        onChange={handleFile}
      />
    </div>
  )
}
