"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"

function isSupported() {
  if (typeof navigator === "undefined") return false
  return /Chrome/.test(navigator.userAgent) && !/Mobile|Android|iPhone|iPad/.test(navigator.userAgent)
}

export function BrowserGate({ children }: { children: React.ReactNode }) {
  const supported = useSyncExternalStore(
    () => () => undefined,
    isSupported,
    () => false,
  )

  if (supported) return <>{children}</>

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--ink)", color: "#fff" }}>
      <div style={{ textAlign: "center", maxWidth: 420, padding: "0 24px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Canvas requires Chrome on desktop</h1>
        <p style={{ color: "rgba(255,255,255,.68)", fontSize: 15, lineHeight: 1.55, marginBottom: 24 }}>
          Inkycut uses browser APIs for canvas editing and video rendering. Open this project in desktop Chrome to continue.
        </p>
        <Link href="/dashboard" className="btn btn-accent">
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
