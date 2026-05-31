import { createRef } from "react"
import { TextDecoder, TextEncoder } from "util"
import { act, render, screen, waitFor } from "@testing-library/react"
import { ChatPanel } from "@/components/canvas/chat/ChatPanel"
import { useCanvasStore } from "@/hooks/useCanvas"
import type { CanvasElement } from "@/types/canvas"

let composerProps: {
  draft: string
  setDraft: (value: string) => void
  onSend: () => Promise<void>
  thinking: boolean
  taRef: React.RefObject<HTMLTextAreaElement | null>
}

jest.mock("@/components/canvas/chat/Composer", () => ({
  Composer: (props: typeof composerProps) => {
    composerProps = props
    return <textarea ref={props.taRef} aria-label="mock composer" value={props.draft} readOnly />
  },
}))
jest.mock("@/components/canvas/chat/ChatMessage", () => ({
  ChatMessage: ({ msg }: { msg: { content?: string | null } }) => <div>{msg.content}</div>,
  TypingIndicator: () => <div>thinking</div>,
}))

const created: CanvasElement = {
  id: "created",
  projectId: "p1",
  type: "note",
  x: 0,
  y: 0,
  w: 200,
  h: null,
  data: { text: "created" },
  createdAt: new Date(),
  updatedAt: new Date(),
}

function response(body: Partial<Response> = {}) {
  return { ok: true, json: async () => [], ...body } as Response
}

function stream(chunks: string[]) {
  const encoder = new TextEncoder()
  const values = chunks.map((value) => encoder.encode(value))
  return response({
    body: {
      getReader: () => ({
        read: jest.fn(async () => (values.length ? { done: false, value: values.shift() } : { done: true, value: undefined })),
      }),
    } as never,
  })
}

describe("ChatPanel", () => {
  beforeAll(() => {
    Object.defineProperty(global, "TextEncoder", { value: TextEncoder, configurable: true })
    Object.defineProperty(global, "TextDecoder", { value: TextDecoder, configurable: true })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    useCanvasStore.getState().reset()
    delete (global as { fetch?: typeof fetch }).fetch
  })

  afterEach(() => {
    delete (global as { fetch?: typeof fetch }).fetch
  })

  it("does not send without a loaded conversation and exposes focus", async () => {
    const ref = createRef<{ focus: () => void }>()
    render(<ChatPanel ref={ref} projectId="p1" conversationId={null} />)
    expect(composerProps.thinking).toBe(true)
    await act(async () => composerProps.onSend())
    act(() => composerProps.setDraft("hello"))
    await act(async () => composerProps.onSend())
    const focus = jest.spyOn(screen.getByLabelText("mock composer"), "focus")
    act(() => ref.current!.focus())
    expect(focus).toHaveBeenCalled()
  })

  it("loads history and handles failed history requests", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(response({ json: async () => [{ id: "history", role: "user", content: "Earlier" }] }))
      .mockResolvedValueOnce(response({ ok: false }))
      .mockRejectedValueOnce(new Error("offline"))
    const { rerender } = render(<ChatPanel projectId="p1" conversationId="c1" />)
    await screen.findByText("Earlier")
    rerender(<ChatPanel projectId="p1" conversationId="c2" />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/messages?conversationId=c2"))
    rerender(<ChatPanel projectId="p1" conversationId="c3" />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/messages?conversationId=c3"))
  })

  it("streams fragmented text and dispatches every mutation action", async () => {
    const changed = jest.fn()
    window.addEventListener("inkycut:connections-changed", changed)
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(
        stream([
          'ignored\n\ndata: {"type":"text","content":"Hel',
          'lo"}\n\ndata: {"type":"mutation","mutation":{"action":"created","element":',
          `${JSON.stringify(created)}}}\n\ndata: {"type":"mutation","mutation":{"action":"created"}}\n\n`,
          'data: {"type":"mutation","mutation":{"action":"updated","element":{"id":"created","x":42}}}\n\n',
          'data: {"type":"mutation","mutation":{"action":"updated"}}\n\n',
          'data: {"type":"mutation","mutation":{"action":"deleted","id":"created"}}\n\n',
          'data: {"type":"mutation","mutation":{"action":"deleted"}}\n\n',
          'data: {"type":"mutation","mutation":{"action":"connected"}}\n\n',
          'data: {"type":"mutation","mutation":{"action":"unknown"}}\n\n',
          'data: {"type":"text","content":"!"}',
        ]),
      )
    render(<ChatPanel projectId="p1" conversationId="c1" />)
    await waitFor(() => expect(composerProps.thinking).toBe(false))
    act(() => composerProps.setDraft(" prompt "))
    await act(async () => composerProps.onSend())
    expect(global.fetch).toHaveBeenLastCalledWith("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "p1", conversationId: "c1", message: "prompt" }),
    })
    expect(screen.getByText("Hello!")).toBeInTheDocument()
    expect(useCanvasStore.getState().elements).toHaveLength(0)
    expect(changed).toHaveBeenCalled()
    window.removeEventListener("inkycut:connections-changed", changed)
  })

  it("stops thinking when the response has no reader", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(response()).mockResolvedValueOnce(response({ body: null }))
    render(<ChatPanel projectId="p1" conversationId="c1" />)
    await waitFor(() => expect(composerProps.thinking).toBe(false))
    act(() => composerProps.setDraft("hello"))
    await act(async () => composerProps.onSend())
    expect(composerProps.thinking).toBe(false)
  })

  it("does not submit again while a stream is active", async () => {
    let finish!: () => void
    const read = jest
      .fn()
      .mockReturnValueOnce(new Promise<{ done: boolean; value?: Uint8Array }>((resolve) => {
        finish = () => resolve({ done: true })
      }))
    global.fetch = jest.fn().mockResolvedValueOnce(response()).mockResolvedValueOnce(response({ body: { getReader: () => ({ read }) } as never }))
    render(<ChatPanel projectId="p1" conversationId="c1" />)
    await waitFor(() => expect(composerProps.thinking).toBe(false))
    act(() => composerProps.setDraft("first"))
    let pending!: Promise<void>
    act(() => {
      pending = composerProps.onSend()
    })
    await waitFor(() => expect(composerProps.thinking).toBe(true))
    act(() => composerProps.setDraft("second"))
    await act(async () => composerProps.onSend())
    expect(global.fetch).toHaveBeenCalledTimes(2)
    await act(async () => {
      finish()
      await pending
    })
  })
})
