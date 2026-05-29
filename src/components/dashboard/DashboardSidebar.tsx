"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { LogoMark } from "@/components/ui/Logo"

function SidebarIcon({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      title={label}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        display: "grid",
        placeItems: "center",
        color: active ? "#fff" : "var(--ink-2)",
        background: active ? "var(--accent)" : "transparent",
        fontFamily: "var(--mono)",
        fontSize: 12,
      }}
    >
      {label.slice(0, 1)}
    </Link>
  )
}

export function DashboardSidebar() {
  const pathname = usePathname()
  return (
    <aside style={{ width: 56, background: "var(--card)", borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: 8 }}>
      <Link href="/" title="Inkycut home">
        <LogoMark />
      </Link>
      <SidebarIcon href="/dashboard" label="Projects" active={pathname === "/dashboard"} />
      <SidebarIcon href="/ideas" label="Ideas" active={pathname.startsWith("/ideas")} />
      <div style={{ flex: 1 }} />
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        title="Sign out"
        style={{ width: 36, height: 36, border: 0, background: "transparent", color: "var(--ink-soft)", cursor: "pointer" }}
      >
        out
      </button>
    </aside>
  )
}
