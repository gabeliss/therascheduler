// Add a note about file being moved
// This file has been moved to be part of the shared calendar component structure

'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarNavigationProps {
  periodLabel: string;
  onPreviousPeriod: () => void;
  onNextPeriod: () => void; 
  onCurrentPeriod: () => void;
  className?: string;
}

export function CalendarNavigationControls({
  periodLabel,
  onPreviousPeriod,
  onNextPeriod,
  onCurrentPeriod,
  className = ""
}: CalendarNavigationProps) {
  return (
    <div className={`flex justify-between items-center ${className}`}>
      <h2 className="text-xl font-semibold">{periodLabel}</h2>
      <div className="flex space-x-2">
        <Button variant="outline" size="sm" onClick={onPreviousPeriod}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onCurrentPeriod}>
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={onNextPeriod}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 