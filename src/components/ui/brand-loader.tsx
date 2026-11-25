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
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-7"
          >
            {/* Brand Emblem + Dual Orbital Ring */}
            <div className="relative flex size-24 items-center justify-center">
              {/* Soft ambient glow */}
              <motion.div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-1 rounded-full blur-xl",
                  dark ? "bg-primary/35" : "bg-primary/18"
                )}
                animate={{
                  scale: [0.92, 1.08, 0.92],
                  opacity: [0.45, 0.85, 0.45],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Subtle static track + rotating gradient arc */}
              <svg
                aria-hidden="true"
                viewBox="0 0 96 96"
                className="pointer-events-none absolute inset-0 size-24"
              >
                <defs>
                  <linearGradient
                    id="nga-loader-arc"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      stopColor={dark ? "#f8cfaa" : "#1f4bc4"}
                      stopOpacity="1"
                    />
                    <stop
                      offset="55%"
                      stopColor={dark ? "#60a5fa" : "#3b6df0"}
                      stopOpacity="0.85"
                    />
                    <stop
                      offset="100%"
                      stopColor={dark ? "#1f4bc4" : "#e5b77b"}
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>
                <circle
                  cx="48"
                  cy="48"
                  r="43"
                  fill="none"
                  stroke={dark ? "rgba(255,255,255,0.1)" : "rgba(16,27,45,0.08)"}
                  strokeWidth="2"
                />
                <motion.circle
                  cx="48"
                  cy="48"
                  r="43"
                  fill="none"
                  stroke="url(#nga-loader-arc)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="92 180"
                  style={{ transformOrigin: "48px 48px" }}
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.15,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </svg>

              {/* Official NextGen Avatar Mark with gentle breathing */}
              <motion.img
                src="/portal-media/nextgen-avatar-mark-small.png"
                alt=""
                width={44}
                height={40}
                decoding="async"
                className="relative z-10 h-10 w-auto object-contain select-none"
                animate={{ scale: [0.96, 1.03, 0.96] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>

            {/* Minimal hairline progress track (no text) */}
            <div
              aria-hidden="true"
              className={cn(
                "relative h-1 w-28 overflow-hidden rounded-full",
                dark ? "bg-white/12" : "bg-foreground/10"
              )}
            >
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  dark
                    ? "bg-gradient-to-r from-primary via-[#60a5fa] to-[#f8cfaa]"
                    : "bg-gradient-to-r from-primary via-primary to-brand-gold"
                )}
                initial={{ width: "12%" }}
                animate={{ width: `${Math.round(progress * 100)}%` }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
