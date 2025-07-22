// src/components/ui/badge.jsx

import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Base styles for all badges
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow",
        outline: "text-foreground",
        success: 
          "border-transparent bg-emerald-500 text-primary-foreground shadow",
        warning: 
          "border-transparent bg-orange-500 text-primary-foreground shadow",
        info: 
          "border-transparent bg-sky-500 text-primary-foreground shadow",
      },
      // --- START: เพิ่ม variant ใหม่สำหรับ interactivity ---
      interactive: {
        true: "cursor-pointer hover:opacity-80",
        false: "cursor-default",
      },
      // --- END ---
    },
    defaultVariants: {
      variant: "default",
      interactive: false, // --- ค่าเริ่มต้นคือแสดงผลเฉยๆ ---
    },
  }
)

function Badge({
  className,
  variant,
  interactive, // --- รับ prop ใหม่ ---
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant, interactive }), className)} {...props} />);
}

export { Badge, badgeVariants }