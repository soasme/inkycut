import Link from "next/link"
import { Logo } from "@/components/ui/Logo"

interface NavProps {
  activeHref?: string
}

export function Nav({ activeHref }: NavProps) {
  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Logo />
        <nav className="nav-links">
          <Link href="/" className={activeHref === "/" ? "active" : ""}>
            Product
          </Link>
          <Link href="/ideas" className={activeHref === "/ideas" ? "active" : ""}>
            Ideas
          </Link>
          <a href="#how">How it works</a>
        </nav>
        <div className="nav-cta">
          <Link className="signin" href="/login">
            Sign in
          </Link>
          <Link className="btn btn-accent" href="/login">
            Open Inkycut →
          </Link>
        </div>
      </div>
    </header>
  )
}
