import { test, expect, type Page } from "@playwright/test"
import { signInAs } from "./support/auth"
import { cleanupUser, createTestUser, insertElement, insertProject, insertUser } from "./support/db"

async function sendPrompt(page: Page, prompt: string) {
  const response = page.waitForResponse((item) => item.url().endsWith("/api/chat") && item.request().method() === "POST")
  await page.getByLabel("Chat prompt").fill(prompt)
  await page.getByRole("button", { name: "Send message" }).click()
  await (await response).finished()
}

test("OpenAI stub streams a persisted chat response through the app route", async ({ page, isMobile }) => {
  test.skip(isMobile, "Canvas chat coverage runs in desktop Chrome")
  const user = createTestUser("Chat Streaming")
  try {
    await insertUser(user)
    const project = await insertProject(user.id)
    await signInAs(page, user)
    await page.goto(`/projects/${project.id}`)

    await page.getByRole("button", { name: "Board a scene" }).click()
    await expect(page.getByLabel("Chat prompt")).toHaveValue("Board a scene")
    const response = page.waitForResponse((item) => item.url().endsWith("/api/chat") && item.request().method() === "POST")
    await page.getByRole("button", { name: "Send message" }).click()
    await (await response).finished()
    await expect(page.getByText("Stubbed E2E response.")).toBeVisible()
    await page.reload()
    await expect(page.locator(".chat-scroll").getByText("Board a scene")).toBeVisible()
    await expect(page.locator(".chat-scroll").getByText("Stubbed E2E response.")).toBeVisible()
  } finally {
    await cleanupUser(user.id)
  }
})

test("OpenAI stub tool calls create, update, delete, and connect canvas nodes", async ({ page, isMobile }) => {
  test.skip(isMobile, "Canvas chat coverage runs in desktop Chrome")
  const user = createTestUser("Chat Tools")
  try {
    await insertUser(user)
    const project = await insertProject(user.id)
    await insertElement(project.id, "note", { text: "AI target" })
    await insertElement(project.id, "frame", { slug: "ONE", duration: 0.05 })
    await insertElement(project.id, "frame", { slug: "TWO", duration: 0.05 })
    await signInAs(page, user)
    await page.goto(`/projects/${project.id}`)

    await sendPrompt(page, "E2E create frame")
    await expect(page.getByText("AI FRAME")).toBeVisible()
    await sendPrompt(page, "E2E update node")
    await expect(page.getByLabel("Note text")).toHaveValue("Updated by AI")
    await sendPrompt(page, "E2E connect frames")
    await page.getByRole("button", { name: "Export video" }).click()
    await expect(page.getByText(/Sequence 1: 2 frames/)).toBeVisible()
    await page.getByText(/Sequence 1: 2 frames/).click()
    const download = page.waitForEvent("download")
    await page.getByRole("button", { name: "Render" }).click()
    await expect(page.getByText("Export complete. Download started.")).toBeVisible({ timeout: 30_000 })
    expect((await download).suggestedFilename()).toBe("inkycut-sequence-1.mp4")
    await page.getByRole("button", { name: "Close" }).click()
    await sendPrompt(page, "E2E delete node")
    await expect(page.getByLabel("Note text")).toHaveCount(0)
  } finally {
    await cleanupUser(user.id)
  }
})

test("OpenAI stub generated image attaches to a frame and persists", async ({ page, isMobile }) => {
  test.skip(isMobile, "Canvas chat coverage runs in desktop Chrome")
  const user = createTestUser("Chat Image")
  try {
    await insertUser(user)
    const project = await insertProject(user.id)
    await insertElement(project.id, "frame", { slug: "IMAGE TARGET" })
    await signInAs(page, user)
    await page.goto(`/projects/${project.id}`)

    await sendPrompt(page, "E2E generate image")
    await expect(page.getByTestId("canvas-node-frame").locator("img")).toBeVisible()
    await page.reload()
    await expect(page.getByTestId("canvas-node-frame").locator("img")).toBeVisible()
  } finally {
    await cleanupUser(user.id)
  }
})
