import { test, expect } from "@playwright/test"
import { addE2EUserCookie } from "./support/auth"
import { cleanupUser, createTestUser, insertProject, insertUser } from "./support/db"

test("two owner sessions see presence, cursor, and live element changes", async ({ browser, baseURL, isMobile }) => {
  test.skip(isMobile, "Canvas collaboration coverage runs in desktop Chrome")
  const user = createTestUser("Collaboration")
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  try {
    await insertUser(user)
    const project = await insertProject(user.id)
    await addE2EUserCookie(contextA, user, baseURL!)
    await addE2EUserCookie(contextB, user, baseURL!)
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()
    await pageA.goto(`/projects/${project.id}`)
    await pageB.goto(`/projects/${project.id}`)

    await expect(pageA.getByTestId("collaborator-avatar")).toHaveCount(1)
    await pageB.getByTestId("canvas-stage").hover({ position: { x: 180, y: 160 } })
    await expect(pageA.getByTestId("collaborator-cursor")).toContainText(user.name)

    const createdResponse = pageA.waitForResponse(
      (response) => response.url().endsWith("/api/elements") && response.request().method() === "POST",
    )
    await pageA.getByRole("button", { name: "Add Frame" }).click()
    const element = (await (await createdResponse).json()) as { id: string }
    const remoteNode = pageB.locator(`[data-element-id="${element.id}"]`)
    await expect(remoteNode).toBeVisible()

    await pageA.evaluate(async ({ id }) => {
      await fetch(`/api/elements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x: 480, y: 320 }),
      })
    }, element)
    await expect(remoteNode).toHaveCSS("left", "480px")
    await expect(remoteNode).toHaveCSS("top", "320px")

    await pageA.evaluate(async ({ id }) => {
      await fetch(`/api/elements/${id}`, { method: "DELETE" })
    }, element)
    await expect(remoteNode).toHaveCount(0)

    await contextB.close()
    await expect(pageA.getByTestId("collaborator-avatar")).toHaveCount(0)
  } finally {
    await contextA.close()
    await contextB.close()
    await cleanupUser(user.id)
  }
})
