import Link from "next/link"

interface LogoProps {
  href?: string
  showName?: boolean
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span className="logo-mark" aria-hidden="true" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M7 4.6 L18.2 11.4 L7 18.2 Z" fill="#fff" />
        <path d="M4.5 19.5 L19 5.5" stroke="#2f9fe0" strokeWidth="2.1" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export function Logo({ href = "/", showName = true }: LogoProps) {
  return (
    <Link className="logo" href={href}>
      <LogoMark />
      {showName && "Inkycut"}
    </Link>
  )
}
