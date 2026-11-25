"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { LayoutGroup, motion, useReducedMotion } from "motion/react"
import { Tabs as TabsPrimitive } from "radix-ui"

type TabsContextValue = {
  value: string | undefined
  layoutId: string
}

const TabsContext = React.createContext<TabsContextValue>({
  value: undefined,
  layoutId: "",
})

type TabsListContextValue = {
  variant: "default" | "line"
}

const TabsListContext = React.createContext<TabsListContextValue>({
  variant: "default",
})

function Tabs({
  className,
  orientation = "horizontal",
  value: valueProp,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const autoId = React.useId()
  const isControlled = valueProp !== undefined
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const activeValue = isControlled ? valueProp : uncontrolledValue
  const layoutId = `tabs-indicator-${autoId}`

  const handleValueChange = React.useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolledValue(next)
      onValueChange?.(next)
    },
    [isControlled, onValueChange]
  )

  return (
    <TabsContext.Provider value={{ value: activeValue, layoutId }}>
      <LayoutGroup id={layoutId}>
        <TabsPrimitive.Root
          data-slot="tabs"
          data-orientation={orientation}
          orientation={orientation}
          value={activeValue}
          defaultValue={defaultValue}
          onValueChange={handleValueChange}
          className={cn(
            "group/tabs flex gap-2 data-horizontal:flex-col",
            className
          )}
          {...props}
        />
      </LayoutGroup>
    </TabsContext.Provider>
  )
}

const tabsListVariants = cva(
  "group/tabs-list relative inline-flex min-h-8 w-fit items-stretch justify-center rounded-lg p-[3px] text-muted-foreground group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "border border-border/70 bg-muted/80",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  const resolvedVariant = variant ?? "default"
  return (
    <TabsListContext.Provider value={{ variant: resolvedVariant }}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={resolvedVariant}
        className={cn(tabsListVariants({ variant: resolvedVariant }), className)}
        {...props}
      />
    </TabsListContext.Provider>
  )
}

function TabsTrigger({
  className,
  children,
  value,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { value: activeValue, layoutId } = React.useContext(TabsContext)
  const { variant } = React.useContext(TabsListContext)
  const prefersReducedMotion = useReducedMotion()
  const isSelected = activeValue !== undefined && activeValue === value

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        "relative inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-200 group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 data-[state=active]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {isSelected && layoutId && (
        <motion.span
          layoutId={layoutId}
          aria-hidden="true"
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 420, damping: 34, mass: 0.88 }
          }
          className={cn(
            "pointer-events-none absolute z-0",
            variant === "line"
              ? "inset-x-0 -bottom-[3px] h-0.5 rounded-full bg-primary"
              : "inset-0 rounded-md bg-card shadow-xs"
          )}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {children}
      </span>
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const prefersReducedMotion = useReducedMotion()
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    >
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }
        }
      >
        {children}
      </motion.div>
    </TabsPrimitive.Content>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
