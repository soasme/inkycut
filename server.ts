import { createServer } from "http"
import { loadEnvConfig } from "@next/env"
import next from "next"

loadEnvConfig(process.cwd())
const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(async () => {
  const { initSocketServer } = await import("./src/lib/socket")
  const httpServer = createServer((req, res) => {
    handle(req, res)
  })

  initSocketServer(httpServer)

  const port = Number.parseInt(process.env.PORT ?? "3000", 10)
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} [${dev ? "dev" : "prod"}]`)
  })
})
