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
