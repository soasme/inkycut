import { test, expect } from "@playwright/test"
import { signInAs } from "./support/auth"
import { cleanupUser, createTestUser, insertConnection, insertElement, insertProject, insertUser } from "./support/db"

test("user selects a connected frame sequence and downloads an MP4", async ({ page, isMobile }) => {
  test.skip(isMobile, "Video export coverage runs in desktop Chrome")
  const user = createTestUser("Export")
  try {
    await insertUser(user)
    const project = await insertProject(user.id)
    const first = await insertElement(project.id, "frame", { slug: "ONE", duration: 0.05 })
    const second = await insertElement(project.id, "frame", { slug: "TWO", duration: 0.05 })
    await insertConnection(project.id, first.id, second.id)
    await signInAs(page, user)
    await page.goto(`/projects/${project.id}`)

    await page.getByRole("button", { name: "Export video" }).click()
    await expect(page.getByText("Sequence 1: 2 frames · 0.1s")).toBeVisible()
    await page.getByText("Sequence 1: 2 frames · 0.1s").click()
    const download = page.waitForEvent("download")
    await page.getByRole("button", { name: "Render" }).click()
    await expect(page.getByText("Export complete. Download started.")).toBeVisible({ timeout: 30_000 })
    expect((await download).suggestedFilename()).toBe("inkycut-sequence-1.mp4")
  } finally {
    await cleanupUser(user.id)
  }
})
