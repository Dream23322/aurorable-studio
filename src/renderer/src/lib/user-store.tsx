import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { api } from "@/lib/api"
import type { LiveUser, MeProfile } from "@/lib/types"
import { THEMES } from "@/lib/types"
import { useAuroraTheme } from "@/components/theme-provider"

interface UserState {
  user: LiveUser | null
  profile: MeProfile | null
  ready: boolean
  offline: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const UserContext = createContext<UserState>({
  user: null,
  profile: null,
  ready: false,
  offline: false,
  refresh: async () => {},
  logout: async () => {}
})

export function useUser() {
  return useContext(UserContext)
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LiveUser | null>(null)
  const [profile, setProfile] = useState<MeProfile | null>(null)
  const [ready, setReady] = useState(false)
  const [offline, setOffline] = useState(false)
  const { setTheme } = useAuroraTheme()

  const refresh = async () => {
    try {
      const res = await api<{ user: LiveUser | null }>("/api/auth/me")
      setOffline(false)
      if (res.user) {
        setUser(res.user)
        try {
          const p = await api<MeProfile>("/api/me/profile")
          setProfile(p)
          // theme sync: the account theme wins in the app
          if ((THEMES as readonly string[]).includes(p.theme)) setTheme(p.theme as never, false)
        } catch {
          /* profile fetch is best-effort */
        }
      } else {
        setUser(null)
        setProfile(null)
      }
    } catch (err) {
      // network failure vs auth failure
      if ((err as Error).message.startsWith("HTTP") && (err as Error & { status?: number }).status === 401) {
        setOffline(false)
      } else {
        setOffline(true)
      }
      setUser(null)
      setProfile(null)
    } finally {
      setReady(true)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
    setUser(null)
    setProfile(null)
  }

  return (
    <UserContext.Provider value={{ user, profile, ready, offline, refresh, logout }}>
      {children}
    </UserContext.Provider>
  )
}