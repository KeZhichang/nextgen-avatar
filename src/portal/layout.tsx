import { type ReactNode, useId } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { ChevronLeft } from "lucide-react"
import { LayoutGroup, motion, useReducedMotion } from "motion/react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button, type buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type VariantProps } from "class-variance-authority"
import { isLocale, localeLabels } from "./i18n"
import { usePortal, type Status } from "./demo"
import {
  AppMorphIcon,
  orderStatusMorphIcons,
  statusMorphSpring,
} from "./morph-icons"

export function BrandMark({
  studio = false,
  dark = false,
}: {
  studio?: boolean
  dark?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-2.5 tracking-tight">
      <img
        src="/portal-media/nextgen-avatar-mark-small.png"
        alt=""
        width={30}
        height={27}
        decoding="async"
        className="h-7 w-auto shrink-0 object-contain"
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-serif text-[15px] font-bold tracking-tight",
            dark ? "text-[#ffe8d1]" : "text-foreground"
          )}
        >
          {studio ? "NextGen Studio" : "NextGen Avatar"}
        </span>
        <span
          className={cn(
            "mt-0.5 text-[10px] font-medium tracking-normal",
            dark ? "text-white/65" : "text-muted-foreground"
          )}
        >
          by 2301 Pictures
        </span>
      </span>
    </span>
  )
}

export function LanguageSwitch({ dark = false }: { dark?: boolean }) {
  const { locale, translate } = usePortal()
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const layoutId = `lang-switch-${useId()}`

  const options = [
    { value: "en" as const, label: localeLabels.en, lang: "en", minWidth: "min-w-12" },
    { value: "zh" as const, label: "中文", ariaLabel: localeLabels.zh, lang: "zh-CN", minWidth: "min-w-11" },
  ]

  return (
    <LayoutGroup id={layoutId}>
      <div
        role="radiogroup"
        aria-label={translate("language")}
        className={cn(
          "inline-flex shrink-0 items-center gap-0.5 rounded-lg border p-0.5",
          dark
            ? "border-white/15 bg-white/10 text-brand-navy-foreground"
            : "border-border bg-muted text-foreground"
        )}
      >
        {options.map((option) => {
          const selected = locale === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.ariaLabel}
              lang={option.lang}
              onClick={() => {
                if (isLocale(option.value) && option.value !== locale) {
                  void navigate(
                    {
                      pathname: `/${option.value}${pathname.slice(locale.length + 1)}`,
                      search,
                      hash,
                    },
                    { replace: true }
                  )
                }
              }}
              className={cn(
                "relative inline-flex h-7 items-center justify-center rounded-md px-2.5 text-xs font-medium outline-none transition-colors duration-200",
                option.minWidth,
                selected
                  ? dark
                    ? "text-primary-foreground"
                    : "text-primary"
                  : dark
                    ? "text-white/75 hover:text-white"
                    : "text-muted-foreground hover:text-foreground"
              )}
            >
              {selected && (
                <motion.span
                  layoutId={layoutId}
                  aria-hidden="true"
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : {
                          type: "spring",
                          stiffness: 420,
                          damping: 34,
                          mass: 0.88,
                        }
                  }
                  className={cn(
                    "pointer-events-none absolute inset-0 z-0 rounded-md shadow-xs",
                    dark ? "bg-primary" : "bg-card"
                  )}
                />
              )}
              <span className="relative z-10">{option.label}</span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}

export function TopBar({
  title,
  children,
  dark = false,
  studio = false,
}: {
  title?: ReactNode
  children?: ReactNode
  dark?: boolean
  studio?: boolean
}) {
  const { href } = usePortal()
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2 backdrop-blur-md sm:px-6",
        dark
          ? "border-white/10 bg-brand-navy/95 text-brand-navy-foreground"
          : "border-border bg-card/95 text-foreground"
      )}
    >
      <Breadcrumb>
        <BreadcrumbList className={dark ? "text-white/65" : undefined}>
          <BreadcrumbItem>
            <BreadcrumbLink
              asChild
              className={
                dark
                  ? "text-white hover:text-white/85"
                  : "text-foreground hover:text-primary"
              }
            >
              <Link to={studio ? href("admin-orders") : href()}>
                <BrandMark studio={studio} dark={dark} />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {title && (
            <>
              <BreadcrumbSeparator
                className={dark ? "text-white/40" : undefined}
              />
              <BreadcrumbItem>
                <BreadcrumbPage
                  className={cn(
                    "font-medium",
                    dark ? "text-white/90" : "text-muted-foreground"
                  )}
                >
                  {title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ms-auto flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
        {children}
        <LanguageSwitch dark={dark} />
      </div>
    </header>
  )
}

export function ActionLink({
  to,
  children,
  primary = false,
  variant,
  size = "default",
  className,
}: {
  to: string
  children: ReactNode
  primary?: boolean
  variant?: VariantProps<typeof buttonVariants>["variant"]
  size?: VariantProps<typeof buttonVariants>["size"]
  className?: string
}) {
  return (
    <Button
      asChild
      variant={variant ?? (primary ? "default" : "outline")}
      size={size}
      className={cn("min-w-0", className)}
    >
      <Link to={to}>{children}</Link>
    </Button>
  )
}

export function BackLink({
  to,
  children,
  dark = false,
}: {
  to: string
  children: ReactNode
  dark?: boolean
}) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={cn(dark && "text-white/85 hover:bg-white/10 hover:text-white")}
    >
      <Link to={to}>
        <ChevronLeft data-icon="inline-start" aria-hidden="true" />
        {children}
      </Link>
    </Button>
  )
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("p-5 shadow-xs sm:p-6", className)}>{children}</Card>
  )
}

export function PageWidth({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8",
        className
      )}
    >
      {children}
    </main>
  )
}

export function FadeTransition({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function DataPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  compact = false,
  className,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (nextPage: number) => void
  onPageSizeChange?: (nextSize: number) => void
  compact?: boolean
  className?: string
}) {
  const { t } = usePortal()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, page), totalPages)
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1
  const end = Math.min(total, current * pageSize)

  const pageNumbers: (number | "ellipsis")[] = []
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i)
  } else {
    pageNumbers.push(1)
    if (current > 3) pageNumbers.push("ellipsis")
    const from = Math.max(2, current - 1)
    const to = Math.min(totalPages - 1, current + 1)
    for (let i = from; i <= to; i++) pageNumbers.push(i)
    if (current < totalPages - 2) pageNumbers.push("ellipsis")
    pageNumbers.push(totalPages)
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground",
        compact && "px-3 py-2",
        className
      )}
    >
      <div className="flex items-center gap-3 tabular-nums">
        <span>
          {compact
            ? t(
                `${current} / ${totalPages} 页`,
                `Page ${current}/${totalPages}`
              )
            : t(
                `显示第 ${start}–${end} 条，共 ${total} 条`,
                `Showing ${start}–${end} of ${total}`
              )}
        </span>
        {!compact && onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span>{t("每页", "Rows")}</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger size="sm" className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {[5, 10, 20, 50].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#prev"
              text={compact ? "" : t("上一页", "Prev")}
              aria-disabled={current <= 1}
              className={cn(
                "h-7 text-xs",
                current <= 1 && "pointer-events-none opacity-40"
              )}
              onClick={(event) => {
                event.preventDefault()
                if (current > 1) onPageChange(current - 1)
              }}
            />
          </PaginationItem>
          {!compact &&
            pageNumbers.map((item, idx) =>
              item === "ellipsis" ? (
                <PaginationItem key={`e-${idx}`}>
                  <PaginationEllipsis className="size-7" />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    href={`#page-${item}`}
                    size="icon-sm"
                    isActive={item === current}
                    className="size-7 font-mono text-xs"
                    onClick={(event) => {
                      event.preventDefault()
                      if (item !== current) onPageChange(item)
                    }}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
          <PaginationItem>
            <PaginationNext
              href="#next"
              text={compact ? "" : t("下一页", "Next")}
              aria-disabled={current >= totalPages}
              className={cn(
                "h-7 text-xs",
                current >= totalPages && "pointer-events-none opacity-40"
              )}
              onClick={(event) => {
                event.preventDefault()
                if (current < totalPages) onPageChange(current + 1)
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export function StatusBadge({ status }: { status: Status }) {
  const { t } = usePortal()
  const config: Record<
    Status,
    { zh: string; en: string; badgeClass: string; iconClass: string }
  > = {
    waiting_assets: {
      zh: "待传素材",
      en: "Needs materials",
      badgeClass: "border-border bg-secondary text-secondary-foreground",
      iconClass: "text-muted-foreground",
    },
    producing: {
      zh: "制作中",
      en: "In production",
      badgeClass: "border-primary/20 bg-primary/10 text-primary",
      iconClass: "text-primary",
    },
    waiting_confirm: {
      zh: "待确认",
      en: "Needs review",
      badgeClass:
        "border-brand-gold/40 bg-brand-gold/15 text-amber-900 dark:text-amber-200",
      iconClass: "text-amber-700 dark:text-amber-300",
    },
    revision: {
      zh: "需要修改",
      en: "Needs changes",
      badgeClass: "border-destructive/25 bg-destructive/10 text-destructive",
      iconClass: "text-destructive",
    },
    approved: {
      zh: "待交付",
      en: "Ready to deliver",
      badgeClass:
        "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
      iconClass: "text-sky-600 dark:text-sky-300",
    },
    completed: {
      zh: "已交付",
      en: "Delivered",
      badgeClass:
        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
      iconClass: "text-emerald-600 dark:text-emerald-300",
    },
  }
  const item = config[status]
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors duration-200",
        item.badgeClass
      )}
    >
      <AppMorphIcon
        icon={orderStatusMorphIcons[status]}
        size={12}
        strokeWidth={2.2}
        spring={statusMorphSpring}
        className={cn("size-3 shrink-0 transition-colors duration-200", item.iconClass)}
      />
      {t(item.zh, item.en)}
    </Badge>
  )
}
