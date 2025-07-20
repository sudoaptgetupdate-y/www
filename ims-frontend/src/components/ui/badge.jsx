// src/components/ui/badge.jsx

import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // --- START: เพิ่ม cursor-pointer และ transition-opacity ---
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer hover:opacity-80",
  // --- END ---
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
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }