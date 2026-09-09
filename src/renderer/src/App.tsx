import { Routes, Route } from "react-router"
import { Toaster } from "@/components/ui/sonner"
import { Titlebar } from "./components/titlebar"
import { Sidebar } from "./components/sidebar"
import { ErrorBoundary } from "./components/error-boundary"
import { useUser } from "./lib/user-store"
import { WifiOff } from "lucide-react"
import Home from "@/pages/Home"
import Login from "@/pages/Login"
import Register from "@/pages/Register"
import Clips from "@/pages/Clips"
import Watch from "@/pages/Watch"
import Profile from "@/pages/Profile"
import ProfileEdit from "@/pages/ProfileEdit"
import Account from "@/pages/Account"
import Studio from "@/pages/Studio"

const SPARKLES: Array<{ top: string; left: string; size: string; delay: string; color: string }> = [
  { top: "9%", left: "6%", size: "22px", delay: "0s", color: "rgba(255,140,190,0.5)" },
  { top: "16%", left: "92%", size: "16px", delay: "1.2s", color: "rgba(150,190,255,0.55)" },
  { top: "68%", left: "3%", size: "14px", delay: "2.1s", color: "rgba(255,170,210,0.45)" },
  { top: "84%", left: "88%", size: "20px", delay: "0.7s", color: "rgba(255,190,225,0.5)" },
  { top: "38%", left: "96%", size: "12px", delay: "2.8s", color: "rgba(190,215,255,0.5)" }
]

function App() {
  const { offline } = useUser()

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* angelcore background: sparkles + drifting glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        {SPARKLES.map((s, i) => (
          <span
            key={i}
            className="absolute"
            style={{
              top: s.top,
              left: s.left,
              fontSize: s.size,
              color: s.color,
              animation: `twinkle 4s ease-in-out ${s.delay} infinite`
            }}
          >
            ✦
          </span>
        ))}
        <div
          className="absolute h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ top: "-8%", right: "12%", background: "radial-gradient(circle, rgba(255,190,220,0.7), transparent 70%)", animation: "floaty 9s ease-in-out infinite" }}
        />
        <div
          className="absolute h-80 w-80 rounded-full opacity-40 blur-3xl"
          style={{ bottom: "-10%", left: "8%", background: "radial-gradient(circle, rgba(185,215,255,0.7), transparent 70%)", animation: "floaty 11s ease-in-out 1s infinite" }}
        />
      </div>

      <Titlebar />
      {offline && (
        <div className="relative z-10 flex items-center gap-2 border-b border-destructive/40 bg-destructive/10 px-3 py-1 text-xs text-destructive">
          <WifiOff size={12} />
          can't reach clips.roraaaa.dev — check your connection. the app will retry.
        </div>
      )}
      <div className="relative z-10 flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-hidden">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/clips" element={<Clips />} />
              <Route path="/v/:id" element={<Watch />} />
              <Route path="/u/:username" element={<Profile />} />
              <Route path="/profile" element={<ProfileEdit />} />
              <Route path="/account" element={<Account />} />
              <Route path="/studio" element={<Studio />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
      <Toaster richColors closeButton />
    </div>
  )
}

export default App