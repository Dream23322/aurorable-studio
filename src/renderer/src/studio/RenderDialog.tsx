import { useEffect, useRef, useState } from "react"
import { api } from "@/lib/api"
import type { RenderProgress } from "@/lib/types"
import { useProject } from "./store"
import { toWireSegment, clipDuration } from "./segments"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"

interface AudioItem {
  id: string
  filename: string
  duration_seconds: number
}

interface JobView {
  id: string
  status: string
  percent: number
  error?: string | null
  clipId?: string | null
  previewUrl?: string | null
}

export function RenderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { project } = useProject()
  const [tier, setTierState] = useState<"preview" | "draft" | "final">(() => (localStorage.getItem("aur.render.tier") as "preview" | "draft" | "final") ?? "final")
  const [crf, setCrfState] = useState(() => Number(localStorage.getItem("aur.render.crf") ?? 18))
  const [hwEnc, setHwEncState] = useState(() => localStorage.getItem("aur.render.hw") === "1")
  const [stretch, setStretchState] = useState(() => localStorage.getItem("aur.render.stretch") === "1")
  const [bgMusicId, setBgMusicIdState] = useState(() => localStorage.getItem("aur.render.bgmusic") ?? "")
  const [bgMusicVol, setBgMusicVol] = useState(0.5)
  const [audioLib, setAudioLib] = useState<AudioItem[]>([])
  const [job, setJob] = useState<JobView | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState("")

  const setTier = (v: "preview" | "draft" | "final") => {
    setTierState(v)
    localStorage.setItem("aur.render.tier", v)
  }
  const setCrf = (v: number) => {
    setCrfState(v)
    localStorage.setItem("aur.render.crf", String(v))
  }
  const setHwEnc = (v: boolean) => {
    setHwEncState(v)
    localStorage.setItem("aur.render.hw", v ? "1" : "0")
  }
  const setStretch = (v: boolean) => {
    setStretchState(v)
    localStorage.setItem("aur.render.stretch", v ? "1" : "0")
  }
  const setBgMusic = (v: string) => {
    setBgMusicIdState(v)
    localStorage.setItem("aur.render.bgmusic", v)
  }

  const totalOut = project.segments.reduce((s, c) => s + clipDuration(c), 0)

  useEffect(() => {
    if (!open) return
    setJob(null)
    setLogs([])
    setError("")
    api<{ audio: AudioItem[] }>("/api/me/audio")
      .then((r) => setAudioLib(r.audio))
      .catch(() => {})
  }, [open])

  const timers = useRef<ReturnType<typeof setInterval>[]>([])

  useEffect(() => {
    const list = timers.current
    return () => list.forEach(clearInterval)
  }, [])

  const pollServer = (id: string) => {
    const timer = setInterval(async () => {
      try {
        const j = await api<RenderProgress>(`/api/me/videos/render/${id}/progress`)
        setJob({
          id,
          status: j.status,
          percent: j.percent,
          error: j.error,
          clipId: j.clip?.id ?? null,
          previewUrl: j.previewUrl ?? null
        })
        if (j.status === "done" || j.status === "error") {
          clearInterval(timer)
          timers.current = timers.current.filter((t) => t !== timer)
          if (j.status === "done" && j.isPreview && j.previewUrl) {
            window.dispatchEvent(new CustomEvent("aurorable:preview-ready", { detail: { url: j.previewUrl } }))
          }
          if (j.status === "error") {
            const l = await api<{ logs: string[] }>(`/api/me/videos/render/${id}/logs`)
            setLogs(l.logs.slice(-30))
          }
        }
      } catch {
        /* ignore */
      }
    }, 1200)
    timers.current.push(timer)
  }

  const submit = async () => {
    setError("")
    setJob(null)
    setLogs([])
    if (!project.segments.length) {
      setError("add at least one clip to the timeline")
      return
    }
    const segments = project.segments.map(toWireSegment)
    const bgMusic = bgMusicId ? { audioId: bgMusicId, volume: bgMusicVol } : undefined

    try {
      const r = await api<{ ok: boolean; jobId: string }>("/api/me/videos/render", {
        body: {
          segments,
          preview: tier === "preview",
          draft: tier === "draft",
          hwEnc,
          crf,
          stretchWideTo43: stretch,
          title: project.title || "studio render",
          bgMusic
        }
      })
      setJob({ id: r.jobId, status: "running", percent: 0 })
      pollServer(r.jobId)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[480px] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-aurora-pink">render</DialogTitle>
          <DialogDescription>
            {project.segments.length} clips · {Math.round(totalOut)}s · rendered by the site's engine.
          </DialogDescription>
        </DialogHeader>

        {!job ? (
          <div className="flex flex-col gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">quality</Label>
              <select value={tier} onChange={(e) => setTier(e.target.value as never)} className="rounded border bg-background px-2 py-1.5 text-sm">
                <option value="preview">preview (480p, fast)</option>
                <option value="draft">draft (720p)</option>
                <option value="final">final (full res)</option>
              </select>
            </div>
            <div className="grid gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">crf ({crf}) — lower = better</span>
              </div>
              <input type="range" min={15} max={28} step={1} value={crf} disabled={tier !== "final"} onChange={(e) => setCrf(Number(e.target.value))} />
            </div>
            <div className="flex gap-4 text-xs">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={hwEnc} onChange={(e) => setHwEnc(e.target.checked)} />
                gpu encode (nvenc)
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={stretch} onChange={(e) => setStretch(e.target.checked)} />
                4:3 → 16:9
              </label>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">background music</Label>
              <select value={bgMusicId} onChange={(e) => setBgMusic(e.target.value)} className="rounded border bg-background px-2 py-1.5 text-sm">
                <option value="">none</option>
                {audioLib.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.filename}
                  </option>
                ))}
              </select>
            </div>
            {bgMusicId && (
              <div className="grid gap-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">music volume</span>
                  <span className="text-aurora-pink">{bgMusicVol.toFixed(2)}</span>
                </div>
                <input type="range" min={0} max={1} step={0.05} value={bgMusicVol} onChange={(e) => setBgMusicVol(Number(e.target.value))} />
              </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{job.status}</span>
              <span className="text-muted-foreground">{job.percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-background">
              <div className="h-full transition-all" style={{ width: `${job.percent}%`, background: "linear-gradient(90deg, var(--pink-deep), var(--pink-bright))" }} />
            </div>
            {job.status === "error" && (
              <>
                <p className="text-xs text-destructive">{job.error}</p>
                {logs.length > 0 && (
                  <pre className="max-h-52 overflow-auto rounded bg-background p-2 text-[11px] text-muted-foreground">{logs.join("\n")}</pre>
                )}
              </>
            )}
            {job.status === "done" && job.previewUrl && (
              <p className="text-xs text-aurora-good">preview ready — playing in the monitor.</p>
            )}
            {job.status === "done" && job.clipId && (
              <p className="text-xs text-aurora-good">
                render complete. <a href={`#/v/${job.clipId}`} className="text-aurora-pink">view clip</a>
              </p>
            )}
            {(job.status === "running" || job.status === "in_progress") && (
              <p className="text-xs text-muted-foreground">rendering…</p>
            )}
          </div>
        )}

        <DialogFooter>
          {!job ? (
            <Button onClick={submit}>start render</Button>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}