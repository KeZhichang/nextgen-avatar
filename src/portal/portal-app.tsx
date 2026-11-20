import { lazy, Suspense, useEffect, useRef } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router"
import { Compass } from "lucide-react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { AdminOrdersPage, AdminSettingsPage } from "./admin"
import { DemoProvider, useDemo, usePortal, useTeamAuth } from "./demo"
import { isLocale, readLocalePreference, setDocumentLocale } from "./i18n"
import { ActionLink, FadeTransition, LanguageSwitch, PageWidth } from "./layout"
import {
  OrderChatPage,
  StudioWorkspacePage,
  VideoReviewPage,
} from "./production"
import {
  AdminLoginPage,
  AdminPermissionsPage,
  RequireTeamAuth,
} from "./team-console"
import {
  ClientConsoleShell,
  RequireClientAuth,
  WorkspacePage,
} from "./workspace"

const AuthPage = lazy(() =>
  import("./purchase").then(({ AuthPage }) => ({ default: AuthPage }))
)
const CheckoutPage = lazy(() =>
  import("./purchase").then(({ CheckoutPage }) => ({ default: CheckoutPage }))
)

function RootRedirect() {
  const { search, hash } = useLocation()
  return (
    <Navigate
      to={{ pathname: "/" + readLocalePreference(), search, hash }}
      replace
    />
  )
}

function LocaleLayout() {
  const { locale } = useParams()
  const { pathname } = useLocation()
  const route = pathname.split("/").slice(2).join("/")

  useEffect(() => {
    if (isLocale(locale)) setDocumentLocale(locale)
  }, [locale])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])

  if (!isLocale(locale)) return <RootRedirect />

  const isTeamConsoleRoute = route === "admin" || route.startsWith("admin-")
  const isClientConsoleRoute =
    route === "workspace" || route === "order-chat" || route === "video-review"

  return (
    <div className="product-surface min-h-dvh bg-background text-foreground">
      <Suspense
        fallback={
          <main className="min-h-dvh" aria-busy="true">
            <div className="flex h-14 items-center border-b bg-card px-4 sm:px-6">
              <Skeleton className="h-4 w-40 motion-reduce:animate-none" />
            </div>
            <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-8 sm:px-8">
              <Skeleton className="h-6 w-48 motion-reduce:animate-none" />
              <Skeleton className="h-52 w-full rounded-xl motion-reduce:animate-none" />
            </div>
          </main>
        }
      >
        {isTeamConsoleRoute || isClientConsoleRoute ? (
          <Outlet />
        ) : (
          <FadeTransition key={route}>
            <Outlet />
          </FadeTransition>
        )}
      </Suspense>
    </div>
  )
}

function MarketingHome() {
  const { locale, t, href } = usePortal()
  const { data } = useDemo()
  const { isAuthenticated } = useTeamAuth()
  const navigate = useNavigate()
  const frame = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    function checkout(event: MessageEvent) {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== window.location.origin
      )
        return
      if (event.data?.type !== "nextgen-marketing-checkout") return
      const plan = event.data.plan
      if (typeof plan !== "string" || !plan.trim()) return
      void navigate(
        "/" +
          locale +
          "/auth?redirect=checkout&plan=" +
          encodeURIComponent(plan)
      )
    }
    window.addEventListener("message", checkout)
    return () => window.removeEventListener("message", checkout)
  }, [locale, navigate])

  function sendCatalog() {
    frame.current?.contentWindow?.postMessage(
      { type: "nextgen-marketing-catalog", plans: data.plans },
      window.location.origin
    )
  }

  return (
    <main className="relative h-dvh bg-card">
      <iframe
        ref={frame}
        src={"/marketing/index.html?portal=" + locale}
        title={t("NextGen Avatar 官网", "NextGen Avatar website")}
        className="block size-full border-0"
        onLoad={sendCatalog}
      />
      <nav
        aria-label={t("工作台入口", "Workspace shortcuts")}
        className="absolute right-3 bottom-3 z-10 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-card/95 p-1.5 shadow-lg backdrop-blur-md sm:right-5 sm:bottom-5"
      >
        <LanguageSwitch />
        <Separator orientation="vertical" className="hidden h-5 sm:block" />
        <ActionLink primary size="sm" to={href("auth")}>
          {t("客户登录", "Client login")}
        </ActionLink>
        <ActionLink
          size="sm"
          to={href(isAuthenticated ? "admin-orders" : "admin/login")}
        >
          {t("制作后台", "Team console")}
        </ActionLink>
      </nav>
    </main>
  )
}

function NotFound() {
  const { t, href } = usePortal()
  return (
    <PageWidth className="flex min-h-[70dvh] items-center justify-center">
      <Empty className="max-w-md border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Compass aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{t("找不到页面", "Page not found")}</EmptyTitle>
          <EmptyDescription>
            {t(
              "您访问的链接不存在或已被移动。",
              "The page you are looking for does not exist or has been moved."
            )}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <ActionLink primary to={href()}>
            {t("返回首页", "Back to home")}
          </ActionLink>
        </EmptyContent>
      </Empty>
    </PageWidth>
  )
}

export function PortalApp() {
  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={300}>
        <DemoProvider>
          <Routes>
            <Route index element={<RootRedirect />} />
            <Route path=":locale" element={<LocaleLayout />}>
              <Route index element={<MarketingHome />} />
              <Route path="auth" element={<AuthPage />} />
              <Route element={<RequireClientAuth />}>
                <Route path="checkout" element={<CheckoutPage />} />
                <Route element={<ClientConsoleShell />}>
                  <Route path="workspace" element={<WorkspacePage />} />
                  <Route path="order-chat" element={<OrderChatPage />} />
                  <Route path="video-review" element={<VideoReviewPage />} />
                </Route>
              </Route>
              <Route path="admin/login" element={<AdminLoginPage />} />
              <Route element={<RequireTeamAuth />}>
                <Route path="admin" element={<AdminOrdersPage />} />
                <Route path="admin-orders" element={<AdminOrdersPage />} />
                <Route
                  path="admin-workspace"
                  element={<StudioWorkspacePage />}
                />
                <Route path="admin-settings" element={<AdminSettingsPage />} />
                <Route
                  path="admin-permissions"
                  element={<AdminPermissionsPage />}
                />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          <Toaster />
        </DemoProvider>
      </TooltipProvider>
    </BrowserRouter>
  )
}
