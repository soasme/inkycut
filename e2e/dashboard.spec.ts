import { test, expect } from "@playwright/test"
import { signInAs } from "./support/auth"
import { cleanupUser, createTestUser, e2eName, insertProject, insertUser } from "./support/db"

test("user creates, opens, and deletes projects", async ({ page, isMobile }) => {
  test.skip(isMobile, "Project creation opens the Chrome desktop-only canvas")

  const user = createTestUser("Dashboard")

  try {
    await insertUser(user)
    await signInAs(page, user)

    const projectName = e2eName("Created Project")
    await page.goto("/dashboard")
    await page.getByRole("button", { name: "New project" }).click()
    await page.getByPlaceholder("Project name").fill(projectName)
    const createResponse = page.waitForResponse(
      (r) => r.url().includes("/api/projects") && r.request().method() === "POST",
    )
    await page.getByRole("button", { name: "Create project" }).click()
    expect((await createResponse).status()).toBe(201)
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/)
    await expect(page.getByLabel("Project name")).toHaveValue(projectName)

    await page.goto("/dashboard")
    await expect(page.getByText(projectName)).toBeVisible()

    await page.getByRole("button", { name: "Delete project" }).first().click()
    await page.getByRole("button", { name: /^Delete$/ }).click()
    await expect(page.getByText(projectName)).toHaveCount(0)
  } finally {
    await cleanupUser(user.id)
  }
})

test("user publishes a project to the ideas gallery", async ({ page }) => {
  const user = createTestUser("Publish")

  try {
    await insertUser(user)
    const project = await insertProject(user.id, e2eName("Publish Project"))
    await signInAs(page, user)

    const ideaTitle = e2eName("Published Idea")
    await page.goto("/dashboard")
    await page.getByRole("button", { name: "Publish project" }).click()
    await page.getByPlaceholder("Title").fill(ideaTitle)
    await page.getByPlaceholder("Description").fill("Published from an E2E test.")
    const publishResponse = page.waitForResponse(
      (response) => response.url().includes(`/api/ideas/${project.id}`) && response.request().method() === "POST",
    )
    await page.getByRole("button", { name: "Publish", exact: true }).click()
    await expect((await publishResponse).status()).toBe(201)

    await page.goto("/ideas")
    await expect(page.getByText(ideaTitle)).toBeVisible()
    await expect(page.getByText("Published from an E2E test.")).toBeVisible()

    const updatedTitle = e2eName("Updated Idea")
    await page.goto("/dashboard")
    await page.getByRole("button", { name: "Publish project" }).click()
    await expect(page.getByText("Currently published. Update or unpublish below.")).toBeVisible()
    await expect(page.getByPlaceholder("Title")).toHaveValue(ideaTitle)
    await expect(page.getByPlaceholder("Description")).toHaveValue("Published from an E2E test.")
    await page.getByPlaceholder("Title").fill(updatedTitle)
    await page.getByPlaceholder("Description").fill("Updated from the dashboard.")
    await page.getByRole("combobox").selectOption("Comedy")
    const updateResponse = page.waitForResponse(
      (response) => response.url().includes(`/api/ideas/${project.id}`) && response.request().method() === "POST",
    )
    await page.getByRole("button", { name: "Update" }).click()
    await expect((await updateResponse).status()).toBe(201)
    await page.goto("/ideas")
    await expect(page.getByText(updatedTitle)).toBeVisible()
    await expect(page.getByText("Updated from the dashboard.")).toBeVisible()

    await page.goto("/dashboard")
    await page.getByRole("button", { name: "Publish project" }).click()
    const unpublishResponse = page.waitForResponse(
      (response) => response.url().includes(`/api/ideas/${project.id}`) && response.request().method() === "DELETE",
    )
    await page.getByRole("button", { name: "Unpublish" }).click()
    await expect((await unpublishResponse).status()).toBe(204)
    await page.goto("/ideas")
    await expect(page.getByText(updatedTitle)).toHaveCount(0)
  } finally {
    await cleanupUser(user.id)
  }
})
