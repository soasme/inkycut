jest.mock("@/lib/db", () => ({ db: {} }))

import { isPublished } from "@/lib/db/queries/ideas"

describe("isPublished", () => {
  it("returns true when publishedAt is set", () => {
    expect(isPublished({ publishedAt: new Date() })).toBe(true)
  })

  it("returns false when publishedAt is null", () => {
    expect(isPublished({ publishedAt: null })).toBe(false)
  })
})
