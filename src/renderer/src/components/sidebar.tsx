import { NavLink, useNavigate } from "react-router"
import { Clapperboard, Film, Flower2, Home, LogIn, LogOut, Settings, Sparkles, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/lib/user-store"

const item =
  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"

function Nav({ to, icon, label, end }: { to: string; icon: React.ReactNode; label: string; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => cn(item, isActive && "bg-sidebar-accent text-sidebar-accent-foreground")}>
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}

export function Sidebar() {
  const { user, logout } = useUser()
  const navigate = useNavigate()

  return (
    <aside
      className="flex w-48 shrink-0 flex-col border-r p-3 select-none"
      style={{ borderColor: "var(--border)", background: "var(--sidebar)" }}
    >
      <nav className="flex flex-col gap-1">
        <Nav to="/" icon={<Home size={14} />} label="home" end />
        {user && <Nav to="/clips" icon={<Film size={14} />} label="clips" />}
        {user && <Nav to="/studio" icon={<Clapperboard size={14} />} label="studio" />}
        <Nav to="/showcase" icon={<Sparkles size={14} />} label="showcase" />
      </nav>

      <div className="flex-1" />

      {user ? (
        <nav className="flex flex-col gap-1">
          <Nav to={`/u/${user.username ?? ""}`} icon={<Flower2 size={14} />} label="@me" />
          <Nav to="/profile" icon={<User size={14} />} label="edit profile" />
          <Nav to="/account" icon={<Settings size={14} />} label="account" />
          <button
            className={cn(item, "text-muted-foreground")}
            onClick={async () => {
              await logout()
              navigate("/")
            }}
          >
            <LogOut size={14} />
            <span>logout</span>
          </button>
        </nav>
      ) : (
        <nav className="flex flex-col gap-1">
          <Nav to="/login" icon={<LogIn size={14} />} label="login" />
          <Nav to="/register" icon={<User size={14} />} label="register" />
        </nav>
      )}
    </aside>
  )
}