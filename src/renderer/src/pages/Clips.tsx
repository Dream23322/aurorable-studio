import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { api } from "@/lib/api"
import { fmtShort } from "@/lib/utils"
import type { LiveVideo, QuotaInfo, StudioSessionMeta } from "@/lib/types"
import { useUser } from "@/lib/user-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { FolderOpen, Trash2 } from "lucide-react"
import { BandTitle } from "@/components/band-title"

export default function Clips() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [clips, setClips] = useState<LiveVideo[]>([])
  const [filter, setFilter] = useState("")
  const [quota, setQuota] = useState<QuotaInfo>({ clipCount: 0, freeClipQuota: 10, nextUploadCompressed: false })
  const [sessions, setSessions] = useState<StudioSessionMeta[]>([])
  const [showProjects, setShowProjects] = useState(false)
  const [sort, setSort] = useState<"newest" | "oldest" | "views" | "duration">("newest")

  const sorted = [...clips].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return a.createdAt - b.createdAt
      case "views":
        return b.views - a.views
      case "duration":
        return b.durationSeconds - a.durationSeconds
      default:
        return b.createdAt - a.createdAt
    }
  })
  const filtered = filter ? sorted.filter((c) => c.title.toLowerCase().includes(filter.toLowerCase())) : sorted

  const load = async () => {
    try {
      const [list, q] = await Promise.all([
        api<LiveVideo[]>("/api/me/videos"),
        api<QuotaInfo>("/api/me/quota")
      ])
      setClips(list)
      setQuota(q)
      const s = await api<{ sessions: StudioSessionMeta[] }>("/api/me/sessions")
      setSessions(s.sessions)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!user) {
      navigate("/login")
      return
    }
    void load()
  }, [user])

  const remove = async (id: string) => {
    if (!confirm("delete this clip?")) return
    await api(`/api/me/videos/${id}`, { method: "DELETE" })
    setClips((prev) => prev.filter((c) => c.id !== id))
    toast.success("deleted")
  }

  const rename = async (id: string, title: string) => {
    if (!title.trim()) return
    await api(`/api/me/videos/${id}`, { method: "PATCH", body: { title } })
    void load()
  }

  const deleteSession = async (id: string) => {
    if (!confirm("delete this project?")) return
    await api(`/api/me/sessions/${id}`, { method: "DELETE" })
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <BandTitle className="text-sm">my clips</BandTitle>
        <span className="text-xs text-muted-foreground">
          {user?.username} · {quota.clipCount}/{quota.freeClipQuota} free
        </span>
        <div className="flex-1" />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as never)}
          className="rounded border bg-background px-2 py-1 text-xs"
          style={{ borderColor: "var(--border)" }}
        >
          <option value="newest">newest</option>
          <option value="oldest">oldest</option>
          <option value="views">most viewed</option>
          <option value="duration">longest</option>
        </select>
        <Button variant="ghost" size="sm" onClick={() => setShowProjects((v) => !v)}>
          <FolderOpen size={14} className="mr-1.5" />
          projects ({sessions.length})
        </Button>
        <Button size="sm" onClick={() => navigate("/studio")}>
          new project
        </Button>
      </div>

      {showProjects && (
        <div className="mb-4 rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
          <p className="mb-2 text-xs text-aurora-pink">studio projects</p>
          {sessions.length === 0 && <p className="text-xs text-muted-foreground">no saved projects yet.</p>}
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 border-t py-1.5 text-sm first:border-t-0" style={{ borderColor: "var(--border)" }}>
              <Link to={`/studio?session=${s.id}`} className="hover:text-aurora-pink">
                {s.title}
              </Link>
              <span className="text-xs text-muted-foreground">{s.updated}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteSession(s.id)}>
                <Trash2 size={12} />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="filter clips…" className="mb-4 max-w-xs" />

      {filtered.length === 0 && <p className="text-sm text-muted-foreground">no clips yet — upload one from home.</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((c) => (
          <div key={c.id} className="overflow-hidden rounded-lg border transition-colors hover:border-aurora-bright" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
            <Link to={`/v/${c.id}`} className="relative block aspect-video bg-black">
              {c.thumbnailUrl && <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
              <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 text-[11px] text-aurora-pink">
                {fmtShort(c.durationSeconds)}
              </span>
              {c.compressed && (
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 text-[11px] text-aurora-pink">compressed</span>
              )}
            </Link>
            <div className="p-2.5">
              <input
                defaultValue={c.title}
                onBlur={(e) => rename(c.id, e.target.value)}
                className="w-full bg-transparent text-sm outline-none"
                title="click to rename"
              />
              <div className="mt-0.5 text-xs text-muted-foreground">
                {c.views} views · {new Date(c.createdAt).toLocaleDateString()} · {c.width}×{c.height}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => navigate(`/v/${c.id}`)}>
                  watch
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/studio?clip=${c.id}`)}>
                  studio
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(c.pageUrl)} title="public link">
                  copy link
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(c.id)}>
                  del
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}