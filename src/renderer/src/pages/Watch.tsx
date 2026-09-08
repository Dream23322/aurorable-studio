import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { api } from "@/lib/api"
import { fmtShort } from "@/lib/utils"
import type { VideoDetail } from "@/lib/types"
import { useUser } from "@/lib/user-store"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Heart, Link2 } from "lucide-react"

export default function Watch() {
  const { id = "" } = useParams()
  const { user } = useUser()
  const navigate = useNavigate()
  const [meta, setMeta] = useState<VideoDetail | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    api<VideoDetail>(`/api/video/${id}`)
      .then(setMeta)
      .catch((e) => setError((e as Error).message))
  }, [id])

  const toggleLike = async () => {
    if (!meta) return
    if (!user) {
      toast.error("sign in to like")
      return
    }
    if (meta.youLiked) {
      await api(`/api/video/${id}/like`, { method: "DELETE" })
      setMeta({ ...meta, youLiked: false, likes: meta.likes - 1 })
    } else {
      await api(`/api/video/${id}/like`)
      setMeta({ ...meta, youLiked: true, likes: meta.likes + 1 })
    }
  }

  return (
    <div className="h-full overflow-auto p-6">
      {error ? (
        <p className="text-destructive">not found</p>
      ) : meta ? (
        <div className="mx-auto max-w-4xl">
          <video
            controls
            preload="metadata"
            src={meta.fileUrl}
            poster={meta.thumbnailUrl ?? undefined}
            className="max-h-[65vh] w-full rounded-lg border bg-black"
            style={{ borderColor: "var(--border)" }}
          />
          <h1 className="mt-4 text-xl font-bold text-aurora-pink">{meta.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>{fmtShort(meta.durationSeconds)}</span>
            <span>{meta.views} views</span>
            <span>{meta.likes} likes</span>
            <Button size="sm" variant="ghost" onClick={toggleLike}>
              <Heart size={14} className={meta.youLiked ? "mr-1.5 fill-aurora-bright text-aurora-bright" : "mr-1.5"} />
              {meta.youLiked ? "liked" : "like"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(location.href)
                toast.success("link copied")
              }}
            >
              <Link2 size={14} className="mr-1.5" />
              copy link
            </Button>
            {user && (
              <Button size="sm" variant="ghost" onClick={() => navigate(`/studio?clip=${meta.id}`)}>
                edit in studio
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">loading…</p>
      )}
    </div>
  )
}