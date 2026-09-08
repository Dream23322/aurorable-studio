import { useState } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Flower2 } from "lucide-react"

export default function Register() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password !== confirm) {
      setError("passwords don't match")
      return
    }
    setBusy(true)
    try {
      await api("/api/auth/register", { body: { username, email: email || undefined, password } })
      setDone(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid h-full place-items-center overflow-auto p-6">
      <Card className="w-[380px] border-border/60">
        {done ? (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-aurora-bright">
                <Flower2 size={16} /> queued
              </CardTitle>
              <CardDescription>
                account created — <span className="text-aurora-good">waiting for admin approval.</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="#/login">
                <Button className="w-full">go to login</Button>
              </a>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-aurora-bright">
                <Flower2 size={16} /> register
              </CardTitle>
              <CardDescription>accounts must be approved by an admin before you can sign in.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="flex flex-col gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="username">username</Label>
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="3-32 chars: a-z 0-9 _ -" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="email">email (optional)</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="password">password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="confirm">confirm</Label>
                  <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" disabled={busy}>
                  {busy ? "…" : "create account"}
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}