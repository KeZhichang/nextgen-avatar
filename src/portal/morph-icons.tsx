import {
  BadgeDollarSign,
  Bell,
  BellRing,
  Check,
  CircleCheck,
  CircleDollarSign,
  Clapperboard,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Eye,
  FileCheck,
  FileSpreadsheet,
  Headphones,
  Headset,
  LayoutDashboard,
  LayoutGrid,
  MessageSquare,
  MessageSquareText,
  PenLine,
  ReceiptText,
  Shield,
  ShieldCheck,
  Upload,
  UserCheck,
  UserRound,
  UserRoundCheck,
  Users,
} from "lucide"
import { MorphIcon, type IconInput, type MorphIconProps } from "morphicons/react"
import { cn } from "cn"

import type { Status } from "./demo"

export type MorphIconPair = {
  idle: IconInput
  active: IconInput
}

export const clientNavMorphIcons: Record<
  "overview" | "hub" | "billing" | "profile",
  MorphIconPair
> = {
  overview: { idle: LayoutGrid, active: LayoutDashboard },
  hub: { idle: MessageSquare, active: MessageSquareText },
  billing: { idle: CreditCard, active: ReceiptText },
  profile: { idle: UserRound, active: UserRoundCheck },
}

export const teamNavMorphIcons: Record<
  "orders" | "production" | "pricing" | "quote" | "clients" | "permissions",
  MorphIconPair
> = {
  orders: { idle: ClipboardList, active: ClipboardCheck },
  production: { idle: Headphones, active: Headset },
  pricing: { idle: CircleDollarSign, active: BadgeDollarSign },
  quote: { idle: FileSpreadsheet, active: FileCheck },
  clients: { idle: Users, active: UserCheck },
  permissions: { idle: Shield, active: ShieldCheck },
}

export const notificationBellMorphIcons = {
  read: Bell as IconInput,
  unread: BellRing as IconInput,
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
  spring = "snappy",
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
