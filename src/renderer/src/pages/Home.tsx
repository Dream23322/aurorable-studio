import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router"
import { api } from "@/lib/api"
import { fmtShort } from "@/lib/utils"
import type { LiveVideo, UploadResponse } from "@/lib/types"
import { useUser } from "@/lib/user-store"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { UploadCloud } from "lucide-react"
import { BandTitle } from "@/components/band-title"

interface Item {
  id: string
  name: string
  state: "queued" | "uploading" | "processing" | "done" | "error"
  progress: number
  videoId?: string
  error?: string
}

export default function Home() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [items, setItems] = useState<Item[]>([])
  const [clips, setClips] = useState<LiveVideo[]>([])
  const [quota, setQuota] = useState({ clipCount: 0, freeClipQuota: 10 })
  const [dragging, setDragging] = useState(false)
  const itemsRef = useRef<Item[]>([])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const loadClips = useCallback(async () => {
    if (!user) return
    try {
      const [list, q] = await Promise.all([
        api<LiveVideo[]>("/api/me/videos"),
        api<{ clipCount: number; freeClipQuota: number }>("/api/me/quota")
      ])
      setClips(list)
      setQuota(q)
    } catch {
      /* ignore */
    }
  }, [user])

  useEffect(() => {
    void loadClips()
  }, [loadClips])

  const uploadItem = (item: Item, file: File) => {
    const form = new FormData()
    form.append("video", file)
    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/upload")
    const csrf = (document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/) || [])[1] || ""
    xhr.setRequestHeader("X-CSRF-Token", decodeURIComponent(csrf))
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 85)
        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, progress: pct } : it)))
      }
    }
    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const res = JSON.parse(xhr.responseText) as UploadResponse
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, state: "processing", progress: 95, videoId: res.id } : it
          )
        )
        await new Promise((r) => setTimeout(r, 600))
        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, state: "done", progress: 100 } : it)))
        toast.success("uploaded")
        void loadClips()
      } else {
        const j = JSON.parse(xhr.responseText || '{"error":"upload failed"}')
        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, state: "error", error: j.error } : it)))
      }
    }
    xhr.onerror = () =>
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, state: "error", error: "network error" } : it)))
    xhr.send(form)
  }

  const handleFiles = (files: FileList | File[]) => {
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("video/")) continue
      const item: Item = { id: crypto.randomUUID(), name: f.name, state: "uploading", progress: 0 }
      setItems((prev) => [...prev, item])
      uploadItem(item, f)
    }
  }

  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="mb-1 text-3xl font-bold">
        <span className="aur-chrome-text">game clips, but professional</span>
        <span className="animate-pulse text-aurora-bright">▊</span>
      </h1>
      <p className="mb-6 max-w-xl text-sm text-muted-foreground">
        your clips live on the site — this app is how you cut, grade, glow and render them, on your own PC if you want.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => {
          if (!user) {
            navigate("/login")
            return
          }
          const input = document.createElement("input")
          input.type = "file"
          input.accept = "video/*"
          input.multiple = true
          input.onchange = () => input.files && handleFiles(input.files)
          input.click()
        }}
        className="mb-6 grid cursor-pointer place-items-center gap-2 rounded-xl border-2 border-dashed p-12 transition-colors"
        style={{ borderColor: dragging ? "var(--pink-bright)" : "var(--border)", background: "var(--bg-elev)" }}
      >
        <UploadCloud size={36} className="text-aurora-bright" />
        <p className="text-sm text-aurora-pink">drop clips here</p>
        <p className="text-xs text-muted-foreground">mp4 / webm / mov{!user && " · sign in to upload"}</p>
      </div>

      {items.length > 0 && (
        <div className="mb-6 flex max-w-xl flex-col gap-2">
          {items.map((it) => (
            <div key={it.id} className="rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm">{it.name}</span>
                <span className="text-xs text-muted-foreground">{it.state}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded bg-background">
                <div className="h-full transition-all" style={{ width: `${it.progress}%`, background: "linear-gradient(90deg, var(--pink-deep), var(--pink-bright))" }} />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs">
                {it.state === "done" && it.videoId && (
                  <>
                    <span className="text-aurora-good">uploaded</span>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/studio?clip=${it.videoId}`)}>
                      edit in studio →
                    </Button>
                  </>
                )}
                {it.state === "error" && <span className="text-destructive">{it.error}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {user && (
        <>
          <BandTitle className="mb-3"># recent clips</BandTitle>
          <div className="mb-4 max-w-md">
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-muted-foreground">storage quota</span>
              <span className="text-aurora-pink">
                {quota.clipCount}/{quota.freeClipQuota} free clips
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-background">
              <div
                className="h-full"
                style={{
                  width: `${Math.min(100, (quota.clipCount / quota.freeClipQuota) * 100)}%`,
                  background: "linear-gradient(90deg, var(--pink-deep), var(--pink-bright))"
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {clips.slice(0, 8).map((c) => (
              <div key={c.id} className="overflow-hidden rounded-lg border transition-colors hover:border-aurora-bright" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
                <Link to={`/v/${c.id}`} className="relative block aspect-video bg-black">
                  {c.thumbnailUrl && <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
                  <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 text-[11px] text-aurora-pink">
                    {fmtShort(c.durationSeconds)}
                  </span>
                </Link>
                <div className="p-2.5">
                  <div className="truncate text-sm">{c.title}</div>
                  <div className="mt-1 flex gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/v/${c.id}`)}>
                      watch
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/studio?clip=${c.id}`)}>
                      studio
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {clips.length === 0 && <p className="text-sm text-muted-foreground">no clips yet — drop one above.</p>}
          </div>
        </>
      )}
    </div>
  )
}