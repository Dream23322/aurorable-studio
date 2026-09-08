import { createContext, useContext, useRef, useState, type ReactNode } from "react"
import type { StudioProject } from "./segments"
import { clipDuration } from "./segments"

interface ProjectState {
  project: StudioProject
  projectId: string
  setProjectId: (id: string) => void
  setTitle: (t: string) => void
  setProject: (p: StudioProject) => void
  mutate: (fn: (p: StudioProject) => void) => void
  pushUndo: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  selectedUid: string | null
  setSelectedUid: (uid: string | null) => void
  playhead: number
  setPlayhead: (t: number) => void
  clearHistory: () => void
}

const Ctx = createContext<ProjectState | null>(null)

export function useProject() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useProject outside provider")
  return ctx
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProjectState] = useState<StudioProject>({ id: "", title: "untitled project", segments: [], settings: {} })
  const [projectId, setProjectId] = useState("")
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [playhead, setPlayhead] = useState(0)
  const undoStack = useRef<StudioProject[]>([])
  const redoStack = useRef<StudioProject[]>([])
  const [hist, setHist] = useState({ u: 0, r: 0 })

  const setProject = (p: StudioProject) => setProjectState(p)

  const pushUndo = () => {
    undoStack.current.push(structuredClone(project))
    if (undoStack.current.length > 60) undoStack.current.shift()
    redoStack.current.length = 0
    setHist({ u: undoStack.current.length, r: 0 })
  }

  const undo = () => {
    const prev = undoStack.current.pop()
    if (!prev) return
    redoStack.current.push(structuredClone(project))
    setProjectState(prev)
    setHist({ u: undoStack.current.length, r: redoStack.current.length })
  }

  const redo = () => {
    const next = redoStack.current.pop()
    if (!next) return
    undoStack.current.push(structuredClone(project))
    setProjectState(next)
    setHist({ u: undoStack.current.length, r: redoStack.current.length })
  }

  const mutate = (fn: (p: StudioProject) => void) => {
    setProjectState((prev) => {
      const copy = structuredClone(prev)
      fn(copy)
      return copy
    })
  }

  const clearHistory = () => {
    undoStack.current.length = 0
    redoStack.current.length = 0
    setHist({ u: 0, r: 0 })
  }

  return (
    <Ctx.Provider
      value={{
        project,
        projectId,
        setProjectId,
        setTitle: (t) => setProjectState((p) => ({ ...p, title: t })),
        setProject,
        mutate,
        pushUndo,
        undo,
        redo,
        canUndo: hist.u > 0,
        canRedo: hist.r > 0,
        selectedUid,
        setSelectedUid,
        playhead,
        setPlayhead,
        clearHistory
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function projectDuration(p: StudioProject): number {
  const ends = p.segments.map((c) => c.timelineStart + clipDuration(c))
  return ends.length ? Math.max(...ends) : 4
}
