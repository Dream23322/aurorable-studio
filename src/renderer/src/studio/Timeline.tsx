import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "@/lib/api"
import { fmtTime, clamp } from "@/lib/utils"
import { useUser } from "@/lib/user-store"
import { useProject, projectDuration } from "./store"
import { clipDuration, type TimelineClip } from "./segments"
import { Button } from "@/components/ui/button"

const SNAP_MS = 0.1

type DragMode = "trim-start" | "trim-end" | "move"

type DragState = {
  mode: DragMode
  uid: string
  startX: number
  origTimelineStart: number
  origIn: number
  origOut: number
  origDur: number
} | null

export function Timeline() {
  const { user } = useUser()
  const { project, mutate, pushUndo, selectedUid, setSelectedUid, playhead, setPlayhead } = useProject()
  const [pps, setPps] = useState(80)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [drag, setDrag] = useState<DragState>(null)
  const [snapTime, setSnapTime] = useState<number | null>(null)
  const [clips, setClips] = useState<Record<string, { title?: string; thumbnailUrl?: string | null; durationSeconds?: number }>>({})
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevPlayhead = useRef(playhead)
  const total = projectDuration(project)
  const markers = project.settings.markers ?? []

  useEffect(() => {
    if (!user) return
    api<Array<{ id: string; title: string; thumbnailUrl: string | null; durationSeconds: number }>>("/api/me/videos")
      .then((list) => {
        const map: Record<string, { title?: string; thumbnailUrl?: string | null; durationSeconds?: number }> = {}
        for (const v of list) map[v.id] = { title: v.title, thumbnailUrl: v.thumbnailUrl, durationSeconds: v.durationSeconds }
        setClips(map)
      })
      .catch(() => {})
  }, [user])

  const sourceDur = (uid: string) => {
    const c = project.segments.find((x) => x.uid === uid)
    return c ? (clips[c.sourceId]?.durationSeconds ?? c.end) : 0
  }

  const nearestSnap = (t: number, excludeUid: string): number | null => {
    if (!snapEnabled) return null
    const candidates = [0, playhead]
    for (const c of project.segments) {
      if (c.uid === excludeUid) continue
      candidates.push(c.timelineStart)
      candidates.push(c.timelineStart + clipDuration(c))
    }
    let best: number | null = null
    for (const cand of candidates) {
      if (Math.abs(cand - t) <= SNAP_MS && (best === null || Math.abs(cand - t) < Math.abs(best - t))) best = cand
    }
    return best
  }

  // auto-center the playhead when it jumps (seek), not during playback
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const delta = Math.abs(playhead - prevPlayhead.current)
    prevPlayhead.current = playhead
    if (delta < 0.01 || delta > 2) return
    const px = playhead * pps
    const left = el.scrollLeft
    const right = left + el.clientWidth
    if (px < left + 24 || px > right - 24) {
      el.scrollLeft = px - el.clientWidth / 2
    }
  }, [playhead, pps])

  const toTime = (x: number) => x / pps

  const onPointerDown = (e: React.PointerEvent, clip: TimelineClip, mode: DragMode) => {
    e.preventDefault()
    e.stopPropagation()
    pushUndo()
    setDrag({
      mode,
      uid: clip.uid,
      startX: e.clientX,
      origTimelineStart: clip.timelineStart,
      origIn: clip.start,
      origOut: clip.end,
      origDur: clip.end - clip.start
    })
  }

  useEffect(() => {
    if (!drag) return
    const onMove = (e: PointerEvent) => {
      const d = drag
      const seg = project.segments.find((c) => c.uid === d.uid)
      if (!seg) return
      const dt = toTime(e.clientX - d.startX)
      if (d.mode === "move") {
        let newStart = Math.max(0, d.origTimelineStart + dt)
        const snap = nearestSnap(newStart, seg.uid)
        if (snap !== null) newStart = snap
        setSnapTime(snap)
        mutate((p) => {
          const s = p.segments.find((c) => c.uid === d.uid)
          if (s) s.timelineStart = newStart
        })
      } else if (d.mode === "trim-start") {
        let newIn = clamp(d.origIn + dt, 0, d.origOut - 0.1)
        const edge = seg.timelineStart + (newIn - d.origIn)
        const snap = nearestSnap(edge, seg.uid)
        if (snap !== null && Math.abs(snap - edge) < 0.3) newIn = d.origIn + (snap - seg.timelineStart)
        setSnapTime(snap !== null && Math.abs(snap - edge) < 0.3 ? snap : null)
        mutate((p) => {
          const s = p.segments.find((c) => c.uid === d.uid)
          if (s) {
            s.start = newIn
            s.timelineStart = d.origTimelineStart + (newIn - d.origIn)
          }
        })
        // trim scrub: preview the exact frame at the new edge
        const edgeTime = seg.timelineStart + (newIn - d.origIn)
        window.dispatchEvent(new CustomEvent("aurorable:seek", { detail: { time: edgeTime } }))
      } else {
        let newOut = clamp(d.origOut + dt, d.origIn + 0.1, sourceDur(d.uid))
        const edge = seg.timelineStart + (newOut - d.origOut)
        const snap = nearestSnap(edge, seg.uid)
        if (snap !== null && Math.abs(snap - edge) < 0.3) newOut = d.origOut + (snap - seg.timelineStart)
        setSnapTime(snap !== null && Math.abs(snap - edge) < 0.3 ? snap : null)
        mutate((p) => {
          const s = p.segments.find((c) => c.uid === d.uid)
          if (s) s.end = newOut
        })
        // trim scrub: preview the frame at the new out point
        const edgeTime = seg.timelineStart + (newOut - d.origOut)
        window.dispatchEvent(new CustomEvent("aurorable:seek", { detail: { time: edgeTime } }))
      }
    }
    const onUp = () => {
      setDrag(null)
      setSnapTime(null)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [drag, project, pps, playhead, snapEnabled, clips])

  const onTrackClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const t = clamp(toTime(e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0)), 0, total)
    setPlayhead(t)
    window.dispatchEvent(new CustomEvent("aurorable:seek", { detail: { time: t } }))
  }

  const onWheel = (e: React.WheelEvent) => {
    const el = scrollRef.current
    if (!el) return
    if (e.deltaY && e.shiftKey) {
      el.scrollLeft += e.deltaY
      return
    }
    const anchor = e.clientX
    const timeAt = toTime(anchor - el.getBoundingClientRect().left + el.scrollLeft)
    const next = clamp(pps * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 20, 400)
    setPps(next)
    requestAnimationFrame(() => {
      el.scrollLeft = timeAt * next - (anchor - el.getBoundingClientRect().left)
    })
  }

  const split = useCallback(() => {
    const clip = project.segments.find((c) => c.uid === selectedUid)
    if (!clip) return
    if (Math.abs(playhead - clip.timelineStart) < 0.05 || Math.abs(playhead - (clip.timelineStart + clipDuration(clip))) < 0.05) return
    pushUndo()
    const sourceAt = clip.start + (playhead - clip.timelineStart) * (clip.speed || 1)
    mutate((p) => {
      const s = p.segments.find((c) => c.uid === clip.uid)
      if (!s) return
      const oldEnd = s.end
      s.end = Math.min(oldEnd, sourceAt)
      const clone: TimelineClip = structuredClone(s)
      clone.uid = crypto.randomUUID()
      clone.timelineStart = s.timelineStart + clipDuration(s)
      clone.start = Math.min(sourceAt, oldEnd)
      p.segments.splice(p.segments.indexOf(s) + 1, 0, clone)
      setSelectedUid(clone.uid)
    })
  }, [project.segments, selectedUid, playhead, pushUndo, mutate, setSelectedUid])

  const removeSelected = useCallback(
    (ripple = false) => {
      if (!selectedUid) return
      pushUndo()
      const removed = project.segments.find((c) => c.uid === selectedUid)
      mutate((p) => {
        if (ripple && removed) {
          const dur = clipDuration(removed)
          const start = removed.timelineStart
          p.segments = p.segments
            .filter((c) => c.uid !== selectedUid)
            .map((c) => (c.timelineStart >= start ? { ...c, timelineStart: Math.max(0, c.timelineStart - dur) } : c))
        } else {
          p.segments = p.segments.filter((c) => c.uid !== selectedUid)
        }
      })
      setSelectedUid(null)
    },
    [selectedUid, pushUndo, mutate, setSelectedUid, project.segments]
  )

  const duplicate = useCallback(() => {
    const clip = project.segments.find((c) => c.uid === selectedUid)
    if (!clip) return
    pushUndo()
    const dur = clipDuration(clip)
    mutate((p) => {
      const s = p.segments.find((c) => c.uid === clip.uid)
      if (!s) return
      const clone: TimelineClip = structuredClone(s)
      clone.uid = crypto.randomUUID()
      clone.timelineStart = s.timelineStart + dur
      p.segments.splice(p.segments.indexOf(s) + 1, 0, clone)
      setSelectedUid(clone.uid)
    })
  }, [project.segments, selectedUid, pushUndo, mutate, setSelectedUid])

  const fitZoom = useCallback(() => {
    const el = scrollRef.current
    if (!el || total <= 0) return
    setPps(clamp((el.clientWidth - 90) / total, 20, 400))
  }, [total])

  useEffect(() => {
    const onSplit = () => split()
    const onDelete = () => removeSelected(false)
    const onRippleDelete = () => removeSelected(true)
    const onDuplicate = () => duplicate()
    window.addEventListener("aurorable:split", onSplit)
    window.addEventListener("aurorable:delete", onDelete)
    window.addEventListener("aurorable:ripple-delete", onRippleDelete)
    window.addEventListener("aurorable:duplicate", onDuplicate)
    return () => {
      window.removeEventListener("aurorable:split", onSplit)
      window.removeEventListener("aurorable:delete", onDelete)
      window.removeEventListener("aurorable:ripple-delete", onRippleDelete)
      window.removeEventListener("aurorable:duplicate", onDuplicate)
    }
  }, [split, removeSelected, duplicate])

  const rulerTicks: Array<{ t: number; major: boolean }> = []
  {
    const step = pps >= 200 ? 1 : pps >= 80 ? 5 : 10
    for (let t = 0; t <= total; t += step) {
      rulerTicks.push({ t, major: true })
      if (step > 1) for (let k = 1; k < step; k++) rulerTicks.push({ t: t + k * (step / 5), major: false })
    }
  }

  // audio waveforms, cached
  const [waveforms, setWaveforms] = useState<Record<string, number[]>>({})
  const fetchWaveform = (sourceId: string) => {
    if (waveforms[sourceId]) return
    api<{ peaks: number[] }>(`/api/me/videos/${sourceId}/waveform`)
      .then((r) => setWaveforms((prev) => ({ ...prev, [sourceId]: r.peaks })))
      .catch(() => {})
  }

  return (
    <div className="flex min-h-0 flex-col" style={{ background: "var(--bg-elev)" }}>
      <div className="flex items-center gap-2 border-b px-3 py-1.5" style={{ borderColor: "var(--border)" }}>
        <Button size="sm" variant="ghost" onClick={split} title="split at playhead (S)">
          ✂ split
        </Button>
        <Button size="sm" variant="ghost" onClick={() => removeSelected(false)} title="delete (Del)">
          del
        </Button>
        <Button size="sm" variant="ghost" onClick={() => removeSelected(true)} title="ripple delete (shift+del)">
          ripple
        </Button>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} />
          snap
        </label>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">zoom</span>
        <Button size="sm" variant="ghost" onClick={() => setPps((p) => clamp(p / 1.3, 20, 400))}>
          −
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setPps((p) => clamp(p * 1.3, 20, 400))}>
          +
        </Button>
        <Button size="sm" variant="ghost" onClick={fitZoom} title="fit timeline">
          fit
        </Button>
        <span className="w-16 text-right text-xs text-muted-foreground">{pps}px/s</span>
      </div>

      {project.segments.length === 0 && (
        <div className="border-b px-3 py-1 text-xs text-muted-foreground" style={{ borderColor: "var(--border)" }}>
          timeline is empty — click a clip in the bin to add it.
        </div>
      )}

      <div ref={scrollRef} onWheel={onWheel} className="min-h-0 flex-1 overflow-auto">
        <div className="relative" style={{ width: Math.max(projectDuration(project) * pps, 600) }}>
          {/* ruler */}
          <div className="relative h-7 cursor-pointer border-b" style={{ borderColor: "var(--border)" }} onClick={onTrackClick}>
            {rulerTicks.map((tick) => (
              <div
                key={`${tick.t}-${tick.major}`}
                className="absolute top-0 bottom-0 w-px"
                style={{
                  left: tick.t * pps,
                  background: tick.major ? "var(--pink-bright)" : "var(--border)",
                  opacity: tick.major ? 0.7 : 0.3
                }}
              >
                {tick.major && (
                  <span className="absolute top-0.5 left-1 text-[10px] text-muted-foreground">{fmtTime(tick.t)}</span>
                )}
              </div>
            ))}
            {markers.map((m, i) => (
              <button
                key={i}
                title={m.label || `marker ${fmtTime(m.at)}`}
                className="absolute top-0 z-10 h-full cursor-pointer border-l-2 border-aurora-bright/80"
                style={{ left: m.at * pps }}
                onClick={(e) => {
                  e.stopPropagation()
                  setPlayhead(m.at)
                  window.dispatchEvent(new CustomEvent("aurorable:seek", { detail: { time: m.at } }))
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  mutate((p) => {
                    p.settings.markers = (p.settings.markers ?? []).filter((_, j) => j !== i)
                  })
                }}
              >
                <span className="absolute -top-0.5 left-1 text-[10px] text-aurora-bright">▼</span>
              </button>
            ))}
          </div>

          {/* V1 */}
          <div
            className="relative h-12 cursor-pointer border-b"
            style={{
              borderColor: "var(--border)",
              background: "repeating-linear-gradient(90deg, transparent 0 39px, rgba(95,162,232,0.07) 39px 40px)"
            }}
            onClick={onTrackClick}
          >
            <span className="absolute top-0.5 left-1 z-10 text-[10px] text-muted-foreground">V1</span>
            {project.segments.map((clip) => {
              const vid = clips[clip.sourceId]
              const dur = clipDuration(clip)
              const left = clip.timelineStart * pps
              const sel = selectedUid === clip.uid
              return (
                <div
                  key={clip.uid}
                  className={`absolute top-0.5 z-[5] cursor-grab overflow-hidden rounded-md ${sel ? "outline outline-2 outline-aurora-bright" : ""}`}
                  style={{
                    left,
                    width: Math.max(24, dur * pps),
                    height: 44,
                    border: "1px solid var(--border)",
                    boxShadow: sel ? "0 0 12px rgba(var(--glow-rgb),0.3)" : undefined
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedUid(clip.uid)
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    setPlayhead(clip.timelineStart + dur / 2)
                    window.dispatchEvent(new CustomEvent("aurorable:seek", { detail: { time: clip.timelineStart + dur / 2 } }))
                  }}
                >
                  {vid?.thumbnailUrl && (
                    <div className="absolute inset-0 opacity-55" style={{ backgroundImage: `url(${vid.thumbnailUrl})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                  )}
                  <div className="relative z-[2] flex h-full flex-col justify-center px-3 text-[11px]">
                    <span className="truncate">{vid?.title ?? clip.sourceId}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {clip.speed !== 1 && `${clip.speed}× `}
                      {clip.mute && "muted "}
                      {clip.reverse && "rev "}
                      {clip.transition && clip.transition.type !== "none" && `→${clip.transition.type} `}
                    </span>
                  </div>
                  {(clip.speedPoints ?? []).length > 0 &&
                    clip.speedPoints!.map((sp, i) => (
                      <span
                        key={i}
                        className="absolute top-1 z-[3] h-2 w-2 rotate-45 rounded-[1px] border border-aurora-bright bg-background"
                        style={{ left: `${sp.at * 100}%` }}
                        title={`ramp ${sp.speed}×`}
                      />
                    ))}
                  {(clip.keyframes ?? []).length > 0 &&
                    clip.keyframes!.map((kf, i) => (
                      <span
                        key={i}
                        className="absolute bottom-1 z-[3] h-1.5 w-1.5 rounded-full bg-aurora-deep"
                        style={{ left: `${kf.at * 100}%` }}
                        title={`key ${Math.round(kf.at * 100)}%`}
                      />
                    ))}
                  <div className="absolute top-0 bottom-0 left-0 w-1.5 cursor-ew-resize" onPointerDown={(e) => onPointerDown(e, clip, "trim-start")} />
                  <div className="absolute top-0 bottom-0 right-0 w-1.5 cursor-ew-resize" onPointerDown={(e) => onPointerDown(e, clip, "trim-end")} />
                </div>
              )
            })}
          </div>

          {/* A1 */}
          <div className="relative h-12 cursor-pointer border-b" style={{ borderColor: "var(--border)" }} onClick={onTrackClick}>
            <span className="absolute top-0.5 left-1 z-10 text-[10px] text-muted-foreground">A1</span>
            {project.segments.map((clip) => {
              const dur = clipDuration(clip)
              const left = clip.timelineStart * pps
              const sel = selectedUid === clip.uid
              return (
                <div
                  key={clip.uid}
                  className={`absolute top-1.5 h-9 cursor-pointer overflow-hidden rounded border ${sel ? "outline outline-2 outline-aurora-bright" : ""}`}
                  style={{ left, width: Math.max(24, dur * pps), borderColor: "var(--border)", background: "var(--bg-elev-2)" }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedUid(clip.uid)
                  }}
                  onPointerDown={(e) => onPointerDown(e, clip, "move")}
                >
                  {(() => {
                    const peaks = waveforms[clip.sourceId]
                    if (peaks && peaks.length) {
                      return (
                        <svg className="h-full w-full" preserveAspectRatio="none" viewBox={`0 0 ${peaks.length} 1`}>
                          {peaks.map((p, i) => (
                            <rect key={i} x={i} y={(1 - p) / 2} width="1" height={Math.max(0.02, p)} fill="rgba(125,180,240,0.6)" />
                          ))}
                        </svg>
                      )
                    }
                    void fetchWaveform(clip.sourceId)
                    return null
                  })()}
                </div>
              )
            })}
          </div>

          {/* playhead */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-0.5 z-20"
            style={{ left: playhead * pps, background: "var(--pink-bright)", boxShadow: "0 0 8px rgba(var(--glow-rgb),0.6)" }}
          />
          {/* snap indicator */}
          {snapTime !== null && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-30 border-l border-dashed border-aurora-bright/70"
              style={{ left: snapTime * pps }}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t px-3 py-1 text-xs text-muted-foreground" style={{ borderColor: "var(--border)" }}>
        <span>
          time {fmtTime(playhead)} / {fmtTime(total)}
        </span>
        <span>space play · s split · i/o in/out · m marker · j/k/l transport · del delete</span>
      </div>
    </div>
  )
}
