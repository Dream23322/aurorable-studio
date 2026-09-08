import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { WorkerToken } from "@/lib/types"
import { useUser } from "@/lib/user-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function Account() {
  const { user } = useUser()
  const [tokens, setTokens] = useState<WorkerToken[]>([])
  const [tokenName, setTokenName] = useState("")
  const [newToken, setNewToken] = useState<string | null>(null)
  const [online, setOnline] = useState(0)
  const [cur, setCur] = useState("")
  const [next, setNext] = useState("")
  const [next2, setNext2] = useState("")

  const loadTokens = async () => {
    const r = await api<{ tokens: WorkerToken[] }>("/api/me/workers/tokens")
    setTokens(r.tokens)
    try {
      const s = await api<{ online: number }>("/api/me/workers/status")
      setOnline(s.online)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void loadTokens()
  }, [])

  const createToken = async () => {
    const r = await api<{ token: { value: string } }>("/api/me/workers/tokens", { body: { name: tokenName || "Worker" } })
    setNewToken(r.token.value)
    setTokenName("")
    void loadTokens()
  }

  const revoke = async (id: string) => {
    if (!confirm("revoke this worker token?")) return
    await api(`/api/me/workers/tokens/${id}`, { method: "DELETE" })
    void loadTokens()
  }

  const changePassword = async () => {
    if (next !== next2) {
      toast.error("passwords don't match")
      return
    }
    await api("/api/auth/change-password", { body: { current: cur, next } })
    setCur("")
    setNext("")
    setNext2("")
    toast.success("password changed — other devices signed out")
  }

  const exportData = async () => {
    const res = await fetch("/api/me/export", { credentials: "same-origin" })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "aurorable-export.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const deleteAccount = async () => {
    if (!confirm("this permanently deletes everything. continue?")) return
    if (!confirm("really?")) return
    const password = prompt("enter your password to confirm")
    if (!password) return
    try {
      await api("/api/me/account", { method: "DELETE", body: { password } })
      location.reload()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto flex max-w-xl flex-col gap-4 pb-10">
        <h1 className="text-xl font-bold text-aurora-bright">account</h1>

        <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
          <h2 className="mb-1 text-sm text-aurora-pink">render workers</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            run <code>aurorable-worker</code> on your PC to render with your own GPU. {online} online now.
          </p>
          {newToken && (
            <>
              <p className="mb-1 text-xs text-aurora-good">token created — copy it now, it won't be shown again:</p>
              <code className="mb-3 block break-all rounded bg-background p-2 text-xs">{newToken}</code>
            </>
          )}
          <div className="mb-3 flex gap-2">
            <Input placeholder="worker name (optional)" value={tokenName} onChange={(e) => setTokenName(e.target.value)} />
            <Button onClick={createToken}>create token</Button>
          </div>
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center justify-between border-t py-1.5 text-sm" style={{ borderColor: "var(--border)" }}>
              <span>
                {t.name} <span className="text-xs text-muted-foreground">{t.online ? "● online" : "○ offline"}</span>
              </span>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => revoke(t.id)}>
                revoke
              </Button>
            </div>
          ))}
        </section>

        <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
          <h2 className="mb-3 text-sm text-aurora-pink">password</h2>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>current</Label>
              <Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>new</Label>
              <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>confirm</Label>
              <Input type="password" value={next2} onChange={(e) => setNext2(e.target.value)} />
            </div>
            <Button onClick={changePassword}>change password</Button>
          </div>
        </section>

        <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
          <h2 className="mb-3 text-sm text-aurora-pink">data</h2>
          <Button variant="ghost" onClick={exportData}>
            export data (json)
          </Button>
        </section>

        <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
          <h2 className="mb-3 text-sm text-destructive">danger zone</h2>
          <Button variant="destructive" onClick={deleteAccount}>
            delete account
          </Button>
        </section>

        <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
          <h2 className="mb-3 text-sm text-aurora-pink">about</h2>
          <p className="text-xs text-muted-foreground">
            aurorable app v0.2.0 · your clips live on{" "}
            <a href="https://clips.roraaaa.dev" target="_blank" rel="noreferrer" className="text-aurora-pink hover:underline">
              clips.roraaaa.dev
            </a>
          </p>
        </section>

        <p className="text-xs text-muted-foreground">signed in as {user?.username}</p>
      </div>
    </div>
  )
}
