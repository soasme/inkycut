import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function proxy(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  })
  const isProtected =
    req.nextUrl.pathname.startsWith("/dashboard") || req.nextUrl.pathname.startsWith("/projects")

  if (process.env.E2E_AUTH_BYPASS === "1" && req.cookies.has("inkycut-e2e-user")) {
    return NextResponse.next()
  }

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  return NextResponse.next()
}

export const config = { matcher: ["/dashboard/:path*", "/projects/:path*"] }
