import { test, expect } from "@playwright/test"
import { signInAs } from "./support/auth"
import { cleanupUser, createTestUser, e2eName, insertProject, insertUser } from "./support/db"

test("user creates canvas nodes and edits a note", async ({ page, isMobile }) => {
  test.skip(isMobile, "Canvas editing coverage runs in desktop Chrome")

  const user = createTestUser("Canvas")

  try {
    await insertUser(user)
    const project = await insertProject(user.id, e2eName("Canvas Project"))
    await signInAs(page, user)

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

    await page.getByRole("button", { name: "Ask a specialist" }).click()
    await expect(page.getByLabel("Chat prompt")).toBeFocused()
    await page.getByTestId("canvas-node-storyboard").locator(".nhead").click()
    await page.getByTestId("canvas-node-storyboard").getByRole("button", { name: "Shot list" }).click()
    await expect(page.getByLabel("Chat prompt")).toBeFocused()

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

    const projectName = e2eName("Renamed Canvas")
    const projectPatch = page.waitForResponse((response) => {
      const request = response.request()
      return request.method() === "PATCH" && response.url().includes(`/api/projects/${project.id}`) && request.postData()?.includes(projectName) === true
    })
    await page.getByLabel("Project name").fill(projectName)
    await page.getByLabel("Project name").blur()
    await expect((await projectPatch).status()).toBe(200)

    const draggableNote = page.getByTestId("canvas-node-note").first()
    const originalNoteBox = await draggableNote.boundingBox()
    if (!originalNoteBox) throw new Error("Note box missing")
    const nodePatch = page.waitForResponse((response) => {
      const request = response.request()
      return request.method() === "PATCH" && response.url().includes("/api/elements/") && request.postData()?.includes('"x"') === true
    })
    await page.mouse.move(originalNoteBox.x + 20, originalNoteBox.y + 20)
    await page.mouse.down()
    await page.mouse.move(originalNoteBox.x + 180, originalNoteBox.y + 140)
    await page.mouse.up()
    await expect((await nodePatch).status()).toBe(200)

    const layer = page.getByTestId("canvas-layer")
    const originalTransform = await layer.evaluate((element) => (element as HTMLElement).style.transform)
    const viewportPatch = page.waitForResponse((response) => {
      const request = response.request()
      return request.method() === "PATCH" && response.url().includes(`/api/projects/${project.id}`) && request.postData()?.includes("viewport") === true
    })
    await page.getByTestId("canvas-stage").hover({ position: { x: 40, y: 40 } })
    await page.mouse.wheel(0, -100)
    await expect((await viewportPatch).status()).toBe(200)
    expect(await layer.evaluate((element) => (element as HTMLElement).style.transform)).not.toBe(originalTransform)

    const zoomedTransform = await layer.evaluate((element) => (element as HTMLElement).style.transform)
    const stageBox = await page.getByTestId("canvas-stage").boundingBox()
    if (!stageBox) throw new Error("Stage box missing")
    const panPatch = page.waitForResponse((response) => {
      const request = response.request()
      return request.method() === "PATCH" && response.url().includes(`/api/projects/${project.id}`) && request.postData()?.includes("viewport") === true
    })
    await page.mouse.move(stageBox.x + 40, stageBox.y + 40)
    await page.mouse.down()
    await page.mouse.move(stageBox.x + 140, stageBox.y + 120)
    await page.mouse.up()
    await expect((await panPatch).status()).toBe(200)
    expect(await layer.evaluate((element) => (element as HTMLElement).style.transform)).not.toBe(zoomedTransform)

    const buttonZoomPatch = page.waitForResponse((response) => {
      const request = response.request()
      return request.method() === "PATCH" && response.url().includes(`/api/projects/${project.id}`) && request.postData()?.includes("viewport") === true
    })
    await page.getByRole("button", { name: "+" }).click()
    await expect((await buttonZoomPatch).status()).toBe(200)

    await page.reload()
    await expect(page.getByLabel("Project name")).toHaveValue(projectName)
    await expect(page.getByLabel("Note text").first()).toHaveValue("Updated E2E note")
    const movedNoteBox = await page.getByTestId("canvas-node-note").first().boundingBox()
    expect(movedNoteBox?.x).not.toBe(originalNoteBox.x)
    expect(await page.getByTestId("canvas-layer").evaluate((element) => (element as HTMLElement).style.transform)).not.toBe(originalTransform)

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
    await insertUser(user)
    const project = await insertProject(user.id, e2eName("Integrations Project"))
    await signInAs(page, user)

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

  try {
    await insertUser(user)
    const project = await insertProject(user.id, e2eName("Mobile Gate Project"))
    await signInAs(page, user)

    await page.goto(`/projects/${project.id}`)
    await expect(page.getByRole("heading", { name: "Canvas requires Chrome on desktop" })).toBeVisible()
    await page.getByRole("link", { name: "Back to dashboard" }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  } finally {
    await cleanupUser(user.id)
  }
})
