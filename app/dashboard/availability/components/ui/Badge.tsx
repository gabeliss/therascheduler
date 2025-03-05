import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: string;
  className?: string;
}

const Badge = ({ children, variant, className }: BadgeProps) => {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
      variant === "outline" ? "border border-gray-200 text-gray-800" : "bg-primary text-primary-foreground",
      className
    )}>
      {children}
    </span>
  );
};

export default Badge; 