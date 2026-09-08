import { resolve } from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, externalizeDepsPlugin } from "electron-vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  main: {
    resolve: {
      alias: [{ find: "@", replacement: resolve(__dirname, "src") }]
    },
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: [{ find: "@", replacement: resolve("src/renderer/src") }]
    },
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8868",
          changeOrigin: true
        }
      }
    }
  }
})