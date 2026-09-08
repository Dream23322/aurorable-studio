import { useEffect, useRef, useState } from "react"
import { fmtTime } from "@/lib/utils"
import { useUser } from "@/lib/user-store"
import { useProject } from "./store"
import { Button } from "@/components/ui/button"
import { Play, Pause, SkipBack, SkipForward } from "lucide-react"

export function Preview() {
  const { user } = useUser()
  const { project, selectedUid, playhead, setPlayhead } = useProject()
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [label, setLabel] = useState("no clip selected")
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const clip = project.segments.find((c) => c.uid === selectedUid) ?? null

  useEffect(() => {
    const onPreviewReady = (e: Event) => {
      const url = (e as CustomEvent).detail.url as string
      setPreviewSrc(url)
      const v = videoRef.current
      if (v) {
        v.src = url
        setLabel("480p proxy preview")
        void v.load()
      }
    }
    window.addEventListener("aurorable:preview-ready", onPreviewReady)
    return () => window.removeEventListener("aurorable:preview-ready", onPreviewReady)
  }, [])

  // load source when selection changes (unless a preview is playing)
  useEffect(() => {
    const v = videoRef.current
    if (!v || previewSrc) return
    if (!clip || !user) {
      setLabel("no clip selected")
      v.removeAttribute("src")
      return
    }
    fetch(`/api/video/${clip.sourceId}/file`)
      .then((r) => r.ok && (v.src = r.url))
      .catch(() => {})
    setLabel(`scrub source · in ${fmtTime(clip.start)} · out ${fmtTime(clip.end)}`)
    v.load()
  }, [clip?.uid, user, previewSrc])

  const seekTo = (t: number) => {
    const v = videoRef.current
    if (!v || !clip) return
    const srcT = clip.start + (t - clip.timelineStart) * (clip.speed || 1)
    v.currentTime = Math.max(0, Math.min(srcT, clip.end))
    setCurrent(t)
  }

  useEffect(() => {
    const onSeek = (e: Event) => seekTo((e as CustomEvent).detail.time)
    window.addEventListener("aurorable:seek", onSeek)
    return () => window.removeEventListener("aurorable:seek", onSeek)
  }, [clip, project.segments])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) void v.play().catch(() => {})
    else v.pause()
  }

  useEffect(() => {
    const onPlay = () => togglePlay()
    window.addEventListener("aurorable:play", onPlay)
    return () => window.removeEventListener("aurorable:play", onPlay)
  }, [togglePlay])

  const onTimeUpdate = () => {
    const v = videoRef.current
    if (!v || !clip) return
    const outT = clip.timelineStart + (v.currentTime - clip.start) / (clip.speed || 1)
    setPlayhead(Math.max(0, outT))
    setCurrent(outT)
    drawScope(v)
  }

  let scopeTimer: ReturnType<typeof setTimeout> | null = null
  const drawScope = (v: HTMLVideoElement) => {
    const cv = canvasRef.current
    if (!cv || scopeTimer) return
    scopeTimer = setTimeout(() => {
      scopeTimer = null
      const ctx = cv.getContext("2d")
      if (!ctx) return
      const W = cv.width
      const H = cv.height
      ctx.clearRect(0, 0, W, H)
      try {
        ctx.drawImage(v, 0, 0, 96, 54)
        const data = ctx.getImageData(0, 0, 96, 54).data
        const hist = new Array(32).fill(0)
        for (let i = 0; i < data.length; i += 4) {
          const y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
          hist[Math.min(31, Math.floor(y / 8))]++
        }
        const max = Math.max(1, ...hist)
        ctx.fillStyle = "rgba(0,0,0,0.85)"
        ctx.fillRect(0, 0, W, H)
        const bw = W / 32
        for (let i = 0; i < 32; i++) {
          const bh = (hist[i] / max) * (H - 6)
          ctx.fillStyle = `rgba(255,93,146,${0.5 + (i / 32) * 0.5})`
          ctx.fillRect(i * bw, H - bh, bw - 1, bh)
        }
      } catch {
        /* ignore */
      }
    }, 120)
  }

  const navClip = (dir: number) => {
    if (!project.segments.length) return
    const sorted = [...project.segments].sort((a, b) => a.timelineStart - b.timelineStart)
    const idx = sorted.findIndex((c) => c.uid === selectedUid)
    // handled by Studio via event
    window.dispatchEvent(new CustomEvent("aurorable:nav-clip", { detail: { dir } }))
    void idx
  }

  return (
    <div className="flex min-h-0 flex-col" style={{ background: "var(--bg-elev)" }}>
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
        <video
          ref={videoRef}
          playsInline
          className="max-h-full max-w-full object-contain"
          onTimeUpdate={onTimeUpdate}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        <span className="absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-aurora-pink">{label}</span>
        <canvas ref={canvasRef} width="192" height="48" className="absolute right-2 bottom-2 h-12 w-48 rounded" />
      </div>
      <div className="flex items-center gap-1.5 border-t px-2 py-1.5" style={{ borderColor: "var(--border)" }}>
        <Button size="sm" variant="ghost" onClick={() => navClip(-1)} title="previous clip">
          <SkipBack size={14} />
        </Button>
        <Button size="sm" variant="ghost" onClick={togglePlay} title="play/pause (space)">
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => navClip(1)} title="next clip">
          <SkipForward size={14} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { const v = videoRef.current; if (v) { v.currentTime -= 1 / 30; onTimeUpdate() } }}>
          ⟨
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { const v = videoRef.current; if (v) { v.currentTime += 1 / 30; onTimeUpdate() } }}>
          ⟩
        </Button>
        <span className="ml-1 text-[13px] text-aurora-pink">{fmtTime(current)}</span>
        <span className="ml-auto text-xs text-muted-foreground">{fmtTime(playhead)}</span>
      </div>
    </div>
  )
}