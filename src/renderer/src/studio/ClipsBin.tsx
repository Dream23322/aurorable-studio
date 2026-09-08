import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { fmtShort } from "@/lib/utils"
import type { LiveVideo } from "@/lib/types"
import { useUser } from "@/lib/user-store"
import { useProject } from "./store"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export function ClipsBin() {
  const { user } = useUser()
  const { project } = useProject()
  const [clips, setClips] = useState<LiveVideo[]>([])

  const used = new Set(project.segments.map((s) => s.sourceId))

  const load = async () => {
    if (!user) return
    try {
      setClips(await api<LiveVideo[]>("/api/me/videos"))
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void load()
  }, [user])

  const addClip = (v: LiveVideo) => {
    window.dispatchEvent(new CustomEvent("aurorable:addclip", { detail: { clipId: v.id, duration: v.durationSeconds } }))
  }

  return (
    <div className="flex min-h-0 flex-col" style={{ background: "var(--bg-elev)" }}>
      <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
        <span className="text-xs font-semibold text-aurora-pink">clips</span>
        <Button size="sm" variant="ghost" onClick={() => void load()}>
          <RefreshCw size={12} />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <div className="flex flex-col gap-1.5">
          {clips.map((c) => (
            <button
              key={c.id}
              onClick={() => addClip(c)}
              title={`${c.title} · ${c.width}×${c.height} · ${fmtShort(c.durationSeconds)}`}
              className="flex w-full items-center gap-2 rounded-md border p-1.5 text-left transition-colors hover:border-aurora-bright"
              style={{ borderColor: "var(--border)", background: "var(--bg-elev-2)" }}
            >
              {c.thumbnailUrl && <img src={c.thumbnailUrl} alt="" className="h-8 w-14 rounded object-cover" />}
              <div className="min-w-0">
                <div className="truncate text-xs">{c.title}</div>
                <div className="text-[10px] text-muted-foreground">
                  {c.width}×{c.height} · {fmtShort(c.durationSeconds)}
                  {used.has(c.id) && <span className="ml-1 text-aurora-good">· in timeline</span>}
                </div>
              </div>
            </button>
          ))}
          {clips.length === 0 && (
            <p className="p-3 text-center text-xs text-muted-foreground">
              no clips yet.
              <br />
              <a href="#/" className="text-aurora-pink">upload one</a>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}