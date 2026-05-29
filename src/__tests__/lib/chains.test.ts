import { discoverChains } from "@/lib/chains"

describe("discoverChains", () => {
  it("returns empty array for no connections", () => {
    expect(discoverChains([], [])).toEqual([])
  })

  it("finds a linear chain", () => {
    const elements = [
      { id: "a", type: "frame" },
      { id: "b", type: "frame" },
      { id: "c", type: "frame" },
    ]
    const chains = discoverChains(elements as never, [
      { fromElementId: "a", toElementId: "b" },
      { fromElementId: "b", toElementId: "c" },
    ])
    expect(chains[0].map((element) => element.id)).toEqual(["a", "b", "c"])
  })

  it("finds two separate chains", () => {
    const elements = [
      { id: "a", type: "frame" },
      { id: "b", type: "frame" },
      { id: "c", type: "frame" },
      { id: "d", type: "frame" },
    ]
    const chains = discoverChains(elements as never, [
      { fromElementId: "a", toElementId: "b" },
      { fromElementId: "c", toElementId: "d" },
    ])
    expect(chains).toHaveLength(2)
  })

  it("ignores non-frame endpoints", () => {
    const elements = [
      { id: "a", type: "frame" },
      { id: "b", type: "note" },
    ]
    expect(discoverChains(elements as never, [{ fromElementId: "a", toElementId: "b" }])).toEqual([])
  })
})
