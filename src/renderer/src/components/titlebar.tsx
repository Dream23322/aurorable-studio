import { Minus, Square, X } from "lucide-react"

export function Titlebar() {
  return (
    <div
      className="flex h-9 shrink-0 items-center gap-2 border-b px-3 select-none"
      style={{ borderColor: "#2a3547", background: "linear-gradient(180deg, #5d6b80 0%, #46536a 100%)" }}
    >
      <span className="aur-chrome-text text-[17px] font-bold tracking-wide">
        aurorable
      </span>
      <span className="text-[11px] font-bold tracking-[0.2em] text-white/60">STUDIO</span>
      <span className="flex-1" style={{ WebkitAppRegion: "drag" } as React.CSSProperties} />
      <div className="flex items-center gap-1">
        <button
          className="grid h-6 w-8 place-items-center rounded text-white/80 hover:bg-white/15"
          onClick={() => window.electron.ipcRenderer.send("window-control", "minimize")}
          title="minimize"
        >
          <Minus size={13} />
        </button>
        <button
          className="grid h-6 w-8 place-items-center rounded text-white/80 hover:bg-white/15"
          onClick={() => window.electron.ipcRenderer.send("window-control", "maximize")}
          title="maximize"
        >
          <Square size={11} />
        </button>
        <button
          className="grid h-6 w-8 place-items-center rounded text-white/80 hover:bg-[#c95050] hover:text-white"
          onClick={() => window.electron.ipcRenderer.send("window-control", "close")}
          title="close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}