import { Minus, Square, X } from "lucide-react"

export function Titlebar() {
  return (
    <div
      className="flex h-9 shrink-0 items-center gap-2 border-b px-3 select-none"
      style={{ borderColor: "var(--border)", background: "rgba(16,12,24,0.85)" }}
    >
      <span className="aur-script text-lg font-bold text-aurora-bright" style={{ textShadow: "0 0 12px rgba(var(--glow-rgb),0.5)" }}>
        aurorable
      </span>
      <span className="text-xs text-muted-foreground">studio</span>
      <span className="text-[10px] text-aurora-soft">✦</span>
      <span className="flex-1" style={{ WebkitAppRegion: "drag" } as React.CSSProperties} />
      <div className="flex items-center gap-1">
        <button
          className="grid h-6 w-8 place-items-center rounded-full text-muted-foreground hover:bg-accent"
          onClick={() => window.electron.ipcRenderer.send("window-control", "minimize")}
          title="minimize"
        >
          <Minus size={13} />
        </button>
        <button
          className="grid h-6 w-8 place-items-center rounded-full text-muted-foreground hover:bg-accent"
          onClick={() => window.electron.ipcRenderer.send("window-control", "maximize")}
          title="maximize"
        >
          <Square size={11} />
        </button>
        <button
          className="grid h-6 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => window.electron.ipcRenderer.send("window-control", "close")}
          title="close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}