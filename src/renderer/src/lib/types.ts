// Types mirroring the live aurorable API (clips.roraaaa.dev).

export interface LiveUser {
  id: string
  username: string | null
  email: string | null
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
}

export interface LiveVideo {
  id: string
  title: string
  width: number
  height: number
  durationSeconds: number
  sizeBytes: number
  mimeType: string
  createdAt: number
  views: number
  compressed: boolean
  fileUrl: string
  thumbnailUrl: string | null
  pageUrl: string
}

export interface QuotaInfo {
  clipCount: number
  freeClipQuota: number
  nextUploadCompressed: boolean
}

export interface VideoDetail extends LiveVideo {
  likes: number
  youLiked: boolean
}

export interface UploadResponse {
  id: string
  url: string
  thumbnailUrl: string | null
  reEncoded: boolean
  compressed: boolean
  clipsBeforeUpload: number
  freeClipQuota: number
  processingMs: number
}

export interface MeProfile {
  username: string | null
  displayName: string | null
  bio: string | null
  email: string | null
  avatarUrl: string | null
  layout: string
  theme: string
  background: string
  messages: string[]
  messagesThemed: boolean
  socials: Record<string, string>
  cs2: Record<string, string>
  privacy: Record<string, boolean>
  musicUrl: string | null
  musicVolume: number
  showcaseEnabled: boolean
  dySpread: number
  themeGlobal: boolean
}

export interface PublicProfile {
  username: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  joinedAt: number
  layout: string
  theme: string
  background: string
  messages: string[]
  messagesThemed: boolean
  dySpread: number
  featured: Array<{
    id: string
    title: string
    thumbnailUrl: string | null
    fileUrl: string
    pageUrl: string
    durationSeconds: number
    views: number
    likes: number
    width: number
    height: number
  }>
  socials?: Record<string, string>
  cs2?: Record<string, string>
  musicUrl?: string
  musicVolume?: number
}

export interface ShowcaseProfile {
  username: string
  displayName: string | null
  theme: string
  background: string
  avatarUrl: string | null
}

export interface WorkerToken {
  id: string
  name: string
  created_at: number
  online: boolean
}

export interface StudioSessionMeta {
  id: string
  title: string
  updated: string
  created: string
}

export type RenderJobStatus = "running" | "done" | "error" | "queued" | "in_progress"

export interface RenderProgress {
  status: RenderJobStatus
  percent: number
  error?: string | null
  clip?: LiveVideo | null
  isPreview?: boolean
  previewUrl?: string | null
}

export interface LocalRenderProgress {
  status: RenderJobStatus
  percent: number
  clipId: string | null
  error: string | null
  stderr: string | null
}

export const THEMES = [
  "aurora",
  "ocean",
  "mountain",
  "sunset",
  "forest",
  "midnight",
  "peach",
  "vapor",
  "sakura",
  "miku",
  "cosy"
] as const

export const BACKGROUNDS = ["none", "grid", "stars", "particles"] as const
export const LAYOUTS = ["grid", "collage", "dynamic"] as const