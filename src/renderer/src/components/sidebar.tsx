import { NavLink, useNavigate } from "react-router"
import { Clapperboard, Film, Heart, Home, LogIn, LogOut, Settings, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/lib/user-store"

const item =
  "flex items-center gap-2.5 px-3 py-1 text-[12px] font-bold transition-colors text-foreground/90 hover:text-white hover:bg-white/10"

function Nav({ to, icon, label, end }: { to: string; icon: React.ReactNode; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(item, isActive && "text-white", isActive && "bg-white/15")
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}

function Band({ children }: { children: React.ReactNode }) {
  return <div className="aur-band mb-1 px-2 py-1 text-[11px] font-bold tracking-wider">{children}</div>
}

export function Sidebar() {
  const { user, logout } = useUser()
  const navigate = useNavigate()

  return (
    <aside
      className="flex w-48 shrink-0 flex-col border-r select-none"
      style={{ borderColor: "#141b28", background: "linear-gradient(180deg, #141a26 0%, #0d1119 100%)" }}
    >
      <div className="p-2">
        <Band>★ channels</Band>
        <nav className="flex flex-col">
          <Nav to="/" icon={<Home size={13} />} label="home" end />
          {user && <Nav to="/clips" icon={<Film size={13} />} label="my clips" />}
          {user && <Nav to="/studio" icon={<Clapperboard size={13} />} label="studio" />}
        </nav>
      </div>

      <div className="flex-1" />

      {user ? (
        <div className="p-2">
          <Band>★ user</Band>
          <nav className="flex flex-col">
            <Nav to={`/u/${user.username ?? ""}`} icon={<Heart size={13} />} label="@me" />
            <Nav to="/profile" icon={<User size={13} />} label="edit profile" />
            <Nav to="/account" icon={<Settings size={13} />} label="account" />
            <button
              className={cn(item, "text-muted-foreground")}
              onClick={async () => {
                await logout()
                navigate("/")
              }}
            >
              <LogOut size={13} />
              <span>logout</span>
            </button>
          </nav>
        </div>
      ) : (
        <div className="p-2">
          <Band>★ user</Band>
          <nav className="flex flex-col">
            <Nav to="/login" icon={<LogIn size={13} />} label="login" />
            <Nav to="/register" icon={<User size={13} />} label="register" />
          </nav>
        </div>
      )}
    </aside>
  )
}