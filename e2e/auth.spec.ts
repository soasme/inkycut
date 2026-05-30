import { test, expect } from "@playwright/test"
import { signInAs } from "./support/auth"
import { cleanupUser, createTestUser, insertUser } from "./support/db"

test("protected pages redirect unauthenticated visitors to login", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible()
})

test("authenticated visitor is redirected away from login to dashboard", async ({ page }) => {
  const user = createTestUser("Auth")
  await insertUser(user)

  try {
    await signInAs(page, user)
    await page.goto("/login")
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole("heading", { name: "My Projects" })).toBeVisible()
  } finally {
    await cleanupUser(user.id)
  }
})
