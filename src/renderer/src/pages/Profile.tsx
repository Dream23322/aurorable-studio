import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router"
import { api } from "@/lib/api"
import type { PublicProfile } from "@/lib/types"
import { useAuroraTheme } from "@/components/theme-provider"
import { BackgroundCanvas } from "@/components/background-canvas"

export default function Profile() {
  const { username = "" } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [error, setError] = useState("")
  const { setTheme } = useAuroraTheme()

  useEffect(() => {
    setProfile(null)
    setError("")
    api<PublicProfile>(`/api/profile/${username}`)
      .then((p) => {
        setProfile(p)
        // preview the profile's theme while viewing
        setTheme(p.theme as never, false)
      })
      .catch(() => setError("user not found"))
  }, [username])

  useEffect(() => {
    return () => setTheme("aurora", false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const socials = [
    { key: "steam", label: "Steam" },
    { key: "discord", label: "Discord" },
    { key: "youtube", label: "YouTube" },
    { key: "twitch", label: "Twitch" },
    { key: "x", label: "X" }
  ].filter((s) => profile?.socials?.[s.key])

  return (
    <div className="relative h-full overflow-auto">
      {profile && profile.background && profile.background !== "none" && <BackgroundCanvas kind={profile.background} />}
      <div className="relative z-[1] p-6">
      {error ? (
        <div className="grid h-full place-items-center">
          <p className="text-xl text-destructive">#{error} <span className="animate-pulse">▊</span></p>
        </div>
      ) : profile ? (
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
          <div className="flex items-center gap-4">
            {profile.avatarUrl && (
              <img
                src={profile.avatarUrl}
                alt=""
                className="h-20 w-20 rounded-full border-2 object-cover"
                style={{ borderColor: "var(--pink-bright)", boxShadow: "0 0 20px rgba(var(--glow-rgb),0.4)" }}
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-aurora-pink">{profile.displayName || profile.username}</h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              {profile.bio && <p className="mt-1 max-w-md text-sm">{profile.bio}</p>}
            </div>
          </div>

          {socials.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {socials.map((s) => (
                <span key={s.key} className="rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
                  {s.label}: <span className="text-aurora-pink">{profile.socials![s.key]}</span>
                </span>
              ))}
            </div>
          )}

          {profile.messages.length > 0 && (
            <div className="flex max-w-2xl flex-wrap justify-center gap-2">
              {profile.messages.map((m, i) => (
                <span
                  key={i}
                  className="rounded border px-2.5 py-1.5 text-xs"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg-elev)",
                    transform: `rotate(${(i % 2 ? 1 : -1) * 1.5}deg)`
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
          )}

          {profile.featured.length > 0 && (
            <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3">
              {profile.featured.map((f) => (
                <div
                  key={f.id}
                  className="cursor-pointer overflow-hidden rounded-lg border"
                  style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
                  onClick={() => navigate(`/v/${f.id}`)}
                >
                  <div className="relative aspect-video bg-black">
                    {f.thumbnailUrl && <img src={f.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
                    <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 text-[11px] text-aurora-pink">
                      {f.durationSeconds}s
                    </span>
                  </div>
                  <div className="truncate p-2 text-sm">{f.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground">loading…</p>
      )}
      </div>
    </div>
  )
}