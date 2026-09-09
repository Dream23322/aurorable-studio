import { useState } from "react"
import { api } from "@/lib/api"
import { useUser } from "@/lib/user-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function Account() {
  const { user } = useUser()
  const [cur, setCur] = useState("")
  const [next, setNext] = useState("")
  const [next2, setNext2] = useState("")

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
