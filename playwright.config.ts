import { defineConfig, devices } from "@playwright/test"

const port = Number.parseInt(process.env.PORT ?? "3000", 10)
const baseURL = `http://127.0.0.1:${port}`
const stubPort = Number.parseInt(process.env.E2E_STUB_PORT ?? "4010", 10)
const stubURL = `http://127.0.0.1:${stubPort}`

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: `E2E_STUB_PORT=${stubPort} npm run e2e:stub`,
      url: `${stubURL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: [
        "E2E_AUTH_BYPASS=1",
        `EXTERNAL_STUB_BASE_URL=${stubURL}`,
        `OPENAI_BASE_URL=${stubURL}/openai/v1`,
        "OPENAI_API_KEY=e2e-stub-key",
        "STORAGE_TYPE=local",
        "npm run dev",
      ].join(" "),
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
})
