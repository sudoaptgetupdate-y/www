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

  return (
    <Badge variant={variant} className={cn("justify-center", className)} {...props}>
      {label}
    </Badge>
  );
};