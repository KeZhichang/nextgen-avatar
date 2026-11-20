import { Toaster as Sonner, type ToasterProps } from "sonner"
import { AlertCircle, AlertTriangle, Check, Info, Loader2 } from "lucide-react"

const Toaster = ({
  theme = "light",
  position = "top-center",
  duration = 3200,
  ...props
}: ToasterProps) => {
  return (
    <Sonner
      theme={theme}
      position={position}
      duration={duration}
      gap={8}
      className="toaster group"
      icons={{
        success: (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <Check className="size-3.5 stroke-[2.5]" />
          </span>
        ),
        info: (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Info className="size-3.5" />
          </span>
        ),
        warning: (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-gold/25 text-amber-800">
            <AlertTriangle className="size-3.5" />
          </span>
        ),
        error: (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="size-3.5" />
          </span>
        ),
        loading: (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
          </span>
        ),
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full max-w-sm items-center gap-2.5 rounded-xl border border-border/90 bg-card/95 px-3.5 py-2.5 text-[13px] font-medium text-foreground shadow-[0_12px_32px_-6px_rgb(15,33,66,0.14)] backdrop-blur-md",
          title: "leading-snug text-foreground",
          description: "mt-0.5 text-xs font-normal text-muted-foreground",
          actionButton:
            "ml-auto rounded-md bg-brand-navy px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-navy/90",
          cancelButton:
            "rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
