import "./index.css"
import { AuroraThemeProvider } from "./components/theme-provider"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { HashRouter as Router } from "react-router"
import { UserProvider } from "./lib/user-store"
import App from "./App"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuroraThemeProvider>
      <UserProvider>
        <Router>
          <App />
        </Router>
      </UserProvider>
    </AuroraThemeProvider>
  </StrictMode>
)