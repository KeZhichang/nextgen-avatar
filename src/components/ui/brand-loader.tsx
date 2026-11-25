import { AnimatePresence, motion } from "motion/react"

import { cn } from "@/lib/utils"

const stepProgress = [0.28, 0.72, 1] as const

export function BrandLoader({
  loading = false,
  step = 0,
  dark = false,
  label = "Loading",
}: {
  loading?: boolean
  step?: 0 | 1 | 2
  dark?: boolean
  label?: string
}) {
  const progress = stepProgress[step] ?? 0.35

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl",
            dark ? "bg-brand-navy/92" : "bg-background/90"
          )}
        >
          <span className="sr-only">{label}</span>

          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 1.03 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-6"
          >
            {/* Horizontal Brand Lockup matching login & homepage header */}
            <div className="relative flex items-center gap-3.5">
              {/* Soft ambient glow behind emblem */}
              <motion.div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute -left-3 top-1/2 size-16 -translate-y-1/2 rounded-full blur-xl",
                  dark ? "bg-brand-gold/25" : "bg-primary/18"
                )}
                animate={{
                  scale: [0.9, 1.12, 0.9],
                  opacity: [0.45, 0.85, 0.45],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              <motion.img
                src="/portal-media/nextgen-avatar-mark-small.png"
                alt=""
                width={46}
                height={42}
                decoding="async"
                className="relative z-10 h-11 w-auto shrink-0 object-contain select-none"
                animate={{ scale: [0.97, 1.03, 0.97] }}
                transition={{
                  duration: 2.1,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              <div className="relative z-10 flex flex-col text-left leading-none">
                <span
                  className={cn(
                    "font-serif text-[26px] font-bold tracking-tight",
                    dark ? "text-[#ffe8d1]" : "text-foreground"
                  )}
                >
                  {dark ? "NextGen Studio" : "NextGen Avatar"}
                </span>
                <span
                  className={cn(
                    "mt-1 text-xs font-medium tracking-normal",
                    dark ? "text-white/65" : "text-muted-foreground"
                  )}
                >
                  by 2301 Pictures
                </span>
              </div>
            </div>

            {/* Minimal hairline progress track aligned with brand lockup */}
            <div
              aria-hidden="true"
              className={cn(
                "relative h-[3px] w-52 overflow-hidden rounded-full",
                dark ? "bg-white/12" : "bg-foreground/10"
              )}
            >
              <motion.div
                className={cn(
                  "relative h-full overflow-hidden rounded-full",
                  dark
                    ? "bg-gradient-to-r from-primary via-[#60a5fa] to-[#f8cfaa]"
                    : "bg-gradient-to-r from-primary via-primary to-brand-gold"
                )}
                initial={{ width: "14%" }}
                animate={{ width: `${Math.round(progress * 100)}%` }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.span
                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "300%" }}
                  transition={{
                    duration: 1.25,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
