import { createServer, type IncomingMessage, type ServerResponse } from "http"

const port = Number.parseInt(process.env.E2E_STUB_PORT ?? "4010", 10)
const baseURL = `http://127.0.0.1:${port}`

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" })
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = ""
    req.on("data", (chunk) => {
      body += chunk
    })
    req.on("end", () => resolve(body))
    req.on("error", reject)
  })
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", baseURL)

  if (url.pathname === "/health") {
    json(res, 200, { ok: true })
    return
  }

  if (url.pathname === "/google/.well-known/openid-configuration") {
    json(res, 200, {
      issuer: `${baseURL}/google`,
      authorization_endpoint: `${baseURL}/google/o/oauth2/v2/auth`,
      token_endpoint: `${baseURL}/google/oauth2/v4/token`,
      userinfo_endpoint: `${baseURL}/google/oauth2/v3/userinfo`,
      jwks_uri: `${baseURL}/google/oauth2/v3/certs`,
    })
    return
  }

  if (url.pathname === "/google/o/oauth2/v2/auth") {
    const redirectURI = url.searchParams.get("redirect_uri")
    if (!redirectURI) {
      json(res, 400, { error: "redirect_uri required" })
      return
    }
    const redirectURL = new URL(redirectURI)
    redirectURL.searchParams.set("code", "e2e-google-code")
    const state = url.searchParams.get("state")
    if (state) redirectURL.searchParams.set("state", state)
    res.writeHead(302, { location: redirectURL.toString() })
    res.end()
    return
  }

  if (url.pathname === "/google/oauth2/v4/token") {
    await readBody(req)
    json(res, 200, {
      access_token: "e2e-google-access-token",
      expires_in: 3600,
      id_token: "e2e-google-id-token",
      scope: "openid email profile",
      token_type: "Bearer",
    })
    return
  }

  if (url.pathname === "/google/oauth2/v3/userinfo") {
    json(res, 200, {
      sub: "google-e2e-user",
      email: "google-e2e@example.test",
      email_verified: true,
      name: "Google E2E User",
      picture: `${baseURL}/avatar.png`,
    })
    return
  }

  if (url.pathname === "/google/oauth2/v3/certs") {
    json(res, 200, { keys: [] })
    return
  }

  if (url.pathname === "/openai/v1/chat/completions") {
    const body = JSON.parse(await readBody(req))
    if (body.stream) {
      const chunk1 = { id: "chatcmpl-e2e", object: "chat.completion.chunk", choices: [{ index: 0, delta: { role: "assistant", content: "Stubbed E2E response." }, finish_reason: null }] }
      const chunk2 = { id: "chatcmpl-e2e", object: "chat.completion.chunk", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] }
      res.writeHead(200, { "content-type": "text/event-stream" })
      res.write(`data: ${JSON.stringify(chunk1)}\n\n`)
      res.write(`data: ${JSON.stringify(chunk2)}\n\n`)
      res.write("data: [DONE]\n\n")
      res.end()
    } else {
      json(res, 200, {
        id: "chatcmpl-e2e",
        object: "chat.completion",
        choices: [{ index: 0, message: { role: "assistant", content: "Stubbed E2E response." }, finish_reason: "stop" }],
      })
    }
    return
  }

  if (url.pathname === "/openai/v1/images/generations") {
    await readBody(req)
    json(res, 200, {
      created: Math.floor(Date.now() / 1000),
      data: [{ b64_json: Buffer.from("e2e image").toString("base64") }],
    })
    return
  }

  json(res, 404, { error: "Not found", path: url.pathname })
})

server.listen(port, () => {
  console.log(`E2E stub server ready on ${baseURL}`)
})
