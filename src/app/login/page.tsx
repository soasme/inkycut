import { redirect } from "next/navigation"
import { auth, signIn } from "@/lib/auth"
import { LogoMark } from "@/components/ui/Logo"

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--paper)",
      }}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r)",
          boxShadow: "var(--shadow-3)",
          padding: "32px 28px",
          width: 320,
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 }}>
          <LogoMark />
          <span style={{ fontWeight: 800, fontSize: 18 }}>Inkycut</span>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Sign in to continue</h1>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 22, lineHeight: 1.45 }}>Your canvas is waiting.</p>

        <form
          action={async () => {
            "use server"
            await signIn("google", { redirectTo: "/dashboard" })
          }}
        >
          <button
            type="submit"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: "100%",
              padding: "11px 16px",
              borderRadius: 999,
              border: "1.5px solid var(--line)",
              background: "#fff",
              fontFamily: "var(--sans)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink)",
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>

        <p style={{ marginTop: 16, fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.5 }}>
          By signing in you agree to our terms of service.
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
