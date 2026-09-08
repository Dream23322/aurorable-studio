import { Minus, Square, X, Flower2 } from "lucide-react"

export function Titlebar() {
  return (
    <div
      className="flex h-9 shrink-0 items-center gap-2 border-b px-3 select-none"
      style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
    >
      <Flower2 size={14} className="text-aurora-bright" style={{ filter: "drop-shadow(0 0 6px rgba(var(--glow-rgb),0.8))" }} />
      <span className="text-xs font-bold text-aurora-bright">
        aurorable
        <span className="ml-1 text-muted-foreground">studio</span>
      </span>
      <span className="flex-1" style={{ WebkitAppRegion: "drag" } as React.CSSProperties} />
      <div className="flex items-center gap-1">
        <button
          className="grid h-6 w-8 place-items-center rounded hover:bg-accent text-muted-foreground"
          onClick={() => window.electron.ipcRenderer.send("window-control", "minimize")}
          title="minimize"
        >
          <Minus size={13} />
        </button>
        <button
          className="grid h-6 w-8 place-items-center rounded hover:bg-accent text-muted-foreground"
          onClick={() => window.electron.ipcRenderer.send("window-control", "maximize")}
          title="maximize"
        >
          <Square size={11} />
        </button>
        <button
          className="grid h-6 w-8 place-items-center rounded hover:bg-destructive hover:text-destructive-foreground text-muted-foreground"
          onClick={() => window.electron.ipcRenderer.send("window-control", "close")}
          title="close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}