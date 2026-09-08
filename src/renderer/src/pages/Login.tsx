import { useState } from "react"
import { useNavigate } from "react-router"
import { api } from "@/lib/api"
import { useUser } from "@/lib/user-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Flower2 } from "lucide-react"

export default function Login() {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const { refresh } = useUser()
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setBusy(true)
    try {
      await api("/api/auth/login", { body: { identifier, password } })
      await refresh()
      navigate("/clips")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid h-full place-items-center overflow-auto p-6">
      <Card className="w-[380px] border-border/60 shadow-[0_0_40px_rgba(var(--glow-rgb),0.08)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-aurora-bright">
            <Flower2 size={16} /> login
          </CardTitle>
          <CardDescription>your account lives on the site — this is the same login.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="identifier">username or email</Label>
              <Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? "…" : "sign in"}
            </Button>
            <p className="text-xs text-muted-foreground">
              new here? <a href="#/register" className="text-aurora-pink">register</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}