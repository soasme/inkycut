import { test, expect } from "@playwright/test"
import { cleanupUser, createTestUser, insertProject, insertUser, publishIdea } from "./support/db"

test("visitor can navigate public landing and ideas pages", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: /idea to finished video/i })).toBeVisible()

  await page.getByRole("link", { name: /see what people make/i }).click()
  await expect(page).toHaveURL(/\/ideas$/)
  await expect(page.getByRole("heading", { name: /what people are making/i })).toBeVisible()

  await page.getByRole("link", { name: "Open Inkycut", exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible()
})

test("ideas gallery shows published projects", async ({ page }) => {
  const user = createTestUser("Ideas")
  const title = `Published ${user.id}`
  await insertUser(user)
  const project = await insertProject(user.id, e2eProjectName(title))
  await publishIdea({
    projectId: project.id,
    userId: user.id,
    title,
    description: "A seeded E2E gallery item.",
    genre: "Sci-Fi",
  })

  try {
    await page.goto("/ideas")
    await expect(page.getByText(title)).toBeVisible()
    await expect(page.getByText("A seeded E2E gallery item.")).toBeVisible()
    await expect(page.getByRole("article").filter({ hasText: title }).getByText(/sci-fi/i)).toBeVisible()
  } finally {
    await cleanupUser(user.id)
  }
})

function e2eProjectName(title: string) {
  return title.replace("Published", "Project")
}
