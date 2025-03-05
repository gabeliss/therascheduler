import React from 'react';
import { cn } from '@/lib/utils';

interface AccordionProps {
  children: React.ReactNode;
  type?: string;
  className?: string;
  collapsible?: boolean;
}

export const Accordion = ({ 
  children, 
  type, 
  className,
  collapsible 
}: AccordionProps) => {
  return <div className={className}>{children}</div>;
};

interface AccordionItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export const AccordionItem = ({ children, value, className }: AccordionItemProps) => {
  return <div className={className}>{children}</div>;
};

interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export const AccordionTrigger = ({ children, className }: AccordionTriggerProps) => {
  return <div className={cn("flex justify-between items-center cursor-pointer", className)}>{children}</div>;
};

interface AccordionContentProps {
  children: React.ReactNode;
}

export const AccordionContent = ({ children }: AccordionContentProps) => {
  return <div className="mt-2">{children}</div>;
}; 