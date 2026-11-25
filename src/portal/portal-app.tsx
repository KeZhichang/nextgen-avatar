import { lazy, Suspense, useEffect } from "react"
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
import { Compass } from "lucide-react"

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
import { ActionLink, FadeTransition, PageWidth } from "./layout"

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
const OrderChatPage = lazy(() =>
  import("./production").then(({ OrderChatPage }) => ({
    default: OrderChatPage,
  }))
)
const VideoReviewPage = lazy(() =>
  import("./production").then(({ VideoReviewPage }) => ({
    default: VideoReviewPage,
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
          <FadeTransition key={route}>
            <Outlet />
          </FadeTransition>
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

export function PortalApp() {
  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={300}>
        <DemoProvider>
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
