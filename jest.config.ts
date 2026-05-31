import type { Config } from "jest"

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|sass|scss)$": "<rootDir>/src/__tests__/styleMock.ts",
  },
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }] },
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.ts?(x)", "<rootDir>/src/__tests__/**/*.test.ts?(x)"],
  collectCoverageFrom: [
    "src/components/layout/Nav.tsx",
    "src/components/ui/Frame.tsx",
    "src/components/ui/ImageSlot.tsx",
    "src/components/ui/Logo.tsx",
    "src/components/canvas/Toolbar.tsx",
    "src/components/canvas/ZoomControls.tsx",
    "src/components/canvas/CanvasTopbar.tsx",
    "src/components/canvas/Canvas.tsx",
    "src/components/canvas/Stage.tsx",
    "src/components/canvas/chat/Composer.tsx",
    "src/components/canvas/chat/ChatMessage.tsx",
    "src/components/canvas/chat/ChatPanel.tsx",
    "src/components/canvas/nodes/NodeWrapper.tsx",
    "src/components/canvas/nodes/NoteNode.tsx",
    "src/components/canvas/nodes/StoryboardNode.tsx",
    "src/components/canvas/nodes/ShotlistNode.tsx",
    "src/components/canvas/nodes/DocNode.tsx",
    "src/components/canvas/nodes/CharacterNode.tsx",
    "src/components/canvas/nodes/FrameNode.tsx",
    "src/components/canvas/export/ExportModal.tsx",
    "src/components/canvas/export/useVideoExport.ts",
    "src/hooks/useAutosave.ts",
    "src/hooks/useCanvas.ts",
    "src/hooks/usePresence.ts",
    "src/hooks/useSocket.ts",
    "src/lib/canvas-tools.ts",
    "src/lib/chains.ts",
    "src/lib/image-generation.ts",
    "src/lib/openai.ts",
    "src/lib/storage.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
}

export default config
