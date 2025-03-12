import React from 'react';
import { Trash2, Edit, Repeat, Clock, Calendar, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatTime } from '@/app/utils/time-utils';

export interface TimeBlockProps {
  id: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  type: 'availability' | 'time-off';
  reason?: string;
  isAllDay?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function TimeBlock({
  id,
  startTime,
  endTime,
  isRecurring,
  type,
  reason,
  isAllDay,
  onEdit,
  onDelete,
  className
}: TimeBlockProps) {
  const formattedStartTime = formatTime(startTime);
  const formattedEndTime = formatTime(endTime);
  
  const blockTypeStyles = {
    'availability': 'bg-green-100 border-green-300 text-green-800',
    'time-off': 'bg-red-100 border-red-300 text-red-800'
  };
  
  return (
    <div 
      className={cn(
        'p-2 rounded-md border mb-1 text-sm relative group',
        blockTypeStyles[type],
        className
      )}
    >
      <div className="flex justify-between items-start">
        <div>
          {isAllDay ? (
            <span className="font-semibold">All Day</span>
          ) : (
            <span className="font-semibold">
              {formattedStartTime} - {formattedEndTime}
            </span>
          )}
          
          {reason && (
            <div className="mt-1 text-xs">
              {reason}
            </div>
          )}
        </div>
        
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isRecurring && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center">
                    <Repeat className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Recurring</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {onEdit && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5" 
              onClick={onEdit}
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
          
          {onDelete && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 text-red-500 hover:text-red-700" 
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 