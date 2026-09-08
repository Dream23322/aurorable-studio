import { Routes, Route } from "react-router"
import { Toaster } from "@/components/ui/sonner"
import { Titlebar } from "./components/titlebar"
import { Sidebar } from "./components/sidebar"
import Home from "@/pages/Home"
import Login from "@/pages/Login"
import Register from "@/pages/Register"
import Clips from "@/pages/Clips"
import Watch from "@/pages/Watch"
import Profile from "@/pages/Profile"
import ProfileEdit from "@/pages/ProfileEdit"
import Account from "@/pages/Account"
import Showcase from "@/pages/Showcase"
import Studio from "@/pages/Studio"

function App() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Titlebar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/clips" element={<Clips />} />
            <Route path="/v/:id" element={<Watch />} />
            <Route path="/u/:username" element={<Profile />} />
            <Route path="/profile" element={<ProfileEdit />} />
            <Route path="/account" element={<Account />} />
            <Route path="/showcase" element={<Showcase />} />
            <Route path="/studio" element={<Studio />} />
          </Routes>
        </main>
      </div>
      <Toaster richColors closeButton />
    </div>
  )
}

export default App