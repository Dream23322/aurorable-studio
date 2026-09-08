export type MotionBlurMode = "tmix" | "minterpolate" | "tmix-dblur"
export type TransitionType = "crossfade" | "dipblack" | "flash" | "none"

export interface SpeedPoint {
  at: number
  speed: number
}

export interface EffectKeyframe {
  at: number
  motionBlur?: number
  motionBlurIntensity?: number
  chromaShiftH?: number
  chromaShiftV?: number
  bloomThreshold?: number
  bloomIntensity?: number
}

export interface TextOverlay {
  content: string
  x?: number
  y?: number
  fontSize?: number
  color?: string
  startOffset?: number
  duration?: number
  fadeIn?: number
  fadeOut?: number
}

export interface Transition {
  type: TransitionType
  duration: number
  color?: string
}

export interface Flicker {
  chance: number
  duration: number
  intensity: number
  frequency: number
}

/** Wire format for the site's render endpoint (ClientSegment). */
export interface Segment {
  sourceId: string
  start: number
  end: number
  speed: number
  volumeDb: number
  mute: boolean
  stretch?: boolean
  track?: number
  motionBlur?: number
  motionBlurIntensity?: number
  motionBlurMode?: MotionBlurMode
  chromaShiftH?: number
  chromaShiftV?: number
  bloomThreshold?: number
  bloomRadius?: number
  bloomIntensity?: number
  filmBlur?: number
  reverse?: boolean
  speedPoints?: SpeedPoint[]
  keyframes?: EffectKeyframe[]
  texts?: TextOverlay[]
  transition?: Transition
  flicker?: Flicker
}

export interface TimelineClip extends Segment {
  uid: string
  timelineStart: number
}

export interface StudioSettings {
  bgMusic?: { audioId: string; volume: number }
  markers?: Array<{ at: number; label: string }>
}

export interface StudioProject {
  id: string
  title: string
  segments: TimelineClip[]
  settings: StudioSettings
}

export function defaultSegment(sourceId: string, duration: number): TimelineClip {
  return {
    uid: crypto.randomUUID(),
    sourceId,
    start: 0,
    end: Math.max(0.5, duration),
    speed: 1,
    volumeDb: 0,
    mute: false,
    stretch: false,
    track: 0,
    timelineStart: 0
  }
}

export function clipDuration(c: Segment): number {
  const src = Math.max(0.1, c.end - c.start)
  if (c.speedPoints && c.speedPoints.length) {
    const pts = [...c.speedPoints].sort((a, b) => a.at - b.at)
    let out = 0
    let prev = 0
    for (const p of pts) {
      out += ((p.at - prev) * src) / Math.max(0.1, p.speed)
      prev = p.at
    }
    out += ((1 - prev) * src) / Math.max(0.1, c.speed || 1)
    return out
  }
  return src / Math.max(0.1, c.speed || 1)
}

export function toWireSegment(c: TimelineClip): Record<string, unknown> {
  const { uid, timelineStart, ...wire } = c
  void uid
  void timelineStart
  return { ...wire }
}