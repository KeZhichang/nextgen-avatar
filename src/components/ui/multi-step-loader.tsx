import type { ReactNode } from "react"
import { CheckCircle2, Circle } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export type LoadingState = {
  text: string
  detail?: string
}

function LoaderCore({
  loadingStates,
  value = 0,
}: {
  loadingStates: LoadingState[]
  value?: number
}) {
  const clamped = Math.max(0, Math.min(value, loadingStates.length - 1))

  return (
    <div className="relative flex w-full flex-col gap-3">
      {loadingStates.map((loadingState, index) => {
        const isDone = index < clamped
        const isCurrent = index === clamped
        const distance = Math.abs(index - clamped)
        const opacity = isCurrent ? 1 : isDone ? 0.8 : Math.max(0.35, 0.7 - distance * 0.2)

        return (
          <motion.div
            key={loadingState.text}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-200",
              isCurrent
                ? "border-primary/30 bg-primary/5 shadow-2xs"
                : isDone
                  ? "border-border/70 bg-muted/30"
                  : "border-transparent bg-transparent"
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity, y: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div className="flex size-5 shrink-0 items-center justify-center">
              {isDone ? (
                <CheckCircle2
                  className="size-5 text-primary"
                  aria-hidden="true"
                />
              ) : isCurrent ? (
                <Spinner className="size-4 text-primary" />
              ) : (
                <Circle
                  className="size-4 text-muted-foreground/45"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span
                className={cn(
                  "truncate text-sm",
                  isCurrent
                    ? "font-semibold text-foreground"
                    : isDone
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {loadingState.text}
              </span>
              {loadingState.detail && isCurrent && (
                <span className="truncate text-xs text-muted-foreground">
                  {loadingState.detail}
                </span>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export function MultiStepLoader({
  loadingStates,
  loading = false,
  stepIndex = 0,
  header,
  subtitle,
  dark = false,
}: {
  loadingStates: LoadingState[]
  loading?: boolean
  stepIndex?: number
  header?: ReactNode
  subtitle?: string
  dark?: boolean
}) {
  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md",
            dark ? "bg-brand-navy/80" : "bg-background/80"
          )}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            {(header || subtitle) && (
              <div className="flex flex-col items-center gap-2 text-center">
                {header}
                {subtitle && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </div>
            )}
            <LoaderCore loadingStates={loadingStates} value={stepIndex} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
