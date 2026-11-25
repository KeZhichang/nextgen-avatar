import { type ReactNode } from "react"
import { Link } from "react-router"
import { ChevronsUpDown, Home, LogOut, type LucideIcon } from "lucide-react"
import { LayoutGroup, motion, useReducedMotion } from "motion/react"
import { cn } from "cn"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { marketingSiteUrl, usePortal } from "./demo"
import { BrandMark, LanguageSwitch } from "./layout"
import {
  AppMorphIcon,
  navMorphSpring,
  type MorphIconPair,
} from "./morph-icons"

export type WorkbenchNavItem = {
  id?: string
  label: string
  icon?: LucideIcon
  morph?: MorphIconPair
  active?: boolean
  badge?: string | number
} & ({ to: string } | { onSelect: () => void })

export type WorkbenchNavGroup = {
  label?: string
  items: WorkbenchNavItem[]
}

type WorkbenchLayoutProps = {
  navigationLabel: string
  items?: WorkbenchNavItem[]
  groups?: WorkbenchNavGroup[]
  account: { name: string; detail: string; image: string }
  accountActions?: ReactNode
  brandTo?: string
  showHomeLink?: boolean
  onSignOut?: () => void
  team?: boolean
  heading: ReactNode
  actions: ReactNode
  children: ReactNode
}

function WorkbenchSidebar({
  navigationLabel,
  items,
  groups,
  account,
  accountActions,
  brandTo,
  showHomeLink = true,
  onSignOut,
  team,
}: Pick<
  WorkbenchLayoutProps,
  | "navigationLabel"
  | "items"
  | "groups"
  | "account"
  | "accountActions"
  | "brandTo"
  | "showHomeLink"
  | "onSignOut"
  | "team"
>) {
  const { href, t } = usePortal()
  const { setOpenMobile } = useSidebar()
  const prefersReducedMotion = useReducedMotion()
  const closeMenu = () => setOpenMobile(false)
  const navGroups: WorkbenchNavGroup[] = groups?.length
    ? groups.filter((group) => group.items.length > 0)
    : items?.length
      ? [{ items }]
      : []
  const indicatorLayoutId = team
    ? "team-sidebar-active-indicator"
    : "client-sidebar-active-indicator"

  return (
    <Sidebar
      className={team ? "team-sidebar" : undefined}
      mobileTitle={navigationLabel}
      mobileCloseLabel={t("关闭导航菜单", "Close navigation menu")}
    >
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-4">
        <Link className="w-fit" to={brandTo ?? href()} onClick={closeMenu}>
          <BrandMark studio={team} dark={team} />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <LayoutGroup id={indicatorLayoutId}>
          <nav
            aria-label={navigationLabel}
            className="flex flex-col gap-1 py-2"
          >
            {navGroups.map((group, index) => (
              <SidebarGroup
                key={group.label ?? index}
                className="px-2.5 py-1.5"
              >
                {group.label && (
                  <SidebarGroupLabel
                    className={cn(
                      "px-2.5 text-xs font-semibold tracking-wider uppercase",
                      team ? "text-white/50" : "text-muted-foreground"
                    )}
                  >
                    {group.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {group.items.map(
                      ({ id, icon: Icon, morph, label, active, badge, ...action }) => {
                        const iconNode = morph ? (
                          <AppMorphIcon
                            icon={active ? morph.active : morph.idle}
                            size={16}
                            strokeWidth={active ? 2.15 : 1.85}
                            spring={navMorphSpring}
                            className="size-4 shrink-0"
                          />
                        ) : Icon ? (
                          <Icon aria-hidden="true" />
                        ) : null
                        return (
                        <SidebarMenuItem key={id ?? label}>
                          {active && (
                            <motion.span
                              layoutId={indicatorLayoutId}
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
                                "pointer-events-none absolute inset-0 z-0 rounded-md",
                                team
                                  ? "bg-sidebar-accent shadow-xs"
                                  : "bg-sidebar-accent shadow-2xs"
                              )}
                            />
                          )}
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            className={cn(
                              "relative z-10 h-9 gap-2.5 px-2.5 font-medium transition-colors duration-200 data-active:bg-transparent data-active:hover:bg-transparent active:bg-transparent",
                              team
                                ? "hover:bg-white/10 hover:text-white"
                                : "hover:bg-sidebar-accent/55"
                            )}
                          >
                            {"to" in action ? (
                              <Link
                                to={action.to}
                                onClick={closeMenu}
                                aria-current={active ? "page" : undefined}
                              >
                                {iconNode}
                                <span>{label}</span>
                              </Link>
                            ) : (
                              <button
                                type="button"
                                aria-current={active ? "page" : undefined}
                                onClick={() => {
                                  action.onSelect()
                                  closeMenu()
                                }}
                              >
                                {iconNode}
                                <span>{label}</span>
                              </button>
                            )}
                          </SidebarMenuButton>
                          {badge !== undefined &&
                            badge !== 0 &&
                            badge !== "" && (
                              <SidebarMenuBadge
                                className={cn(
                                  "z-10 rounded-full px-1.5 font-mono text-[11px] transition-colors duration-200",
                                  team
                                    ? active
                                      ? "bg-white/25 text-white"
                                      : "bg-white/15 text-white/85"
                                    : "bg-primary/15 text-primary"
                                )}
                              >
                                {badge}
                              </SidebarMenuBadge>
                            )}
                        </SidebarMenuItem>
                        )
                      }
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </nav>
        </LayoutGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2.5">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="h-auto py-2 data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage
                      src={account.image}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback className="rounded-lg">
                      {account.name.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-xs leading-tight">
                    <span className="truncate font-semibold">
                      {account.name}
                    </span>
                    <span className="truncate text-xs opacity-75">
                      {account.detail}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 opacity-60" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{account.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {account.detail}
                    </span>
                  </div>
                </DropdownMenuLabel>
                {(accountActions || (showHomeLink && marketingSiteUrl)) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {accountActions}
                      {showHomeLink && marketingSiteUrl && (
                        <DropdownMenuItem asChild>
                          <a href={marketingSiteUrl} onClick={closeMenu}>
                            <Home aria-hidden="true" />
                            {t("返回官网首页", "Back to website")}
                          </a>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {onSignOut ? (
                    <DropdownMenuItem
                      onSelect={() => {
                        closeMenu()
                        window.setTimeout(() => onSignOut(), 0)
                      }}
                    >
                      <LogOut aria-hidden="true" />
                      {t("退出登录", "Sign out")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link to={href("auth")} onClick={closeMenu}>
                        <LogOut aria-hidden="true" />
                        {t("退出登录", "Sign out")}
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export function WorkbenchLayout({
  heading,
  actions,
  children,
  ...sidebar
}: WorkbenchLayoutProps) {
  const { t } = usePortal()

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "15rem" } as React.CSSProperties}
    >
      <WorkbenchSidebar {...sidebar} />
      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-x-4 border-b bg-card/95 px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger
              aria-label={t("切换导航菜单", "Toggle navigation menu")}
              size="icon-sm"
            />
            <Separator
              orientation="vertical"
              className="h-4 data-vertical:self-center"
            />
            <div className="min-w-0 truncate text-sm font-semibold">
              {heading}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {actions}
            <LanguageSwitch />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
