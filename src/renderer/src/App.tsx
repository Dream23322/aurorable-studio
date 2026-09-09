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

function App() {
  const { offline } = useUser()

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <Titlebar />
      {offline && (
        <div className="aur-band relative z-10 flex items-center gap-2 px-3 py-1 text-xs">
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