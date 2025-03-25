'use client';

import { format } from 'date-fns';
import { Check, X, Edit, Users, CalendarIcon, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TherapistAvailability } from '@/app/hooks/use-therapist-availability';
import { TimeOff } from '@/app/types/index';
import { TimeBlock } from '../time/types';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface TimeBlockRendererProps {
  block: TimeBlock;
  onEditException?: (exception: TimeOff) => void;
  onEditAvailability?: (availability: TherapistAvailability) => void;
  onDeleteException?: (id: string) => void;
  onDeleteAvailability?: (id: string) => void;
  isPastDate: boolean;
  compact?: boolean;
  enableTooltips?: boolean;
}

/**
 * Helper to determine if a time-off is all-day based on timestamps
 */
function isAllDayTimeOff(start_time: string, end_time: string): boolean {
  try {
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    
    const startHours = startDate.getHours();
    const startMinutes = startDate.getMinutes();
    const endHours = endDate.getHours();
    const endMinutes = endDate.getMinutes();
    
    // Consider it all-day if it starts at/before 00:10 and ends at/after 23:50
    return (startHours === 0 && startMinutes <= 10) && 
           (endHours === 23 && endMinutes >= 50);
  } catch (error) {
    return false;
  }
}

export function TimeBlockRenderer({ 
  block, 
  onEditException, 
  onEditAvailability,
  onDeleteException,
  onDeleteAvailability,
  isPastDate,
  compact = false,
  enableTooltips = false
}: TimeBlockRendererProps) {
  // Format times for display
  const formatTimeDisplay = (timeString: string) => {
    try {
      // Handle cases where the timeString is an ISO string (contains T) vs. just a time string (HH:MM)
      let timeValue;
      
      if (timeString.includes('T')) {
        // Extract time portion from ISO string (e.g., "2023-04-01T09:00:00" -> "09:00")
        timeValue = timeString.split('T')[1].substring(0, 5);
      } else {
        // Just use the time string as is (e.g., "09:00")
        timeValue = timeString.substring(0, 5);
      }
      
      // Create a date object with a fixed date (2000-01-01) to avoid timezone issues
      const date = new Date(`2000-01-01T${timeValue}`);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid time value: ${timeValue}`);
      }
      
      return format(date, 'h:mm a');
    } catch (error) {
      console.error('Error formatting time:', error, 'Original value:', timeString);
      // Fallback to a basic formatting approach for robustness
      try {
        // Try to extract hours and minutes from the string
        let hours = 0;
        let minutes = 0;
        
        if (timeString.includes(':')) {
          const parts = timeString.split(':');
          hours = parseInt(parts[0], 10);
          minutes = parseInt(parts[1], 10);
        } else if (timeString.includes('T')) {
          const timePart = timeString.split('T')[1];
          const parts = timePart.split(':');
          hours = parseInt(parts[0], 10);
          minutes = parseInt(parts[1], 10);
        }
        
        if (isNaN(hours) || isNaN(minutes)) {
          return timeString; // Return original if parsing fails
        }
        
        const period = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      } catch (e) {
        return timeString; // Return original as last resort
      }
    }
  };
  
  // Wrapper for tooltip if enabled
  const TooltipWrapper = ({ children, title }: { children: React.ReactNode, title: string }) => {
    if (!enableTooltips) {
      return <>{children}</>;
    }
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {children}
          </TooltipTrigger>
          <TooltipContent>
            <p>{title}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
  
  // All-day time off event
  if (block.type === 'time-off' && isAllDayTimeOff(block.start_time, block.end_time)) {
    // Format date range for multi-day events
    let dateRangeText = '';
    const startDate = new Date(block.start_time);
    const endDate = new Date(block.end_time);
    
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    if (startDateStr !== endDateStr) {
      dateRangeText = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
    }
    
    return (
      <div
        className="text-xs bg-red-100 text-red-800 p-1.5 rounded-md mb-1.5 flex justify-between items-center border border-red-300 shadow-sm group hover:bg-red-200 transition-colors"
        title={block.reason || 'All day event'}
      >
        <div className="flex items-center gap-1 overflow-hidden">
          <CalendarIcon className="h-3 w-3 text-red-600 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="font-medium truncate">
              {block.reason || 'All Day'}
            </span>
            {dateRangeText && (
              <span className="text-red-600 text-[10px]">{dateRangeText}</span>
            )}
            <span className="text-red-600 text-[10px]">All Day</span>
          </div>
        </div>
        
        {/* Edit and Delete buttons for time off */}
        {(onEditException || onDeleteException) && !isPastDate && (
          <div className="flex space-x-1">
            {onEditException && (
              <TooltipWrapper title={isPastDate ? "Cannot edit past time off" : "Edit time off"}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditException(block.original as TimeOff);
                  }}
                  title="Edit event"
                >
                  <Edit className="h-3 w-3 text-red-700" />
                </Button>
              </TooltipWrapper>
            )}
            
            {onDeleteException && (
              <TooltipWrapper title={isPastDate ? "Cannot delete past time off" : "Delete time off"}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteException(block.id);
                  }}
                  title="Delete event"
                >
                  <Trash2 className="h-3 w-3 text-red-700" />
                </Button>
              </TooltipWrapper>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Regular availability block
  if (block.type === 'availability') {
    // Check if this is a split block
    const isSplitBlock = block.id.includes('-split-');
    
    // Get original block ID for split blocks
    const originalId = isSplitBlock ? block.id.split('-split-')[0] : block.id;
    
    return (
      <div
        className="text-xs bg-green-100 text-green-800 p-1.5 rounded-md mb-1.5 flex justify-between items-center border border-green-300 shadow-sm group hover:bg-green-200 transition-colors"
      >
        <div className="flex items-center gap-1">
          <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
          <span className="font-medium">
            {formatTimeDisplay(block.start_time)} - {formatTimeDisplay(block.end_time)}
          </span>
          {!compact && block.recurrence && (
            <span className="text-[10px] bg-green-200 text-green-800 px-1 rounded">Recurring</span>
          )}
        </div>
        
        {/* Edit and Delete buttons for availability */}
        {(onEditAvailability || onDeleteAvailability) && !isPastDate && (
          <div className="flex space-x-1">
            {onEditAvailability && (
              <TooltipWrapper 
                title={
                  isSplitBlock 
                    ? `This is part of a larger availability block ${block.original_time || ''}.`
                    : (isPastDate ? "Cannot edit past availability" : "Edit availability")
                }
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isSplitBlock) {
                      onEditAvailability(block.original as TherapistAvailability);
                    } else {
                      // For split blocks, find the original block in the availability array
                      const originalBlock = block.original;
                      if (originalBlock) {
                        onEditAvailability(originalBlock);
                      }
                    }
                  }}
                  title="Edit availability"
                >
                  {isSplitBlock ? (
                    <Info className="h-3 w-3 text-blue-600" />
                  ) : (
                    <Edit className="h-3 w-3 text-green-700" />
                  )}
                </Button>
              </TooltipWrapper>
            )}
            
            {onDeleteAvailability && (
              <TooltipWrapper title={isPastDate ? "Cannot delete past availability" : "Delete availability"}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAvailability(originalId);
                  }}
                  title="Delete availability"
                >
                  <Trash2 className="h-3 w-3 text-red-600" />
                </Button>
              </TooltipWrapper>
            )}
          </div>
        )}
      </div>
    );
  } 
  
  // Regular time-off block
  if (block.type === 'time-off') {
    return (
      <div
        className="text-xs bg-red-100 text-red-800 p-1.5 rounded-md mb-1.5 flex justify-between items-center border border-red-300 shadow-sm group hover:bg-red-200 transition-colors"
        title={block.reason || 'Time off'}
      >
        <div className="flex items-center gap-1">
          <X className="h-3 w-3 text-red-600 flex-shrink-0" />
          <span className="font-medium">
            {formatTimeDisplay(block.start_time)} - {formatTimeDisplay(block.end_time)}
            {block.reason && (
              <span className="ml-1 text-red-700">({block.reason})</span>
            )}
          </span>
        </div>
        
        {/* Edit and Delete buttons for time off */}
        {(onEditException || onDeleteException) && !isPastDate && (
          <div className="flex space-x-1">
            {onEditException && (
              <TooltipWrapper title={isPastDate ? "Cannot edit past time off" : "Edit time off"}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditException(block.original as TimeOff);
                  }}
                  title="Edit time off"
                >
                  <Edit className="h-3 w-3 text-red-700" />
                </Button>
              </TooltipWrapper>
            )}
            
            {onDeleteException && (
              <TooltipWrapper title={isPastDate ? "Cannot delete past time off" : "Delete time off"}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteException(block.id);
                  }}
                  title="Delete time off"
                >
                  <Trash2 className="h-3 w-3 text-red-700" />
                </Button>
              </TooltipWrapper>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Appointment block
  if (block.type === 'appointment') {
    // Format client name safely
    const clientName = block.client_name || 'Client';
    
    // Format status
    const status = block.status || 'scheduled';
    
    // Determine status color
    let statusColor = 'bg-blue-100 text-blue-800 border-blue-300';
    let statusIconColor = 'text-blue-600';
    
    if (status === 'confirmed') {
      statusColor = 'bg-blue-100 text-blue-800 border-blue-300';
      statusIconColor = 'text-blue-600';
    } else if (status === 'completed') {
      statusColor = 'bg-green-100 text-green-800 border-green-300';
      statusIconColor = 'text-green-600';
    } else if (status === 'cancelled' || status === 'no_show') {
      statusColor = 'bg-gray-100 text-gray-800 border-gray-300';
      statusIconColor = 'text-gray-600';
    }
    
    return (
      <div
        className={`text-xs ${statusColor} p-1.5 rounded-md mb-1.5 flex justify-between items-center border shadow-sm`}
        title={`Appointment with ${clientName}`}
      >
        <div className="flex items-center gap-1">
          <Users className={`h-3 w-3 ${statusIconColor} flex-shrink-0`} />
          <span className="font-medium">
            {formatTimeDisplay(block.start_time)} - {formatTimeDisplay(block.end_time)}
            <span className="ml-1">({clientName})</span>
          </span>
        </div>
      </div>
    );
  }
  
  // Fallback for unknown block types
  return (
    <div className="text-xs bg-gray-100 text-gray-800 p-1.5 rounded-md mb-1.5 border border-gray-300 shadow-sm">
      <span className="font-medium">
        {formatTimeDisplay(block.start_time)} - {formatTimeDisplay(block.end_time)}
      </span>
    </div>
  );
} 