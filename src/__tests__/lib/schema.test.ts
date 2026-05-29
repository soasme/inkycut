import { accounts, conversations, elementConnections, elements, ideas, messages, projects, sessions, users, verificationTokens } from "@/lib/db/schema"

describe("schema tables", () => {
  it("users table has required columns", () => {
    expect(users).toBeDefined()
    expect(Object.keys(users)).toContain("id")
  })

  it("projects table has viewport columns", () => {
    expect(projects).toBeDefined()
    expect(Object.keys(projects)).toEqual(expect.arrayContaining(["viewportX", "viewportY", "viewportScale"]))
  })

  it("elements table has data jsonb column", () => {
    expect(elements).toBeDefined()
    expect(Object.keys(elements)).toContain("data")
  })

  it("exports app and auth tables", () => {
    expect([accounts, sessions, verificationTokens, elementConnections, conversations, messages, ideas]).toHaveLength(7)
  })
})
