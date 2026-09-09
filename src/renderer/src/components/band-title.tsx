import { cn } from "@/lib/utils"

/** GameTrailers-style steel band section header. */
export function BandTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("aur-band px-2 py-1 text-[12px] font-bold tracking-wide", className)}>
      {children}
    </div>
  )
}
