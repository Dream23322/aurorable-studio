// API client. Same-origin in prod (the app's proxy serves the renderer and
// forwards /api), same-origin in dev (vite proxies /api to the app proxy).

let csrfToken: string | null = null

function readCsrf(): string | null {
  const m = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

async function ensureCsrf(): Promise<string | null> {
  if (!csrfToken) csrfToken = readCsrf()
  if (!csrfToken) {
    try {
      await fetch("/api/auth/me", { credentials: "same-origin" })
    } catch {
      /* ignore */
    }
    csrfToken = readCsrf()
  }
  return csrfToken
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; form?: FormData } = {}
): Promise<T> {
  const headers: Record<string, string> = {}
  let body: BodyInit | undefined
  if (opts.form) {
    body = opts.form
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json"
    body = JSON.stringify(opts.body)
  }
  const method = opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET")
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const token = await ensureCsrf()
    if (token) headers["X-CSRF-Token"] = token
  }
  const res = await fetch(path, { method, headers, body, credentials: "same-origin" })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    const err = new Error((data as { error?: string } | null)?.error ?? `HTTP ${res.status}`)
    ;(err as Error & { status?: number }).status = res.status
    throw err
  }
  return data as T
}