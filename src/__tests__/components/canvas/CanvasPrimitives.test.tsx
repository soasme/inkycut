import { createRef } from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { CanvasTopbar } from "@/components/canvas/CanvasTopbar"
import { Toolbar } from "@/components/canvas/Toolbar"
import { ZoomControls } from "@/components/canvas/ZoomControls"
import { ChatMessage, TypingIndicator } from "@/components/canvas/chat/ChatMessage"
import { Composer } from "@/components/canvas/chat/Composer"
import { CharacterNode } from "@/components/canvas/nodes/CharacterNode"
import { DocNode } from "@/components/canvas/nodes/DocNode"
import { NHead, NodeWrapper } from "@/components/canvas/nodes/NodeWrapper"
import { NoteNode } from "@/components/canvas/nodes/NoteNode"
import { ShotlistNode } from "@/components/canvas/nodes/ShotlistNode"
import { StoryboardNode } from "@/components/canvas/nodes/StoryboardNode"
import { useCanvasStore } from "@/hooks/useCanvas"
import type { CanvasElement, ElementType } from "@/types/canvas"

function element(type: ElementType, data: Record<string, unknown> = {}, h: number | null = null): CanvasElement {
  return { id: `${type}-1`, projectId: "p1", type, x: 10, y: 20, w: 300, h, data, createdAt: new Date(), updatedAt: new Date() }
}

describe("canvas primitives", () => {
  beforeEach(() => useCanvasStore.getState().reset())

  it("adds every toolbar node type", () => {
    const onAdd = jest.fn()
    const onFocusChat = jest.fn()
    render(<Toolbar onAdd={onAdd} onFocusChat={onFocusChat} />)
    for (const name of ["Frame", "Character", "Storyboard", "Shot list", "Doc", "Note"]) {
      fireEvent.click(screen.getByRole("button", { name: `Add ${name}` }))
    }
    fireEvent.click(screen.getByRole("button", { name: "Ask a specialist" }))
    expect(onAdd.mock.calls.map(([type]) => type)).toEqual(["frame", "character", "storyboard", "shotlist", "doc", "note"])
    expect(onFocusChat).toHaveBeenCalled()
  })

  it("zooms through controls and clamps both limits", () => {
    const onViewportChange = jest.fn()
    render(<ZoomControls onViewportChange={onViewportChange} />)
    fireEvent.click(screen.getByRole("button", { name: "+" }))
    expect(onViewportChange).toHaveBeenLastCalledWith({ x: 30, y: 24, scale: 0.8580000000000001 })
    act(() => useCanvasStore.getState().setViewport({ x: 1, y: 2, scale: 0.25 }))
    fireEvent.click(screen.getByRole("button", { name: "-" }))
    expect(onViewportChange).toHaveBeenLastCalledWith({ x: 1, y: 2, scale: 0.25 })
    act(() => useCanvasStore.getState().setViewport({ x: 1, y: 2, scale: 2 }))
    fireEvent.click(screen.getByRole("button", { name: "+" }))
    expect(onViewportChange).toHaveBeenLastCalledWith({ x: 1, y: 2, scale: 2 })
  })

  it("renders topbar collaborators and actions", () => {
    const onExport = jest.fn()
    const onProjectNameChange = jest.fn()
    render(
      <CanvasTopbar
        projectName="Draft"
        collaborators={[
          { userId: "u1", name: "Alice" },
          { userId: "fallback", name: "" },
          { userId: "u3", name: "Carol" },
          { userId: "u4", name: "Dana" },
          { userId: "u5", name: "Extra" },
        ]}
        onExport={onExport}
        onProjectNameChange={onProjectNameChange}
      />,
    )
    expect(screen.getAllByTestId("collaborator-avatar")).toHaveLength(4)
    expect(screen.getByText("FA")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "Renamed" } })
    fireEvent.blur(screen.getByLabelText("Project name"))
    fireEvent.click(screen.getByRole("button", { name: "Export video" }))
    expect(onProjectNameChange).toHaveBeenCalledWith("Renamed")
    expect(onExport).toHaveBeenCalled()
  })

  it("handles composer quick actions, edits, enter, and disabled states", () => {
    const setDraft = jest.fn()
    const onSend = jest.fn()
    const { rerender } = render(<Composer draft="" setDraft={setDraft} onSend={onSend} thinking={false} taRef={createRef()} />)
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Board a scene" }))
    expect(setDraft).toHaveBeenCalledWith("Board a scene")
    fireEvent.change(screen.getByLabelText("Chat prompt"), { target: { value: "hello" } })
    expect(setDraft).toHaveBeenCalledWith("hello")
    rerender(<Composer draft="hello" setDraft={setDraft} onSend={onSend} thinking={false} taRef={createRef()} />)
    fireEvent.keyDown(screen.getByLabelText("Chat prompt"), { key: "Enter" })
    fireEvent.keyDown(screen.getByLabelText("Chat prompt"), { key: "Enter", shiftKey: true })
    fireEvent.keyDown(screen.getByLabelText("Chat prompt"), { key: "Escape" })
    fireEvent.click(screen.getByRole("button", { name: "Send message" }))
    expect(onSend).toHaveBeenCalledTimes(2)
    rerender(<Composer draft="hello" setDraft={setDraft} onSend={onSend} thinking taRef={createRef()} />)
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled()
  })

  it("renders chat message variants and typing indicator", () => {
    const { rerender, container } = render(<ChatMessage msg={{ id: "1", role: "stamp", content: "Today" }} />)
    expect(screen.getByText("Today")).toHaveClass("stamp")
    rerender(<ChatMessage msg={{ id: "2", role: "user", content: "Prompt" }} />)
    expect(screen.getByText("Prompt").closest(".msg")).toHaveClass("user")
    rerender(<ChatMessage msg={{ id: "3", role: "agent", content: "Reply", agentName: null }} />)
    expect(screen.getByText(/Video Specialist/)).toBeInTheDocument()
    rerender(<ChatMessage msg={{ id: "4", role: "agent", content: "Reply", agentName: "Editor" }} />)
    expect(screen.getByText(/Editor/)).toBeInTheDocument()
    rerender(<TypingIndicator />)
    expect(container.querySelectorAll(".typing i")).toHaveLength(3)
  })

  it("renders wrappers and node content variants", () => {
    const onPointerDown = jest.fn()
    const { rerender, container } = render(
      <NodeWrapper element={element("frame", {}, 225)} selected dragging onPointerDown={onPointerDown}>
        frame
      </NodeWrapper>,
    )
    expect(screen.getByTestId("canvas-node-frame")).toHaveClass("frame-node", "sel", "dragging")
    expect(screen.getByTestId("canvas-node-frame")).toHaveAttribute("data-element-id", "frame-1")
    fireEvent.pointerDown(screen.getByTestId("canvas-node-frame"))
    expect(onPointerDown).toHaveBeenCalled()
    rerender(
      <NodeWrapper element={element("note")} selected={false} dragging={false} onPointerDown={onPointerDown}>
        note
      </NodeWrapper>,
    )
    expect(screen.getByTestId("canvas-node-note")).toHaveClass("note-node")
    rerender(<NHead label="Heading" type="kind" />)
    expect(screen.getByText("Heading")).toBeInTheDocument()
    expect(container.querySelector(".nh-type")).toHaveTextContent("kind")
  })

  it("renders editable notes and document defaults", () => {
    const onChange = jest.fn()
    const { rerender } = render(<NoteNode element={element("note", { text: "draft" })} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText("Note text"), { target: { value: "revised" } })
    expect(onChange).toHaveBeenCalledWith("note-1", "revised")
    rerender(<DocNode element={element("doc", {})} />)
    expect(screen.getByText("Document")).toBeInTheDocument()
    rerender(<DocNode element={element("doc", { title: "Bible", content: "<p>Story</p>" })} />)
    expect(screen.getByText("Bible")).toBeInTheDocument()
    expect(screen.getByText("Story")).toBeInTheDocument()
  })

  it("renders storyboard, shotlist, and character variants", () => {
    const onGenerateShotlist = jest.fn()
    const { rerender, container } = render(<StoryboardNode element={element("storyboard", {})} onGenerateShotlist={onGenerateShotlist} busy={false} />)
    expect(container.querySelectorAll(".sb-strip .frame")).toHaveLength(4)
    fireEvent.click(screen.getByRole("button", { name: "Shot list" }))
    expect(onGenerateShotlist).toHaveBeenCalled()
    rerender(<StoryboardNode element={element("storyboard", { title: "Custom", hues: ["rain"] })} onGenerateShotlist={onGenerateShotlist} busy />)
    expect(screen.getByRole("button", { name: "Shot list" })).toBeDisabled()
    rerender(<ShotlistNode element={element("shotlist", {})} />)
    expect(screen.getByText("Shot list")).toBeInTheDocument()
    rerender(<ShotlistNode element={element("shotlist", { title: "Shots", shots: [{ n: 1, d: "Wide", l: "24mm", m: "Pan", t: "2s" }] })} />)
    expect(screen.getByText("Wide")).toBeInTheDocument()
    rerender(<CharacterNode element={element("character", { name: "Ari", role: "lead" })} />)
    expect(container.querySelectorAll(".char-row .frame")).toHaveLength(3)
    rerender(<CharacterNode element={element("character", { name: "Bea", role: "support", hues: ["forest", "rain", "amber"] })} />)
    expect(screen.getByText("Bea")).toBeInTheDocument()
  })
})
