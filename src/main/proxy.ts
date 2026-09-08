// Local proxy: serves the built renderer (prod) and forwards API + media
// traffic to the hosted aurorable site. The renderer talks same-origin, so
// session + CSRF cookies just work — no CORS anywhere.
import { createServer } from "node:http"
import { request as httpsRequest } from "node:https"
import { readFileSync, existsSync, statSync } from "node:fs"
import { join, extname } from "node:path"

export const PROXY_PORT = 8868
const SITE = process.env.AURORABLE_SITE || "https://clips.roraaaa.dev"
const RENDERER_DIR = process.env.AURORABLE_RENDERER_DIR || join(__dirname, "../renderer")

const PROXY_PREFIXES = ["/api/", "/v/", "/u/", "/watch/"]

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2"
}

function serveStatic(req, res): void {
  let pathname = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname)
  if (pathname === "/") pathname = "/index.html"
  // never let an absolute pathname escape RENDERER_DIR (windows drive-root trap)
  const clean = pathname.replace(/^[/\\]+/, "")
  const file = join(RENDERER_DIR, clean)
  if (!file.startsWith(join(RENDERER_DIR, "."))) {
    res.writeHead(403)
    res.end("forbidden")
    return
  }
  if (!existsSync(file) || statSync(file).isDirectory()) {
    const index = join(RENDERER_DIR, "index.html")
    if (existsSync(index)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      res.end(readFileSync(index))
      return
    }
    res.writeHead(404)
    res.end("not found")
    return
  }
  res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" })
  res.end(readFileSync(file))
}

function proxy(req, res): void {
  const target = new URL(SITE + req.url)
  const headers: Record<string, string | string[]> = { ...req.headers }
  headers.host = target.host
  headers["x-forwarded-for"] = req.socket.remoteAddress ?? ""
  const out = httpsRequest(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === "https:" ? 443 : 80),
      path: target.pathname + target.search,
      method: req.method,
      headers
    },
    (inRes) => {
      const respHeaders = { ...inRes.headers }
      delete respHeaders["content-security-policy"]
      delete respHeaders["content-security-policy-report-only"]
      res.writeHead(inRes.statusCode || 502, respHeaders)
      inRes.pipe(res)
    }
  )
  out.on("error", (err) => {
    res.writeHead(502)
    res.end(`proxy error: ${err.message}`)
  })
  req.pipe(out)
}

export function startProxy(): ReturnType<typeof createServer> {
  const server = createServer((req, res) => {
    const pathname = new URL(req.url ?? "/", "http://x").pathname
    if (PROXY_PREFIXES.some((p) => pathname.startsWith(p))) proxy(req, res)
    else serveStatic(req, res)
  })
  server.listen(PROXY_PORT, "127.0.0.1")
  return server
}