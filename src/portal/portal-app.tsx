import { Component, lazy, Suspense, useEffect, type ReactNode } from "react"
import { BrandLoader } from "@/components/ui/brand-loader"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router"
import { Compass, RotateCw } from "lucide-react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { DemoProvider, useDemo, usePortal, useTeamAuth } from "./demo"
import { defaultLocale, isLocale, setDocumentLocale } from "./i18n"
import { ActionLink, PageWidth } from "./layout"

const AuthPage = lazy(() =>
  import("./purchase").then(({ AuthPage }) => ({ default: AuthPage }))
)
const CheckoutPage = lazy(() =>
  import("./purchase").then(({ CheckoutPage }) => ({ default: CheckoutPage }))
)
const ClientConsoleShell = lazy(() =>
  import("./workspace").then(({ ClientConsoleShell }) => ({
    default: ClientConsoleShell,
  }))
)
const RequireClientAuth = lazy(() =>
  import("./workspace").then(({ RequireClientAuth }) => ({
    default: RequireClientAuth,
  }))
)
const WorkspacePage = lazy(() =>
  import("./workspace").then(({ WorkspacePage }) => ({
    default: WorkspacePage,
  }))
)
const ClientOrderHubRoute = lazy(() =>
  import("./production").then(({ ClientOrderHubRoute }) => ({
    default: ClientOrderHubRoute,
  }))
)
const StudioWorkspacePage = lazy(() =>
  import("./production").then(({ StudioWorkspacePage }) => ({
    default: StudioWorkspacePage,
  }))
)
const AdminLoginPage = lazy(() =>
  import("./team-console").then(({ AdminLoginPage }) => ({
    default: AdminLoginPage,
  }))
)
const AdminPermissionsPage = lazy(() =>
  import("./team-console").then(({ AdminPermissionsPage }) => ({
    default: AdminPermissionsPage,
  }))
)
const RequireTeamAuth = lazy(() =>
  import("./team-console").then(({ RequireTeamAuth }) => ({
    default: RequireTeamAuth,
  }))
)
const AdminOrdersPage = lazy(() =>
  import("./admin").then(({ AdminOrdersPage }) => ({
    default: AdminOrdersPage,
  }))
)
const AdminSettingsPage = lazy(() =>
  import("./admin").then(({ AdminSettingsPage }) => ({
    default: AdminSettingsPage,
  }))
)

function resolveIncomingLocale(search: string) {
  const params = new URLSearchParams(search)
  const raw = (params.get("lang") ?? params.get("locale") ?? "")
    .trim()
    .toLowerCase()
  if (raw === "zh" || raw === "zh-cn" || raw === "zh-hans") return "zh"
  return defaultLocale
}

function RootRedirect() {
  const { search, hash } = useLocation()
  return (
    <Navigate
      to={{ pathname: "/" + resolveIncomingLocale(search), search, hash }}
      replace
    />
  )
}

function ExternalCheckoutRedirect() {
  const { plan } = useParams()
  const { search, hash } = useLocation()
  const locale = resolveIncomingLocale(search)
  const params = new URLSearchParams(search)
  params.delete("lang")
  params.delete("locale")
  if (plan) params.set("plan", plan)
  const query = params.toString()
  return (
    <Navigate
      to={{
        pathname: `/${locale}/checkout`,
        search: query ? `?${query}` : "",
        hash,
      }}
      replace
    />
  )
}

function ExternalAuthRedirect({ defaultMode }: { defaultMode?: string }) {
  const { search, hash } = useLocation()
  const locale = resolveIncomingLocale(search)
  const params = new URLSearchParams(search)
  params.delete("lang")
  params.delete("locale")
  if (defaultMode && !params.has("mode")) params.set("mode", defaultMode)
  const query = params.toString()
  return (
    <Navigate
      to={{
        pathname: `/${locale}/auth`,
        search: query ? `?${query}` : "",
        hash,
      }}
      replace
    />
  )
}

function ExternalPathRedirect({ target }: { target: string }) {
  const { search, hash } = useLocation()
  const locale = resolveIncomingLocale(search)
  const params = new URLSearchParams(search)
  params.delete("lang")
  params.delete("locale")
  const query = params.toString()
  return (
    <Navigate
      to={{
        pathname: `/${locale}/${target}`,
        search: query ? `?${query}` : "",
        hash,
      }}
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
          <div key={route} className="animate-in fade-in duration-150">
            <Outlet />
          </div>
        )}
      </Suspense>
    </div>
  )
}

function LocaleIndexEntry() {
  const { href } = usePortal()
  const { search, hash } = useLocation()
  const { isLiveSupabase, authLoading, authUser } = useDemo()
  const { isAuthenticated: isTeamAuthenticated } = useTeamAuth()

  if (isLiveSupabase && authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spinner className="size-6 text-primary" />
      </div>
    )
  }

  if (isTeamAuthenticated) {
    return <Navigate to={href("admin-orders")} replace />
  }

  if (isLiveSupabase && authUser) {
    return <Navigate to={href("workspace")} replace />
  }

  return (
    <Navigate
      to={{ pathname: href("auth"), search, hash }}
      replace
    />
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
            {t("返回登录 / 工作台", "Back to sign in")}
          </ActionLink>
        </EmptyContent>
      </Empty>
    </PageWidth>
  )
}

function AuthTransitionOverlay() {
  const { authTransition } = useDemo()
  const { pathname } = useLocation()
  const zh = pathname === "/zh" || pathname.startsWith("/zh/")

  return (
    <BrandLoader
      loading={authTransition.active}
      step={authTransition.step}
      dark={authTransition.portal === "team"}
      label={zh ? "正在进入工作台" : "Entering workspace"}
    />
  )
}

const CHUNK_RELOAD_KEY = "nextgen_portal_chunk_reload_at"

function isChunkLoadError(error: unknown) {
  if (!(error instanceof Error)) return false
  const message = `${error.name} ${error.message}`.toLowerCase()
  return (
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("importing a module script failed") ||
    message.includes("loading chunk") ||
    message.includes("chunkloaderror")
  )
}

class PortalErrorBoundaryInner extends Component<
  { resetKey: string; zh: boolean; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error)) {
      const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || "0")
      if (Date.now() - last > 15_000) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
        window.location.reload()
      }
    }
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      const { zh } = this.props
      return (
        <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
          <Empty className="max-w-md border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RotateCw aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>
                {zh ? "页面加载遇到异常" : "Something went wrong"}
              </EmptyTitle>
              <EmptyDescription>
                {zh
                  ? "可能是应用刚刚更新或网络波动导致，刷新页面即可恢复。"
                  : "A recent update or network hiccup interrupted this view. Reload to recover."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => window.location.reload()}>
                <RotateCw data-icon="inline-start" aria-hidden="true" />
                {zh ? "刷新页面" : "Reload page"}
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      )
    }
    return this.props.children
  }
}

function PortalErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation()
  const zh = pathname === "/zh" || pathname.startsWith("/zh/")
  return (
    <PortalErrorBoundaryInner resetKey={`${pathname}${search}`} zh={zh}>
      {children}
    </PortalErrorBoundaryInner>
  )
}

export function PortalApp() {
  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={300}>
        <DemoProvider>
          <AuthTransitionOverlay />
          <PortalErrorBoundary>
            <Routes>
              <Route index element={<RootRedirect />} />
              {/* Compatibility entry routes for external marketing site links */}
              <Route path="checkout" element={<ExternalCheckoutRedirect />} />
              <Route path="checkout/:plan" element={<ExternalCheckoutRedirect />} />
              <Route path="auth" element={<ExternalAuthRedirect />} />
              <Route path="account/register" element={<ExternalAuthRedirect defaultMode="register" />} />
              <Route path="account/*" element={<ExternalAuthRedirect />} />
              <Route path="portal" element={<ExternalPathRedirect target="workspace" />} />
              <Route path="portal/*" element={<ExternalPathRedirect target="workspace" />} />
              <Route path="admin" element={<ExternalPathRedirect target="admin-orders" />} />
              <Route path="admin/*" element={<ExternalPathRedirect target="admin-orders" />} />
              <Route path=":locale" element={<LocaleLayout />}>
                <Route index element={<LocaleIndexEntry />} />
                <Route path="auth" element={<AuthPage />} />
                <Route element={<RequireClientAuth />}>
                  <Route path="checkout" element={<CheckoutPage />} />
                  <Route element={<ClientConsoleShell />}>
                    <Route path="workspace" element={<WorkspacePage />} />
                    <Route path="order-chat" element={<ClientOrderHubRoute />} />
                    <Route
                      path="video-review"
                      element={<ClientOrderHubRoute />}
                    />
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
          </PortalErrorBoundary>
          <Toaster />
        </DemoProvider>
      </TooltipProvider>
    </BrowserRouter>
  )
}
