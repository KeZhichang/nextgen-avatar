import {
  BadgeDollarSign,
  Bell,
  BellRing,
  Check,
  CircleCheck,
  Clapperboard,
  ClipboardCheck,
  ContactRound,
  CreditCard,
  Eye,
  FileText,
  House,
  IdCard,
  Inbox,
  LayoutGrid,
  Lock,
  MessageSquare,
  PenLine,
  ReceiptText,
  Send,
  ShieldCheck,
  Tag,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide"
import {
  MorphIcon,
  type IconInput,
  type MorphIconProps,
  type MorphOptions,
} from "morphicons/react"
import { cn } from "cn"

import type { Status } from "./demo"

export type MorphIconPair = {
  idle: IconInput
  active: IconInput
}

/** Expressive spring tuned so 16px geometric morph trajectories read clearly. */
export const navMorphSpring: MorphOptions = { stiffness: 210, damping: 18 }
export const statusMorphSpring: MorphOptions = { stiffness: 190, damping: 20 }

export const clientNavMorphIcons: Record<
  "overview" | "hub" | "billing" | "profile",
  MorphIconPair
> = {
  overview: { idle: House, active: LayoutGrid },
  hub: { idle: MessageSquare, active: Clapperboard },
  billing: { idle: CreditCard, active: ReceiptText },
  profile: { idle: UserRound, active: IdCard },
}

export const teamNavMorphIcons: Record<
  "orders" | "production" | "pricing" | "quote" | "clients" | "permissions",
  MorphIconPair
> = {
  orders: { idle: Inbox, active: ClipboardCheck },
  production: { idle: MessageSquare, active: Clapperboard },
  pricing: { idle: Tag, active: BadgeDollarSign },
  quote: { idle: FileText, active: Send },
  clients: { idle: Users, active: ContactRound },
  permissions: { idle: Lock, active: ShieldCheck },
}

export const notificationBellMorphIcons = {
  read: Bell as IconInput,
  unread: BellRing as IconInput,
  open: X as IconInput,
}

export const orderStatusMorphIcons: Record<Status, IconInput> = {
  waiting_assets: Upload,
  producing: Clapperboard,
  waiting_confirm: Eye,
  revision: PenLine,
  approved: Check,
  completed: CircleCheck,
}

export function AppMorphIcon({
  className,
  spring = navMorphSpring,
  reducedMotion = "user",
  size = 16,
  strokeWidth = 2,
  ...props
}: MorphIconProps) {
  return (
    <MorphIcon
      spring={spring}
      reducedMotion={reducedMotion}
      size={size}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", className)}
      {...props}
    />
  )
}
