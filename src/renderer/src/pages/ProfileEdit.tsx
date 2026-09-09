import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { api } from "@/lib/api"
import { useAuroraTheme } from "@/components/theme-provider"
import { useUser } from "@/lib/user-store"
import { THEMES, BACKGROUNDS, LAYOUTS, type MeProfile, type LiveVideo } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function ProfileEdit() {
  const { user, refresh } = useUser()
  const navigate = useNavigate()
  const { theme: activeTheme, setTheme } = useAuroraTheme()
  const [profile, setProfile] = useState<MeProfile | null>(null)
  const [myClips, setMyClips] = useState<LiveVideo[]>([])
  const [featured, setFeatured] = useState<string[]>([])

  useEffect(() => {
    if (!user) {
      navigate("/login")
      return
    }
    api<MeProfile>("/api/me/profile")
      .then((p) => {
        setProfile(p)
        setTheme(p.theme as never, false)
      })
      .catch(() => {})
    api<LiveVideo[]>("/api/me/videos")
      .then(setMyClips)
      .catch(() => {})
    api<{ featured: Array<{ id: string }> }>("/api/me/profile/featured")
      .then((f) => setFeatured(f.featured.map((x) => x.id)))
      .catch(() => {})
  }, [user])

  const save = async (patch: Record<string, unknown>, msg = "saved") => {
    try {
      await api("/api/me/profile", { body: patch })
      toast.success(msg)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const pickTheme = (t: string) => {
    setTheme(t as never, true)
    setProfile((p) => (p ? { ...p, theme: t } : p))
  }

  const toggleFeatured = async (id: string) => {
    const next = featured.includes(id) ? featured.filter((x) => x !== id) : [...featured, id]
    setFeatured(next.slice(0, 12))
    await api("/api/me/profile/featured", { body: { clipIds: next.slice(0, 12) } })
    toast.success("featured updated")
  }

  const uploadAvatar = async (file: File | undefined) => {
    if (!file) return
    const form = new FormData()
    form.append("avatar", file)
    await api("/api/me/profile/avatar", { form })
    toast.success("avatar saved")
    void refresh()
  }

  if (!profile) return <div className="p-6 text-sm text-muted-foreground">loading…</div>

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-10">
        <div className="aur-band mb-4 px-2 py-1 text-sm font-bold tracking-wide">edit profile</div>

        <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
          <h2 className="mb-3 text-sm text-aurora-pink">identity</h2>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>display name</Label>
              <Input value={profile.displayName ?? ""} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} onBlur={() => save({ displayName: profile.displayName })} />
            </div>
            <div className="grid gap-1.5">
              <Label>bio</Label>
              <textarea
                rows={3}
                className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-aurora-bright"
                style={{ borderColor: "var(--border)" }}
                value={profile.bio ?? ""}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                onBlur={() => save({ bio: profile.bio })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*" onChange={(e) => uploadAvatar(e.target.files?.[0])} />
              <Button variant="ghost" size="sm">upload avatar</Button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
          <h2 className="mb-1 text-sm text-aurora-pink">theme</h2>
          <p className="mb-3 text-xs text-muted-foreground">synced with your account — shows up everywhere.</p>
          <div className="flex flex-wrap gap-1.5">
            {THEMES.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={activeTheme === t ? "default" : "ghost"}
                onClick={() => pickTheme(t)}
                className={activeTheme === t ? "" : "border"}
              >
                {t}
              </Button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
          <h2 className="mb-3 text-sm text-aurora-pink">background</h2>
          <div className="flex flex-wrap gap-1.5">
            {BACKGROUNDS.map((b) => (
              <Button key={b} size="sm" variant={profile.background === b ? "default" : "ghost"} onClick={() => { setProfile({ ...profile, background: b }); void save({ background: b }) }}>
                {b}
              </Button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
          <h2 className="mb-3 text-sm text-aurora-pink">layout</h2>
          <div className="flex flex-wrap gap-1.5">
            {LAYOUTS.map((l) => (
              <Button key={l} size="sm" variant={profile.layout === l ? "default" : "ghost"} onClick={() => { setProfile({ ...profile, layout: l }); void save({ layout: l }) }}>
                {l}
              </Button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
          <h2 className="mb-3 text-sm text-aurora-pink">messages</h2>
          {profile.messages.map((_m, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <Input
                value={profile.messages[i]}
                onChange={(e) => {
                  const next = [...profile.messages]
                  next[i] = e.target.value
                  setProfile({ ...profile, messages: next })
                }}
              />
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                const next = profile.messages.filter((_, j) => j !== i)
                setProfile({ ...profile, messages: next })
                void save({ messages: next })
              }}>
                ×
              </Button>
            </div>
          ))}
          <Button size="sm" variant="ghost" onClick={() => {
            if (profile.messages.length < 16) {
              const next = [...profile.messages, ""]
              setProfile({ ...profile, messages: next })
              void save({ messages: next })
            }
          }}>
            add
          </Button>
        </section>

        <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
          <h2 className="mb-3 text-sm text-aurora-pink">socials</h2>
          {["steam", "discord", "youtube", "twitch", "x"].map((key) => (
            <div key={key} className="mb-2 grid gap-1.5">
              <Label className="text-xs">{key}</Label>
              <Input value={profile.socials[key] ?? ""} onChange={(e) => setProfile({ ...profile, socials: { ...profile.socials, [key]: e.target.value } })} onBlur={() => save({ socialLinks: profile.socials })} />
            </div>
          ))}
        </section>

        <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
          <h2 className="mb-3 text-sm text-aurora-pink">showcase</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={profile.showcaseEnabled}
              onChange={(e) => {
                setProfile({ ...profile, showcaseEnabled: e.target.checked })
                void save({ showcaseEnabled: e.target.checked })
              }}
            />
            appear in the showcase
          </label>
        </section>

        <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
          <h2 className="mb-1 text-sm text-aurora-pink">featured clips</h2>
          <p className="mb-3 text-xs text-muted-foreground">up to 12 clips on your profile.</p>
          <div className="flex flex-wrap gap-1.5">
            {myClips.map((c) => (
              <Button key={c.id} size="sm" variant={featured.includes(c.id) ? "default" : "ghost"} onClick={() => toggleFeatured(c.id)}>
                {c.title.slice(0, 24)}
              </Button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
