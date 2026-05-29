"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { useCanvasStore } from "@/hooks/useCanvas"
import type { CanvasElement } from "@/types/canvas"
import { ChatMessage, TypingIndicator } from "@/components/canvas/chat/ChatMessage"
import { Composer } from "@/components/canvas/chat/Composer"

interface Msg {
  id: string
  role: string
  agentName?: string | null
  content?: string | null
}

export const ChatPanel = forwardRef<{ focus: () => void }, { projectId: string; conversationId: string | null }>(function ChatPanel(
  { projectId, conversationId },
  ref,
) {
  const store = useCanvasStore()
  const taRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [draft, setDraft] = useState("")
  const [thinking, setThinking] = useState(false)

  useImperativeHandle(ref, () => ({ focus: () => taRef.current?.focus() }))
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, thinking])
  useEffect(() => {
    if (!conversationId) return
    fetch(`/api/messages?conversationId=${conversationId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setMessages)
      .catch(() => setMessages([]))
  }, [conversationId])

  async function send() {
    if (!draft.trim() || thinking || !conversationId) return
    const text = draft.trim()
    const agentMsgId = `${Date.now()}-agent`
    setDraft("")
    setThinking(true)
    setMessages((items) => [...items, { id: `${Date.now()}-user`, role: "user", content: text }, { id: agentMsgId, role: "agent", agentName: "Video Specialist", content: "" }])
    const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, conversationId, message: text }) })
    const reader = res.body?.getReader()
    if (!reader) {
      setThinking(false)
      return
    }
    const decoder = new TextDecoder()
    let agentText = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split("\n\n").filter(Boolean)) {
        if (!line.startsWith("data: ")) continue
        const event = JSON.parse(line.slice(6))
        if (event.type === "text") {
          agentText += event.content
          setMessages((items) => items.map((item) => (item.id === agentMsgId ? { ...item, content: agentText } : item)))
        }
        if (event.type === "mutation") {
          const { action, element, id } = event.mutation
          if (action === "created" && element) store.addElement(element as CanvasElement)
          if (action === "updated" && element) store.updateElement((element as CanvasElement).id, element as Partial<CanvasElement>)
          if (action === "deleted" && id) store.removeElement(id)
        }
      }
    }
    setThinking(false)
  }

  return (
    <aside className="chat">
      <div className="chat-head">
        <div className="chat-title">Chat</div>
        <div className="chat-sub">▷ Video Specialist · on this board</div>
      </div>
      <div ref={scrollRef} className="chat-scroll">
        {messages.map((message) => (
          <ChatMessage key={message.id} msg={message} />
        ))}
        {thinking && <TypingIndicator />}
      </div>
      <Composer draft={draft} setDraft={setDraft} onSend={send} thinking={thinking} taRef={taRef} />
    </aside>
  )
})
