import { useEffect, useState } from "react"
import { useProject } from "./store"
import { clipDuration, type EffectKeyframe, type TimelineClip } from "./segments"
import { fmtTime, clamp } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

function Slider({
  label,
  min,
  max,
  step,
  value,
  onchange
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onchange: (v: number) => void
}) {
  return (
    <div className="grid gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-aurora-pink">{Number(value).toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onchange(Number(e.target.value))} className="w-full" />
    </div>
  )
}

export function Inspector() {
  const { project, mutate, pushUndo, selectedUid, playhead } = useProject()
  const clip = project.segments.find((c) => c.uid === selectedUid) ?? null
  const [copied, setCopied] = useState<Partial<TimelineClip> | null>(null)

  const setClip = (fn: (c: TimelineClip) => void, undo = false) => {
    if (!clip) return
    if (undo) pushUndo()
    mutate((p) => {
      const c = p.segments.find((x) => x.uid === clip.uid)
      if (c) fn(c)
    })
  }

  const copyClip = () => {
    if (!clip) return
    const { uid, timelineStart, sourceId, ...settings } = clip
    void uid
    void timelineStart
    void sourceId
    setCopied(settings)
  }

  const pasteClip = () => {
    if (!clip || !copied) return
    pushUndo()
    mutate((p) => {
      const c = p.segments.find((x) => x.uid === clip.uid)
      if (c) Object.assign(c, structuredClone(copied))
    })
    toast.success("clip settings pasted")
  }

  const applyPreset = (name: string) => {
    if (!clip) return
    pushUndo()
    mutate((p) => {
      const c = p.segments.find((x) => x.uid === clip.uid)
      if (!c) return
      switch (name) {
        case "bloom-subtle":
          c.bloomThreshold = 0.85
          c.bloomRadius = 6
          c.bloomIntensity = 0.25
          break
        case "bloom-neon":
          c.bloomThreshold = 0.55
          c.bloomRadius = 14
          c.bloomIntensity = 0.65
          break
        case "bloom-warm":
          c.bloomThreshold = 0.7
          c.bloomRadius = 10
          c.bloomIntensity = 0.4
          break
        case "mb-90":
          c.motionBlur = 3
          c.motionBlurIntensity = 0.7
          c.motionBlurMode = "tmix"
          break
        case "mb-180":
          c.motionBlur = 6
          c.motionBlurIntensity = 0.5
          c.motionBlurMode = "tmix"
          break
        case "mb-smooth":
          c.motionBlur = 8
          c.motionBlurIntensity = 0.4
          c.motionBlurMode = "tmix-dblur"
          break
      }
    })
  }

  const addKeyframe = () => {
    if (!clip) return
    pushUndo()
    const frac = (playhead - clip.timelineStart) / Math.max(0.1, clipDuration(clip))
    const kf: EffectKeyframe = {
      at: clamp(frac, 0, 1),
      motionBlur: clip.motionBlur,
      motionBlurIntensity: clip.motionBlurIntensity,
      chromaShiftH: clip.chromaShiftH,
      chromaShiftV: clip.chromaShiftV,
      bloomThreshold: clip.bloomThreshold,
      bloomIntensity: clip.bloomIntensity
    }
    setClip((c) => {
      c.keyframes ??= []
      c.keyframes.push(kf)
      c.keyframes.sort((a, b) => a.at - b.at)
    })
  }

  const addText = () => {
    if (!clip) return
    pushUndo()
    const startOffset = Math.max(0, playhead - clip.timelineStart)
    setClip((c) => {
      c.texts ??= []
      c.texts.push({
        content: "text",
        x: 0.5,
        y: 0.5,
        fontSize: 48,
        color: "#ffffff",
        startOffset,
        duration: Math.min(2, clipDuration(c) - startOffset)
      })
    })
  }

  const n = (v: unknown, fallback: number) => (typeof v === "number" ? v : fallback)

  // keyboard copy/paste (ctrl+c / ctrl+v dispatched by Studio)
  useEffect(() => {
    const onCopy = () => copyClip()
    const onPaste = () => pasteClip()
    window.addEventListener("aurorable:copy-clip", onCopy)
    window.addEventListener("aurorable:paste-clip", onPaste)
    return () => {
      window.removeEventListener("aurorable:copy-clip", onCopy)
      window.removeEventListener("aurorable:paste-clip", onPaste)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip?.uid, copied])

  if (!clip) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-4 text-center text-xs text-muted-foreground">
        select a clip on the timeline
        <br />
        or add one from the clips bin.
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto p-3" style={{ background: "var(--bg-elev)" }}>
      <div className="mb-2 text-xs text-muted-foreground">
        clip · {fmtTime(clipDuration(clip))}
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent("aurorable:mark", { detail: { edge: "in" } }))}>
          mark in (i)
        </Button>
        <Button size="sm" variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent("aurorable:mark", { detail: { edge: "out" } }))}>
          mark out (o)
        </Button>
        <Button size="sm" variant="ghost" onClick={copyClip} title="copy clip settings (ctrl+c)">
          copy
        </Button>
        <Button size="sm" variant="ghost" disabled={!copied} onClick={pasteClip} title="paste clip settings (ctrl+v)">
          paste
        </Button>
      </div>

      <div className="mb-2 flex gap-2 text-xs">
        <span className="text-muted-foreground">in</span>
        <input
          type="number"
          step="0.01"
          value={Number(clip.start.toFixed(2))}
          onChange={(e) => setClip((c) => { c.start = clamp(Number(e.target.value), 0, c.end - 0.1) })}
          className="w-20 rounded border bg-background px-1.5 py-0.5"
        />
        <span className="text-muted-foreground">out</span>
        <input
          type="number"
          step="0.01"
          value={Number(clip.end.toFixed(2))}
          onChange={(e) => setClip((c) => { c.end = clamp(Number(e.target.value), c.start + 0.1, 99999) })}
          className="w-20 rounded border bg-background px-1.5 py-0.5"
        />
      </div>

      <div className="mb-3 flex flex-col gap-2">
        <Slider label="speed" min={0.5} max={1.5} step={0.05} value={clip.speed} onchange={(v) => setClip((c) => { c.speed = v })} />

        {(clip.speedPoints ?? []).length > 0 && (
          <div className="text-xs">
            {clip.speedPoints!.map((sp, i) => (
              <div key={i} className="mb-1 flex items-center gap-2">
                <span className="w-14 text-muted-foreground">at {Math.round(sp.at * 100)}%</span>
                <input
                  type="number"
                  step="0.05"
                  min={0.1}
                  max={3}
                  value={sp.speed}
                  onChange={(e) => setClip((c) => { if (c.speedPoints) c.speedPoints[i].speed = Number(e.target.value) })}
                  className="w-16 rounded border bg-background px-1.5 py-0.5"
                />
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { pushUndo(); setClip((c) => { c.speedPoints?.splice(i, 1) }) }}>
                  ×
                </Button>
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={() => { pushUndo(); setClip((c) => { c.speedPoints ??= []; c.speedPoints.push({ at: 0.5, speed: c.speed || 1 }); c.speedPoints.sort((a, b) => a.at - b.at) }) }}>
              + ramp point
            </Button>
          </div>
        )}

        <Slider label="volume" min={-30} max={10} step={1} value={clip.volumeDb} onchange={(v) => setClip((c) => { c.volumeDb = v })} />
        <div className="flex gap-4 text-xs">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={clip.mute} onChange={(e) => setClip((c) => { c.mute = e.target.checked }, true)} />
            mute
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={clip.reverse} onChange={(e) => setClip((c) => { c.reverse = e.target.checked }, true)} />
            reverse
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={clip.stretch} onChange={(e) => setClip((c) => { c.stretch = e.target.checked }, true)} />
            stretch
          </label>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5 border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <Button size="sm" variant="ghost" onClick={() => applyPreset("bloom-subtle")}>
          bloom: subtle
        </Button>
        <Button size="sm" variant="ghost" onClick={() => applyPreset("bloom-neon")}>
          bloom: neon
        </Button>
        <Button size="sm" variant="ghost" onClick={() => applyPreset("bloom-warm")}>
          bloom: warm
        </Button>
        <Button size="sm" variant="ghost" onClick={() => applyPreset("mb-90")}>
          blur: 90°
        </Button>
        <Button size="sm" variant="ghost" onClick={() => applyPreset("mb-180")}>
          blur: 180°
        </Button>
        <Button size="sm" variant="ghost" onClick={() => applyPreset("mb-smooth")}>
          blur: smooth
        </Button>
      </div>

      <div className="mb-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <p className="mb-2 text-xs text-aurora-pink">motion blur</p>
        <Slider label="frames" min={0} max={16} step={1} value={n(clip.motionBlur, 0)} onchange={(v) => setClip((c) => { c.motionBlur = v })} />
        <Slider label="intensity" min={0.1} max={1} step={0.05} value={n(clip.motionBlurIntensity, 0.5)} onchange={(v) => setClip((c) => { c.motionBlurIntensity = v })} />
        <div className="mb-2 grid gap-1">
          <Label className="text-xs">mode</Label>
          <select
            value={clip.motionBlurMode ?? "tmix"}
            onChange={(e) => setClip((c) => { c.motionBlurMode = e.target.value as TimelineClip["motionBlurMode"] })}
            className="rounded border bg-background px-1.5 py-1 text-xs"
          >
            <option value="tmix">tmix</option>
            <option value="tmix-dblur">tmix-dblur</option>
            <option value="minterpolate">minterpolate (slow)</option>
          </select>
        </div>
      </div>

      <div className="mb-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <p className="mb-2 text-xs text-aurora-pink">chromatic aberration</p>
        <Slider label="h" min={-10} max={10} step={0.5} value={n(clip.chromaShiftH, 0)} onchange={(v) => setClip((c) => { c.chromaShiftH = v })} />
        <Slider label="v" min={-10} max={10} step={0.5} value={n(clip.chromaShiftV, 0)} onchange={(v) => setClip((c) => { c.chromaShiftV = v })} />
      </div>

      <div className="mb-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <p className="mb-2 text-xs text-aurora-pink">bloom</p>
        <Slider label="threshold" min={0} max={1} step={0.01} value={n(clip.bloomThreshold, 0.78)} onchange={(v) => setClip((c) => { c.bloomThreshold = v })} />
        <Slider label="radius" min={0.5} max={50} step={0.5} value={n(clip.bloomRadius, 8)} onchange={(v) => setClip((c) => { c.bloomRadius = v })} />
        <Slider label="intensity" min={0} max={1} step={0.01} value={n(clip.bloomIntensity, 0)} onchange={(v) => setClip((c) => { c.bloomIntensity = v })} />
      </div>

      <div className="mb-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <p className="mb-2 text-xs text-aurora-pink">film blur</p>
        <Slider label="sigma" min={0} max={10} step={0.1} value={n(clip.filmBlur, 0)} onchange={(v) => setClip((c) => { c.filmBlur = v })} />
      </div>

      <div className="mb-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <p className="mb-2 text-xs text-aurora-pink">flicker (crt)</p>
        {clip.flicker ? (
          <>
            <Slider label="chance" min={0} max={1} step={0.01} value={clip.flicker.chance} onchange={(v) => setClip((c) => { if (c.flicker) c.flicker.chance = v })} />
            <Slider label="intensity" min={0.05} max={1} step={0.05} value={clip.flicker.intensity} onchange={(v) => setClip((c) => { if (c.flicker) c.flicker.intensity = v })} />
            <Slider label="frequency" min={1} max={60} step={1} value={clip.flicker.frequency} onchange={(v) => setClip((c) => { if (c.flicker) c.flicker.frequency = v })} />
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => { pushUndo(); setClip((c) => { c.flicker = { chance: 0.15, duration: 0.15, intensity: 0.3, frequency: 8 } }) }}>
            + flicker
          </Button>
        )}
      </div>

      <div className="mb-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <p className="mb-2 text-xs text-aurora-pink">keyframes</p>
        {(clip.keyframes ?? []).map((kf, i) => (
          <div key={i} className="mb-1 flex items-center justify-between text-xs">
            <span className="text-aurora-pink">at {Math.round(kf.at * 100)}%</span>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { pushUndo(); setClip((c) => { c.keyframes?.splice(i, 1) }) }}>
              ×
            </Button>
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={addKeyframe}>
          + key at playhead
        </Button>
      </div>

      <div className="mb-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <p className="mb-2 text-xs text-aurora-pink">text overlays</p>
        {(clip.texts ?? []).map((t, i) => (
          <div key={i} className="mb-2 rounded border p-2" style={{ borderColor: "var(--border)" }}>
            <input
              defaultValue={t.content}
              onBlur={(e) => setClip((c) => { if (c.texts) c.texts[i].content = e.target.value })}
              className="mb-1.5 w-full rounded border bg-background px-1.5 py-0.5 text-xs"
            />
            <div className="flex items-center gap-1.5">
              <input type="number" step="0.05" min={0} max={1} defaultValue={t.x ?? 0.5} title="x" className="w-16 rounded border bg-background px-1 py-0.5 text-xs" onBlur={(e) => setClip((c) => { if (c.texts) c.texts[i].x = Number(e.target.value) })} />
              <input type="number" step="0.05" min={0} max={1} defaultValue={t.y ?? 0.5} title="y" className="w-16 rounded border bg-background px-1 py-0.5 text-xs" onBlur={(e) => setClip((c) => { if (c.texts) c.texts[i].y = Number(e.target.value) })} />
              <input type="number" step="4" min={8} max={300} defaultValue={t.fontSize ?? 48} title="size" className="w-16 rounded border bg-background px-1 py-0.5 text-xs" onBlur={(e) => setClip((c) => { if (c.texts) c.texts[i].fontSize = Number(e.target.value) })} />
              <input type="color" defaultValue={t.color ?? "#ffffff"} className="h-6 w-8 rounded border bg-background p-0" onChange={(e) => setClip((c) => { if (c.texts) c.texts[i].color = e.target.value })} />
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { pushUndo(); setClip((c) => { c.texts?.splice(i, 1) }) }}>
                ×
              </Button>
            </div>
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={addText}>
          + text
        </Button>
      </div>

      <div className="mb-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <p className="mb-2 text-xs text-aurora-pink">transition in</p>
        <div className="mb-2 grid gap-1">
          <Label className="text-xs">type</Label>
          <select
            value={clip.transition?.type ?? "none"}
            onChange={(e) => {
              pushUndo()
              setClip((c) => {
                const t = e.target.value as TimelineClip["transition"] extends undefined ? never : "crossfade" | "dipblack" | "flash" | "none"
                if (t === "none") c.transition = undefined
                else c.transition = { type: t as never, duration: c.transition?.duration ?? 0.5, color: c.transition?.color }
              })
            }}
            className="rounded border bg-background px-1.5 py-1 text-xs"
          >
            <option value="none">none</option>
            <option value="crossfade">crossfade</option>
            <option value="dipblack">dip to black</option>
            <option value="flash">flash</option>
          </select>
        </div>
        {clip.transition && clip.transition.type !== "none" && (
          <Slider label="duration" min={0.1} max={1} step={0.05} value={clip.transition.duration} onchange={(v) => setClip((c) => { if (c.transition) c.transition.duration = v })} />
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        clip time {fmtTime(Math.max(0, playhead - clip.timelineStart))} / {fmtTime(clipDuration(clip))}
      </p>
    </div>
  )
}
