jest.mock("@/lib/db", () => ({ db: {} }))

import { buildElementPatch } from "@/lib/db/queries/elements"

describe("buildElementPatch", () => {
  it("allows position fields", () => {
    expect(buildElementPatch({ x: 10, y: 20 })).toEqual({ x: 10, y: 20, updatedAt: expect.any(Date) })
  })

  it("allows data replacement", () => {
    expect(buildElementPatch({ data: { slug: "NEW" } }).data).toEqual({ slug: "NEW" })
  })

  it("strips unknown fields", () => {
    const patch = buildElementPatch({ id: "hack", projectId: "hack" })
    expect(patch).not.toHaveProperty("id")
    expect(patch).not.toHaveProperty("projectId")
  })
})
