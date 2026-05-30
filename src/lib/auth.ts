import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { cookies } from "next/headers"
import { db } from "./db"
import { accounts, users } from "./db/schema"

const nextAuth = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
  }),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string
      return session
    },
  },
  pages: { signIn: "/login" },
})

export const { handlers, signIn, signOut } = nextAuth

export async function auth() {
  if (process.env.E2E_AUTH_BYPASS === "1") {
    const value = (await cookies()).get("inkycut-e2e-user")?.value
    if (value) {
      const user = JSON.parse(decodeURIComponent(value)) as {
        id: string
        name?: string
        email?: string
        image?: string
      }
      return {
        user: {
          id: user.id,
          name: user.name ?? null,
          email: user.email ?? null,
          image: user.image ?? null,
        },
        expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }
    }
  }

  return nextAuth.auth()
}
