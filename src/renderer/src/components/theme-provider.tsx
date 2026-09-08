import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { api } from "@/lib/api"
import { THEMES } from "@/lib/types"

type AuroraTheme = (typeof THEMES)[number]

interface ThemeState {
  theme: AuroraTheme
  setTheme: (t: AuroraTheme, syncToAccount: boolean) => void
}

const ThemeContext = createContext<ThemeState>({ theme: "aurora", setTheme: () => {} })

export function useAuroraTheme() {
  return useContext(ThemeContext)
}

/** Apply the theme attr + keep the local pref. Account sync happens on change. */
export function AuroraThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AuroraTheme>(() => {
    const saved = localStorage.getItem("aurora.theme")
    return (THEMES as readonly string[]).includes(saved ?? "") ? (saved as AuroraTheme) : "aurora"
  })

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("aurora.theme", theme)
  }, [theme])

  const setTheme = (t: AuroraTheme, syncToAccount = false) => {
    setThemeState(t)
    if (syncToAccount) {
      // keep the theme synced with the user's account
      api("/api/me/profile", { body: { theme: t } }).catch(() => {})
    }
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}