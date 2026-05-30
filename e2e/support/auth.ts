import type { BrowserContext, Page } from "@playwright/test"
import type { TestUser } from "./db"

const cookieName = "inkycut-e2e-user"

export async function addE2EUserCookie(context: BrowserContext, user: TestUser, baseURL: string) {
  await context.addCookies([
    {
      name: cookieName,
      value: encodeURIComponent(JSON.stringify(user)),
      url: baseURL,
      sameSite: "Lax",
      httpOnly: true,
    },
  ])
}

export async function signInAs(page: Page, user: TestUser) {
  const baseURL = `http://127.0.0.1:${process.env.PORT ?? "3000"}`
  await addE2EUserCookie(page.context(), user, baseURL)
}
