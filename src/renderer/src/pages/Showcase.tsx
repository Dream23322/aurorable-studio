import { useEffect, useState } from "react"
import { Link } from "react-router"
import { api } from "@/lib/api"
import type { ShowcaseProfile } from "@/lib/types"
import { Flower2 } from "lucide-react"

export default function Showcase() {
  const [profiles, setProfiles] = useState<ShowcaseProfile[]>([])

  useEffect(() => {
    api<{ profiles: ShowcaseProfile[] }>("/api/showcase/profiles")
      .then((r) => setProfiles(r.profiles))
      .catch(() => {})
  }, [])

  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="text-xl font-bold text-aurora-bright">showcase</h1>
      <p className="mb-6 text-sm text-muted-foreground">opt-in profiles, floating in space.</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {profiles.map((p) => (
          <Link
            key={p.username}
            to={`/u/${p.username}`}
            className="grid aspect-[3/4] place-items-center gap-2 rounded-lg border transition-shadow hover:shadow-[0_0_24px_rgba(var(--glow-rgb),0.25)]"
            style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
          >
            <div
              className="grid h-14 w-14 place-items-center rounded-full border-2"
              style={{ borderColor: "var(--pink-bright)", background: "var(--bg-elev-2)" }}
            >
              {p.avatarUrl ? (
                <img src={p.avatarUrl} alt="" className="h-[52px] w-[52px] rounded-full object-cover" />
              ) : (
                <Flower2 size={20} className="text-aurora-pink" />
              )}
            </div>
            <div className="text-base text-aurora-pink">{p.displayName || p.username}</div>
            <div className="text-xs text-muted-foreground">@{p.username}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.theme}</div>
          </Link>
        ))}
        {profiles.length === 0 && <p className="text-sm text-muted-foreground">no profiles in the showcase yet.</p>}
      </div>
    </div>
  )
}