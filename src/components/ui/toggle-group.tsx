"use client"

import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { LayoutGroup, motion, useReducedMotion } from "motion/react"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { toggleVariants } from "@/components/ui/toggle"

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants> & {
    spacing?: number
    orientation?: "horizontal" | "vertical"
    activeValue?: string
    indicatorLayoutId?: string
  }
>({
  size: "default",
  variant: "default",
  spacing: 2,
  orientation: "horizontal",
})

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 2,
  orientation = "horizontal",
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants> & {
    spacing?: number
    orientation?: "horizontal" | "vertical"
  }) {
  const autoId = React.useId()
  const isSingle = props.type === "single"
  const [uncontrolledValue, setUncontrolledValue] = React.useState<string>(() =>
    isSingle && typeof props.defaultValue === "string" ? props.defaultValue : ""
  )
  const activeValue = isSingle
    ? typeof props.value === "string"
      ? props.value
      : uncontrolledValue
    : undefined
  const indicatorLayoutId = isSingle ? `toggle-group-${autoId}` : undefined

  const wrappedProps = isSingle
    ? {
        ...props,
        onValueChange: (next: string) => {
          if (props.value === undefined) setUncontrolledValue(next)
          props.onValueChange?.(next)
        },
      }
    : props

  return (
    <LayoutGroup id={indicatorLayoutId}>
      <ToggleGroupPrimitive.Root
        data-slot="toggle-group"
        data-variant={variant}
        data-size={size}
        data-spacing={spacing}
        data-orientation={orientation}
        style={{ "--gap": spacing } as React.CSSProperties}
        className={cn(
          "group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] rounded-lg data-[size=sm]:rounded-[min(var(--radius-md),10px)] data-vertical:flex-col data-vertical:items-stretch",
          className
        )}
        {...wrappedProps}
      >
        <ToggleGroupContext.Provider
          value={{
            variant,
            size,
            spacing,
            orientation,
            activeValue,
            indicatorLayoutId,
          }}
        >
          {children}
        </ToggleGroupContext.Provider>
      </ToggleGroupPrimitive.Root>
    </LayoutGroup>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext)
  const prefersReducedMotion = useReducedMotion()
  const isAnimatedSingle = Boolean(context.indicatorLayoutId)
  const isSelected =
    isAnimatedSingle && context.activeValue === props.value

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      className={cn(
        "relative shrink-0 group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-2 focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pr-1.5 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:pl-1.5 group-data-horizontal/toggle-group:data-[spacing=0]:first:rounded-l-lg group-data-vertical/toggle-group:data-[spacing=0]:first:rounded-t-lg group-data-horizontal/toggle-group:data-[spacing=0]:last:rounded-r-lg group-data-vertical/toggle-group:data-[spacing=0]:last:rounded-b-lg group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        isAnimatedSingle &&
          "data-[state=on]:bg-transparent aria-pressed:bg-transparent hover:data-[state=on]:bg-transparent data-[state=on]:text-foreground",
        className
      )}
      {...props}
    >
      {isSelected && context.indicatorLayoutId && (
        <motion.span
          layoutId={context.indicatorLayoutId}
          aria-hidden="true"
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 420, damping: 34, mass: 0.88 }
          }
          className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] bg-muted shadow-2xs"
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1">
        {children}
      </span>
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
