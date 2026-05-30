import { test, expect } from "@playwright/test"
import { signInAs } from "./support/auth"
import { cleanupUser, createTestUser, e2eName, insertProject, insertUser } from "./support/db"

test("user creates canvas nodes and edits a note", async ({ page, isMobile }) => {
  test.skip(isMobile, "Canvas editing coverage runs in desktop Chrome")

  const user = createTestUser("Canvas")
  await insertUser(user)
  const project = await insertProject(user.id, e2eName("Canvas Project"))
  await signInAs(page, user)

  try {
    await page.goto(`/projects/${project.id}`)
    await expect(page.getByTestId("canvas-stage")).toBeVisible()
    await expect(page.getByRole("button", { name: "Export video" })).toBeVisible()

    for (const tool of ["Frame", "Character", "Storyboard", "Shot list", "Doc", "Note"]) {
      const createResponse = page.waitForResponse(
        (response) => response.url().includes("/api/elements") && response.request().method() === "POST",
      )
      await page.getByRole("button", { name: `Add ${tool}` }).click()
      await expect((await createResponse).status()).toBe(201)
    }

    await expect(page.getByTestId("canvas-node-frame")).toBeVisible()
    await expect(page.getByTestId("canvas-node-character")).toBeVisible()
    await expect(page.getByTestId("canvas-node-storyboard")).toBeVisible()
    await expect(page.getByTestId("canvas-node-shotlist")).toBeVisible()
    await expect(page.getByTestId("canvas-node-doc")).toBeVisible()

    const note = page.getByLabel("Note text").first()
    const notePatch = page.waitForResponse((response) => {
      const request = response.request()
      return (
        request.method() === "PATCH" &&
        response.url().includes("/api/elements/") &&
        request.postData()?.includes("Updated E2E note") === true
      )
    })
    await note.fill("Updated E2E note")
    await expect((await notePatch).status()).toBe(200)
    await expect(note).toHaveValue("Updated E2E note")

    await page.reload()
    await expect(page.getByLabel("Note text").first()).toHaveValue("Updated E2E note")

    await page.getByRole("button", { name: "Export video" }).click()
    await expect(page.getByText("No connected frame sequences found.")).toBeVisible()
    await page.getByRole("button", { name: "Close" }).click()
  } finally {
    await cleanupUser(user.id)
  }
})

test("user sends chat and uploads a frame image through stubbed integrations", async ({ page, isMobile }) => {
  test.skip(isMobile, "Canvas integration coverage runs in desktop Chrome")

  const user = createTestUser("Integrations")
  await insertUser(user)
  const project = await insertProject(user.id, e2eName("Integrations Project"))
  await signInAs(page, user)

  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: [
        `data: ${JSON.stringify({ type: "text", content: "Stubbed chat reply." })}`,
        `data: ${JSON.stringify({ type: "done" })}`,
        "",
      ].join("\n\n"),
    })
  })
  await page.route("**/api/upload", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: "/uploads/e2e-stub.png" }),
    })
  })

  try {
    await page.goto(`/projects/${project.id}`)
    await expect(page.getByTestId("canvas-stage")).toBeVisible()

    await page.getByLabel("Chat prompt").fill("Board a test scene")
    await page.getByRole("button", { name: "Send message" }).click()
    await expect(page.getByText("Board a test scene")).toBeVisible()
    await expect(page.getByText("Stubbed chat reply.")).toBeVisible()

    const createResponse = page.waitForResponse(
      (response) => response.url().includes("/api/elements") && response.request().method() === "POST",
    )
    await page.getByRole("button", { name: "Add Frame" }).click()
    await expect((await createResponse).status()).toBe(201)

    const uploadPatch = page.waitForResponse((response) => {
      const request = response.request()
      return (
        request.method() === "PATCH" &&
        response.url().includes("/api/elements/") &&
        request.postData()?.includes("/uploads/e2e-stub.png") === true
      )
    })
    await page.getByLabel("Upload frame image").setInputFiles({
      name: "frame.png",
      mimeType: "image/png",
      buffer: Buffer.from("stub image"),
    })
    await expect((await uploadPatch).status()).toBe(200)

    await page.reload()
    await expect(page.locator('img[src="/uploads/e2e-stub.png"]')).toBeVisible()
  } finally {
    await cleanupUser(user.id)
  }
})

test("mobile browser sees the canvas support gate", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile gate coverage only runs in the mobile project")

  const user = createTestUser("Mobile Gate")
  await insertUser(user)
  const project = await insertProject(user.id, e2eName("Mobile Gate Project"))
  await signInAs(page, user)

  try {
    await page.goto(`/projects/${project.id}`)
    await expect(page.getByRole("heading", { name: "Canvas requires Chrome on desktop" })).toBeVisible()
    await page.getByRole("link", { name: "Back to dashboard" }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  } finally {
    await cleanupUser(user.id)
  }
})
