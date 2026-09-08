import { useEffect, useRef } from "react"

/** Animated background canvas — mirrors the site's profile backgrounds. */
export function BackgroundCanvas({ kind }: { kind: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext("2d")
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      cv.width = cv.clientWidth * dpr
      cv.height = cv.clientHeight * dpr
    }
    resize()
    window.addEventListener("resize", resize)
    const w = () => cv.width
    const h = () => cv.height
    let raf = 0

    if (kind === "stars" || kind === "particles") {
      const n = kind === "particles" ? 40 : 90
      const stars = Array.from({ length: n }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.6 + 0.4,
        s: Math.random() * 0.4 + 0.1
      }))
      const tick = () => {
        ctx.clearRect(0, 0, w(), h())
        for (const st of stars) {
          st.y -= st.s * 0.0006 * (kind === "particles" ? 3 : 1)
          if (st.y < 0) {
            st.y = 1
            st.x = Math.random()
          }
          const a = 0.3 + Math.sin(Date.now() / 400 + st.x * 20) * 0.3
          ctx.beginPath()
          ctx.arc(st.x * w(), st.y * h(), st.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,143,179,${a})`
          ctx.fill()
        }
        raf = requestAnimationFrame(tick)
      }
      tick()
    } else if (kind === "grid") {
      const tick = () => {
        ctx.clearRect(0, 0, w(), h())
        ctx.strokeStyle = "rgba(255,93,146,0.15)"
        const gap = 40
        for (let x = 0; x < w(); x += gap) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, h())
          ctx.stroke()
        }
        for (let y = 0; y < h(); y += gap) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(w(), y)
          ctx.stroke()
        }
        raf = requestAnimationFrame(tick)
      }
      tick()
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [kind])

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0 h-full w-full" />
}