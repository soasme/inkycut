interface Msg {
  id: string
  role: string
  agentName?: string | null
  content?: string | null
}

export function ChatMessage({ msg }: { msg: Msg }) {
  if (msg.role === "stamp") return <div className="stamp">{msg.content}</div>
  if (msg.role === "user") {
    return (
      <div className="msg user">
        <div className="bubble">{msg.content}</div>
      </div>
    )
  }
  return (
    <div className="msg">
      <span className="agent-tag">▷ {msg.agentName ?? "Video Specialist"}</span>
      <div className="bubble">{msg.content}</div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="msg">
      <span className="agent-tag">▷ Video Specialist</span>
      <div className="typing">
        <i />
        <i />
        <i />
      </div>
    </div>
  )
}
