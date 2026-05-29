jest.mock("@/lib/db", () => ({ db: {} }))

import { formatMessagesForOpenAI } from "@/lib/db/queries/messages"

describe("formatMessagesForOpenAI", () => {
  it("maps user messages", () => {
    expect(formatMessagesForOpenAI([{ role: "user", content: "hello", agentName: null, toolCalls: null }])).toEqual([{ role: "user", content: "hello" }])
  })

  it("maps agent messages as assistant", () => {
    expect(formatMessagesForOpenAI([{ role: "agent", content: "hi", agentName: "Video Specialist", toolCalls: null }])).toEqual([{ role: "assistant", content: "hi" }])
  })

  it("skips stamp messages", () => {
    expect(formatMessagesForOpenAI([{ role: "stamp", content: "May 22", agentName: null, toolCalls: null }])).toHaveLength(0)
  })
})
