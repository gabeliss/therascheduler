import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { TherapistAvailability } from '@/app/hooks/use-therapist-availability';
import { BaseAvailabilityFormValues, ExceptionFormValues } from './schemas';
import { TimeOff } from '@/app/types/index';
import { formatDate } from './time/format';
import { DAYS_OF_WEEK } from './time/types';
import { getDaysOfWeekFromRecurrence, DayOfWeek, createRecurrenceString } from '@/app/utils/schema-converters';
import { checkTimeOverlap } from './time/calculations';

/**
 * Helper function to format a Date object to YYYY-MM-DD string
 */
export const formatDateObject = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Get conflicting availability items for a specific day
 */
export const getConflictingItemsForDay = (
  startTime: string, 
  endTime: string, 
  dayOfWeek: number,
  availability: TherapistAvailability[]
) => {
  return availability.filter(slot => {
    if (!slot.recurrence) return false;
    const daysOfWeek = getDaysOfWeekFromRecurrence(slot.recurrence);
    return daysOfWeek.includes(dayOfWeek as DayOfWeek) &&
          checkTimeOverlap(startTime, endTime, slot.start_time, slot.end_time);
  });
};

/**
 * Get conflicting availability items for a specific date
 */
export const getConflictingItemsForSpecificDate = (
  data: BaseAvailabilityFormValues,
  availability: TherapistAvailability[]
) => {
  if (!data.date) return [];
  
  const formattedDate = formatDateObject(data.date);
  
  return availability.filter(slot => {
    if (slot.recurrence) {
      // Check if the recurring slot is on the same day of week
      const daysOfWeek = getDaysOfWeekFromRecurrence(slot.recurrence);
      return daysOfWeek.includes(data.date?.getDay() as DayOfWeek) &&
              checkTimeOverlap(data.startTime, data.endTime, slot.start_time, slot.end_time);
    } else {
      // Check if the one-time slot is on the same date
      const slotDate = new Date(slot.start_time);
      const slotDateStr = format(slotDate, 'yyyy-MM-dd');
      return slotDateStr === formattedDate &&
              checkTimeOverlap(data.startTime, data.endTime, slot.start_time, slot.end_time);
    }
  });
};

/**
 * Handler for submitting base availability
 */
export const handleBaseAvailabilitySubmit = async (
  data: BaseAvailabilityFormValues,
  skipOverlapCheck: boolean,
  addAvailability: (params: any) => Promise<any>,
  checkForOverlaps: (startTime: string, endTime: string, recurrence: string | null) => boolean,
  setOverlapState: (state: any) => void,
  availability: TherapistAvailability[],
  closeDialog: () => void
) => {
  try {
    // If it's a recurring (weekly) slot
    if (data.type === 'recurring' && data.days && data.days.length > 0) {
      // Convert all day strings to their indices
      const dayIndices = data.days.map(day => DAYS_OF_WEEK.indexOf(day) as DayOfWeek);
      
      // Skip overlap check if explicitly overriding
      if (!skipOverlapCheck) {
        // Create a combined recurrence string for all selected days
        const recurrence = createRecurrenceString(dayIndices);
        
        // Check if any of the days have overlaps
        let hasOverlap = false;
        let overlapDay = '';
        let conflictingItems: TherapistAvailability[] = [];
        
        for (const dayIndex of dayIndices) {
          if (checkForOverlaps(data.startTime, data.endTime, createRecurrenceString([dayIndex]))) {
            hasOverlap = true;
            overlapDay = DAYS_OF_WEEK[dayIndex];
            conflictingItems = getConflictingItemsForDay(
              data.startTime, 
              data.endTime, 
              dayIndex, 
              availability
            );
            break;
          }
        }
        
        if (hasOverlap) {
          // Store in overlapState for the overlap dialog
          setOverlapState({
            isOpen: true,
            type: 'availability',
            data,
            conflictingItems,
            action: 'add'
          });
          return;
        }
      }
      
      // Format the parameters for API call
      const today = new Date().toISOString().split('T')[0];
      const start_time = `${today}T${data.startTime}:00`;
      const end_time = `${today}T${data.endTime}:00`;
      
      // Create combined recurrence string for all selected days
      const recurrence = createRecurrenceString(dayIndices);
      
      // Add the availability as a single entry with multiple days
      await addAvailability({
        start_time,
        end_time,
        recurrence,
        type: 'availability'
      } as any);
      
      toast({
        title: "Availability updated",
        description: "Your weekly availability has been updated.",
      });
    } 
    // If it's a specific date slot
    else if (data.type === 'specific' && data.date) {
      const formattedDate = formatDateObject(data.date);
      
      // Skip overlap check if explicitly overriding
      if (!skipOverlapCheck) {
        // Check for overlaps with existing availability for this specific date
        const start_time = `${formattedDate}T${data.startTime}:00`;
        const end_time = `${formattedDate}T${data.endTime}:00`;
        const hasOverlap = checkForOverlaps(start_time, end_time, null);
        
        if (hasOverlap) {
          // Store in overlapState for the overlap dialog
          setOverlapState({
            isOpen: true,
            type: 'availability',
            data,
            conflictingItems: getConflictingItemsForSpecificDate(data, availability),
            action: 'add'
          });
          return;
        }
      }
      
      // Format the parameters for API call
      const start_time = `${formattedDate}T${data.startTime}:00`;
      const end_time = `${formattedDate}T${data.endTime}:00`;
      
      // Add the availability without recurrence
      await addAvailability({
        start_time,
        end_time,
        recurrence: null,
        type: 'availability'
      } as any);
      
      toast({
        title: "Availability updated",
        description: `Added availability for ${formatDate(formattedDate)}`,
      });
    }
    
    // Close the dialog
    closeDialog();
  } catch (error) {
    console.error('Error submitting availability:', error);
    toast({
      title: "Error",
      description: "Failed to update availability. Please try again.",
      variant: "destructive",
    });
  }
};

/**
 * Handler for submitting time off exception
 */
export const handleExceptionSubmit = async (
  data: ExceptionFormValues & { start_time?: string, end_time?: string },
  addAvailability: (params: any) => Promise<any>,
  closeDialog: () => void
) => {
  try {
    // Use the ISO timestamps that were added to the data object
    if (!data.start_time || !data.end_time) {
      console.error('Missing required start_time or end_time fields');
      toast({
        title: "Error",
        description: "Missing required time fields. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Add the time off using the new schema
    await addAvailability({
      start_time: data.start_time,
      end_time: data.end_time,
      recurrence: data.recurrence,
      reason: data.reason,
      skipOverlapCheck: data.skipOverlapCheck
    } as any);
    
    // Skip toast if skipToast flag is set (for batch operations)
    if (!data.skipToast) {
      const startDate = new Date(data.start_time);
      const endDate = new Date(data.end_time);
      const startDateFormatted = formatDate(startDate.toISOString().split('T')[0]);
      const endDateFormatted = formatDate(endDate.toISOString().split('T')[0]);
      
      if (data.recurrence) {
        toast({
          title: "Time off added",
          description: "Added recurring time off",
        });
      } else {
        // Check if it's a single day or multiple days
        if (startDateFormatted === endDateFormatted) {
          toast({
            title: "Time off added",
            description: `Added time off for ${startDateFormatted}`,
          });
        } else {
          toast({
            title: "Time off added",
            description: `Added time off for ${startDateFormatted} to ${endDateFormatted}`,
          });
        }
      }
    }
    
    // Close the dialog
    closeDialog();
  } catch (error) {
    console.error('Error adding time off:', error);
    toast({
      title: "Error",
      description: "Failed to add time off. Please try again.",
      variant: "destructive",
    });
  }
};

/**
 * Handler for deleting an exception
 */
export const handleExceptionDelete = async (
  id: string,
  availability: TherapistAvailability[],
  deleteAvailability: (id: string) => Promise<void>
) => {
  try {
    // Get the exception before deleting it
    const exceptionToDelete = availability.find(e => e.id === id);
    await deleteAvailability(id);
    
    // Show a single toast notification with appropriate message
    if (exceptionToDelete) {
      if (exceptionToDelete.recurrence) {
        // For recurring exceptions, get the day of week from the recurrence
        const daysOfWeek = getDaysOfWeekFromRecurrence(exceptionToDelete.recurrence);
        if (daysOfWeek.length === 1) {
          const dayName = DAYS_OF_WEEK[daysOfWeek[0]];
          toast({
            title: "Time off deleted",
            description: `Successfully deleted recurring time off for ${dayName}s`,
          });
        } else {
          toast({
            title: "Time off deleted",
            description: `Successfully deleted recurring time off`,
          });
        }
      } else {
        // For non-recurring exceptions, extract date from start_time
        const startDate = new Date(exceptionToDelete.start_time);
        const endDate = new Date(exceptionToDelete.end_time);
        
        const startDateStr = format(startDate, 'yyyy-MM-dd');
        const endDateStr = format(endDate, 'yyyy-MM-dd');
        
        if (startDateStr === endDateStr) {
          toast({
            title: "Time off deleted",
            description: `Successfully deleted time off for ${format(startDate, 'MMMM do, yyyy')}`,
          });
        } else {
          toast({
            title: "Time off deleted",
            description: `Successfully deleted time off for ${format(startDate, 'MMMM do')} to ${format(endDate, 'MMMM do, yyyy')}`,
          });
        }
      }
    } else {
      toast({
        title: "Time off deleted",
        description: "Successfully deleted time off",
      });
    }
  } catch (error) {
    console.error('Error deleting time off:', error);
    toast({
      title: "Error",
      description: "Failed to delete time off. Please try again.",
      variant: "destructive",
    });
  }
};

/**
 * Handler for saving edited time off
 */
export const handleTimeOffSave = async (
  id: string, 
  startTime: string, 
  endTime: string, 
  reason: string,
  recurrence: string | null,
  addAvailability: (params: any) => Promise<any>,
  deleteAvailability: (id: string) => Promise<void>,
  availability: TherapistAvailability[],
  closeDialog: () => void
) => {
  try {
    // Get the existing time-off
    const existingTimeOff = availability.find(a => a.id === id);
    if (!existingTimeOff) {
      throw new Error('Time off not found');
    }
    
    // Extract date part from existing time-off
    const existingDate = existingTimeOff.start_time.split('T')[0];
    
    // Create ISO timestamps
    const start_time = `${existingDate}T${startTime}:00`;
    const end_time = `${existingDate}T${endTime}:00`;
    
    // Delete the old time-off
    await deleteAvailability(id);
    
    // Add the updated time-off
    await addAvailability({
      start_time,
      end_time,
      reason,
      recurrence: recurrence || existingTimeOff.recurrence
    } as any);
    
    toast({
      title: "Time off updated",
      description: "Successfully updated time off",
    });
    
    // Close the dialog
    closeDialog();
  } catch (error) {
    console.error('Error updating time off:', error);
    toast({
      title: "Error",
      description: "Failed to update time off. Please try again.",
      variant: "destructive",
    });
  }
};

/**
 * Handler for saving edited availability
 */
export const handleAvailabilitySave = async (
  id: string, 
  startTime: string, 
  endTime: string,
  addAvailability: (params: any) => Promise<any>,
  deleteAvailability: (id: string) => Promise<void>,
  availability: TherapistAvailability[],
  closeDialog: () => void
) => {
  try {
    // Get the availability to update
    const availabilityToUpdate = availability.find(a => a.id === id);
    
    if (!availabilityToUpdate) {
      throw new Error('Availability not found');
    }
    
    console.log('Updating availability with:', {
      id,
      startTime,
      endTime,
      existing: availabilityToUpdate
    });
    
    // Extract date part from existing availability
    let dateStr;
    
    if (typeof availabilityToUpdate.start_time === 'string' && availabilityToUpdate.start_time.includes('T')) {
      dateStr = availabilityToUpdate.start_time.split('T')[0];
    } else {
      // Fall back to current date
      dateStr = new Date().toISOString().split('T')[0];
    }
    
    // Clean up time string inputs
    const cleanStartTime = startTime.includes('T') 
      ? startTime.split('T')[1].substring(0, 5) 
      : startTime.substring(0, 5);
      
    const cleanEndTime = endTime.includes('T') 
      ? endTime.split('T')[1].substring(0, 5) 
      : endTime.substring(0, 5);
    
    // Create proper ISO timestamps  
    const start_time = `${dateStr}T${cleanStartTime}:00`;
    const end_time = `${dateStr}T${cleanEndTime}:00`;
    
    console.log('Final timestamps:', { start_time, end_time });
    
    // Delete the old availability
    await deleteAvailability(id);
    
    // Add the updated availability
    await addAvailability({
      start_time,
      end_time,
      recurrence: availabilityToUpdate.recurrence
    } as any);
    
    toast({
      title: "Availability updated",
      description: "Successfully updated availability",
    });
    
    // Close the dialog
    closeDialog();
  } catch (error) {
    console.error('Error updating availability:', error);
    toast({
      title: "Error",
      description: "Failed to update availability. Please try again.",
      variant: "destructive",
    });
  }
};

/**
 * Handler for confirming time off overlap action
 */
export const handleTimeOffOverlapConfirm = async (
  action: 'replace' | 'merge',
  overlapState: any,
  deleteAvailability: (id: string) => Promise<void>,
  addAvailability: (params: any) => Promise<any>,
  resetOverlapState: () => void,
  closeDialog: () => void,
  calculateMergedTimeOffSlot: (n1: string, n2: string, e1: string, e2: string) => { startTime: string, endTime: string }
) => {
  if (!overlapState.data || overlapState.type !== 'time-off') {
    return;
  }
  
  try {
    const data = overlapState.data as ExceptionFormValues;
    
    if (action === 'replace') {
      // Delete the overlapping exceptions
      for (const exception of overlapState.conflictingItems) {
        await deleteAvailability(exception.id);
      }
      
      // Add the new exception
      await addAvailability({
        ...data,
        skipOverlapCheck: true
      } as any);
    } else if (action === 'merge') {
      // Merge the exceptions
      // For simplicity, we'll just merge the first overlapping exception
      const firstOverlap = overlapState.conflictingItems[0];
      
      // Calculate the merged time slot
      const mergedSlot = calculateMergedTimeOffSlot(
        data.start_time 
          ? format(new Date(data.start_time), 'HH:mm')
          : data.startTime || '09:00',
        data.end_time 
          ? format(new Date(data.end_time), 'HH:mm')
          : data.endTime || '17:00',
        format(new Date(firstOverlap.start_time), 'HH:mm'),
        format(new Date(firstOverlap.end_time), 'HH:mm')
      );
      
      // Get date part from the form data if it has start_time
      let date;
      if (data.start_time) {
        date = new Date(data.start_time).toISOString().split('T')[0];
      } else {
        // Fall back to the current date
        date = new Date().toISOString().split('T')[0];
      }
      
      const start_time = `${date}T${mergedSlot.startTime}:00`;
      const end_time = `${date}T${mergedSlot.endTime}:00`;
      
      // Delete the first overlapping exception
      await deleteAvailability(firstOverlap.id);
      
      // Add the merged exception
      await addAvailability({
        start_time,
        end_time,
        reason: data.reason || firstOverlap.reason,
        recurrence: data.recurrence
      } as any);
      
      // Delete the other overlapping exceptions
      for (let i = 1; i < overlapState.conflictingItems.length; i++) {
        await deleteAvailability(overlapState.conflictingItems[i].id);
      }
    }
    
    toast({
      title: "Time off added",
      description: data.recurrence 
        ? "Added recurring time off" 
        : `Added time off for ${format(new Date(data.start_time || ''), 'MMMM d')}`,
    });
    
    // Close the dialogs
    resetOverlapState();
    closeDialog();
  } catch (error) {
    console.error('Error handling time off overlap:', error);
    toast({
      title: "Error",
      description: "Failed to add time off. Please try again.",
      variant: "destructive",
    });
  }
}; 