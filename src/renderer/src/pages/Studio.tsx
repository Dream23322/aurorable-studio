import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { api } from "@/lib/api"
import { useUser } from "@/lib/user-store"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ProjectProvider, useProject, projectDuration } from "@/studio/store"
import { defaultSegment, toWireSegment, clipDuration, type TimelineClip } from "@/studio/segments"
import { ClipsBin } from "@/studio/ClipsBin"
import { Timeline } from "@/studio/Timeline"
import { Inspector } from "@/studio/Inspector"
import { Preview } from "@/studio/Preview"
import { RenderDialog } from "@/studio/RenderDialog"
import { Undo2, Redo2, Clapperboard, Film } from "lucide-react"

function StudioInner() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const {
    project,
    projectId,
    setProjectId,
    setTitle,
    setProject,
    mutate,
    pushUndo,
    undo,
    redo,
    canUndo,
    canRedo,
    selectedUid,
    setSelectedUid,
    playhead,
    setPlayhead,
    clearHistory
  } = useProject()

  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving">("saved")
  const [renderOpen, setRenderOpen] = useState(false)
  const [workerOnline, setWorkerOnline] = useState(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addClip = useCallback(
    (clipId: string, duration: number) => {
      pushUndo()
      const end = project.segments.length ? Math.max(...project.segments.map((c) => c.timelineStart + clipDuration(c))) : 0
      const seg = defaultSegment(clipId, duration)
      seg.timelineStart = Math.round(end * 100) / 100
      mutate((p) => p.segments.push(seg))
      setSelectedUid(seg.uid)
      setPlayhead(end)
      window.dispatchEvent(new CustomEvent("aurorable:seek", { detail: { time: end } }))
    },
    [project.segments, pushUndo, mutate, setSelectedUid, setPlayhead]
  )

  useEffect(() => {
    const onAddClip = (e: Event) => {
      const { clipId, duration } = (e as CustomEvent).detail as { clipId: string; duration: number }
      addClip(clipId, duration)
    }
    window.addEventListener("aurorable:addclip", onAddClip)
    return () => window.removeEventListener("aurorable:addclip", onAddClip)
  }, [addClip])

  // autosave (debounced)
  useEffect(() => {
    setSaveState("dirty")
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void save(true)
    }, 3000)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project])

  const save = async (quiet = false) => {
    if (!project.segments.length) return
    if (!projectId) setProjectId(crypto.randomUUID().slice(0, 16))
    const id = projectId || crypto.randomUUID().slice(0, 16)
    setSaveState("saving")
    try {
      await api("/api/me/sessions", {
        body: { id, title: project.title, segments: project.segments.map(toWireSegment), settings: project.settings }
      })
      setProjectId(id)
      setSaveState("saved")
      if (!quiet) toast.success("project saved")
    } catch (e) {
      setSaveState("dirty")
      if (!quiet) toast.error((e as Error).message)
    }
  }

  // init: session or clip deep link
  useEffect(() => {
    if (!user) {
      navigate("/login")
      return
    }
    const sessionId = params.get("session")
    const clipId = params.get("clip")
    ;(async () => {
      if (sessionId) {
        try {
          const s = await api<{ id: string; title: string; segments: string; settings: string | null }>(`/api/me/sessions/${sessionId}`)
          setProjectId(s.id)
          setTitle(s.title)
          const mine = (await api<Array<{ id: string }>>("/api/me/videos")).map((v) => v.id)
          const segs = JSON.parse(s.segments) as Array<Record<string, unknown>>
          const timeline: TimelineClip[] = []
          for (const raw of segs) {
            if (typeof raw.sourceId !== "string" || !mine.includes(raw.sourceId)) continue
            timeline.push({
              ...(raw as unknown as Omit<TimelineClip, "uid" | "timelineStart">),
              uid: crypto.randomUUID(),
              timelineStart: typeof raw.timelineStart === "number" ? (raw.timelineStart as number) : 0
            })
          }
          setProject({ id: s.id, title: s.title, segments: timeline, settings: s.settings ? JSON.parse(s.settings) : {} })
          clearHistory()
        } catch (e) {
          toast.error((e as Error).message)
        }
      } else if (clipId) {
        const v = await api<{ durationSeconds: number }>(`/api/video/${clipId}`).catch(() => null)
        if (v) addClip(clipId, v.durationSeconds)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // worker status
  useEffect(() => {
    const check = () =>
      api<{ online: number }>("/api/me/workers/status")
        .then((r) => setWorkerOnline(r.online))
        .catch(() => {})
    void check()
    const t = setInterval(check, 15000)
    return () => clearInterval(t)
  }, [])

  // mark in/out
  const onMark = useCallback(
    (edge: "in" | "out") => {
      const clip = project.segments.find((c) => c.uid === selectedUid)
      if (!clip) return
      const sourceT = clip.start + (playhead - clip.timelineStart) * (clip.speed || 1)
      pushUndo()
      mutate((p) => {
        const c = p.segments.find((x) => x.uid === clip.uid)
        if (!c) return
        if (edge === "in") c.start = Math.max(0, Math.min(sourceT, c.end - 0.1))
        else c.end = Math.min(c.end + 1e9, Math.max(sourceT, c.start + 0.1))
      })
    },
    [project.segments, selectedUid, playhead, pushUndo, mutate]
  )

  useEffect(() => {
    const onMarkEvent = (e: Event) => onMark((e as CustomEvent).detail.edge as "in" | "out")
    window.addEventListener("aurorable:mark", onMarkEvent)
    return () => window.removeEventListener("aurorable:mark", onMarkEvent)
  }, [onMark])

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA") return
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault()
          undo()
        } else if (e.key === "z" && e.shiftKey) {
          e.preventDefault()
          redo()
        } else if (e.key === "s") {
          e.preventDefault()
          void save()
        }
        return
      }
      switch (e.key) {
        case " ":
          e.preventDefault()
          window.dispatchEvent(new CustomEvent("aurorable:play"))
          break
        case "s":
          window.dispatchEvent(new CustomEvent("aurorable:split"))
          break
        case "i":
          onMark("in")
          break
        case "o":
          onMark("out")
          break
        case "Delete":
        case "Backspace":
          window.dispatchEvent(new CustomEvent("aurorable:delete"))
          break
        case "ArrowLeft":
          window.dispatchEvent(new CustomEvent("aurorable:nav-clip", { detail: { dir: -1 } }))
          break
        case "ArrowRight":
          window.dispatchEvent(new CustomEvent("aurorable:nav-clip", { detail: { dir: 1 } }))
          break
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [undo, redo, onMark, save])

  useEffect(() => {
    document.body.classList.add("no-crt")
    return () => document.body.classList.remove("no-crt")
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* header */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
        <Clapperboard size={14} className="text-aurora-bright" />
        <span className="text-sm font-bold text-aurora-bright">studio</span>
        <input
          value={project.title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => void save()}
          className="w-64 rounded border-transparent bg-transparent px-2 py-0.5 text-sm outline-none hover:border-border focus:border-aurora-bright"
          placeholder="untitled project"
        />
        <span className="text-xs text-muted-foreground">
          {saveState === "saved" ? "saved" : saveState === "saving" ? "saving…" : "unsaved"}
        </span>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{workerOnline > 0 ? "● worker online" : "○ worker offline"}</span>
        <Button size="sm" variant="ghost" onClick={undo} disabled={!canUndo} title="undo (ctrl+z)">
          <Undo2 size={14} />
        </Button>
        <Button size="sm" variant="ghost" onClick={redo} disabled={!canRedo} title="redo (ctrl+shift+z)">
          <Redo2 size={14} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => navigate("/clips")}>
          <Film size={14} className="mr-1.5" />
          clips
        </Button>
        <Button size="sm" onClick={() => setRenderOpen(true)}>
          render
        </Button>
      </div>

      {/* workspace */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(320px,1fr)_300px]">
          <ClipsBin />
          <Preview />
          <div className="flex min-h-0 flex-col border-l" style={{ borderColor: "var(--border)" }}>
            <div className="border-b px-3 py-2 text-xs font-semibold text-aurora-pink" style={{ borderColor: "var(--border)" }}>
              inspector
            </div>
            <Inspector />
          </div>
        </div>
        <div className="h-56 shrink-0">
          <Timeline />
        </div>
      </div>

      <RenderDialog open={renderOpen} onOpenChange={setRenderOpen} />
    </div>
  )
}

export default function Studio() {
  return (
    <ProjectProvider>
      <StudioInner />
    </ProjectProvider>
  )
}

export { projectDuration }