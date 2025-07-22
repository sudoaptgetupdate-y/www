// src/components/ui/StatusBadge.jsx

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { getStatusProperties } from "@/lib/statusUtils";
import { cn } from "@/lib/utils";

/**
 * A reusable component to display a consistent status badge.
 * @param {{status: string, className?: string} & React.ComponentProps<typeof Badge>} props
 */
export const StatusBadge = ({ status, className, ...props }) => {
  const { label, variant } = getStatusProperties(status);
  // --- START: ส่วนที่แก้ไข ---
  // ตรวจสอบว่ามีการส่ง onClick มาหรือไม่
  const isInteractive = !!props.onClick;
  // --- END ---

  return (
    // --- START: ส่วนที่แก้ไข ---
    // ส่ง prop 'interactive' ไปให้ Badge component
    <Badge variant={variant} interactive={isInteractive} className={cn("justify-center", className)} {...props}>
    {/* --- END --- */}
      {label}
    </Badge>
  );
};