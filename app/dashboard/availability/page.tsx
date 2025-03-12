'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Clock } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { useUnifiedAvailability } from '@/app/hooks/use-unified-availability';
import { useTherapistAvailability, TherapistAvailability } from '@/app/hooks/use-therapist-availability';
import { BaseAvailabilityFormValues, ExceptionFormValues } from './utils/schemas';
import { formatDate, DAYS_OF_WEEK } from './utils/time-utils';
import { format } from 'date-fns';
import BaseAvailabilityForm from './components/BaseAvailabilityForm';
import OverlapDialog from './components/OverlapDialog';
import TimeOffManager from './components/TimeOffManager';
import UnifiedExceptionDialog from './components/UnifiedExceptionDialog';
import UnifiedCalendarView from './calendar-view';
import WeeklyView from './components/WeeklyView';
import { useAuth } from '@/app/context/auth-context';
import EditTimeOffDialog from './components/EditTimeOffDialog';
import EditAvailabilityDialog from './components/EditAvailabilityDialog';
import { UnifiedAvailabilityException } from '@/app/types/index';
import { useDialogState } from '@/app/hooks/use-dialog-state';
import { useAvailabilityOperations } from '@/app/hooks/use-availability-operations';

// Component for the Add Availability button
function AddAvailabilityButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick} className="mb-4">
      <Plus className="h-4 w-4 mr-2" />
      Add Availability
    </Button>
  );
}

// Component for the Add Time Off button
function AddTimeOffButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick} variant="outline" className="mb-4 ml-2">
      <Clock className="h-4 w-4 mr-2" />
      Manage Time Off
    </Button>
  );
}

// Helper function to format Date objects to string
const formatDateObject = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

export default function AvailabilityPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    unifiedAvailability,
    loading: exceptionsLoading,
    error: exceptionsError,
    addUnifiedException,
    deleteUnifiedException,
    updateUnifiedException,
    refreshAvailability: refreshExceptions,
    checkForOverlaps: checkExceptionOverlaps
  } = useUnifiedAvailability();

  const {
    availability,
    loading: availabilityLoading,
    error: availabilityError,
    addAvailability,
    deleteAvailability,
    checkForOverlaps
  } = useTherapistAvailability();
  
  const { toast } = useToast();
  
  // Use custom hooks for dialog state management
  const baseAvailabilityDialog = useDialogState();
  const timeOffManagerDialog = useDialogState();
  const exceptionDialog = useDialogState<Date>();
  const editTimeOffDialog = useDialogState<UnifiedAvailabilityException>();
  const editAvailabilityDialog = useDialogState<TherapistAvailability>();
  
  // Use custom hook for overlap operations
  const {
    overlapState,
    setOverlapState,
    resetOverlapState,
    calculateMergedTimeOffSlot,
    calculateMergedSlot,
    handleBaseAvailabilityOverlap,
    handleTimeOffOverlap
  } = useAvailabilityOperations();

  // Handler for submitting base availability form
  const onSubmitBase = async (data: BaseAvailabilityFormValues, forceAdd = false) => {
    try {
      // Check for overlaps if not forcing add
      if (!forceAdd) {
        const overlappingSlots = [];
        
        if (data.type === 'recurring' && data.days) {
          // For recurring availability, check each selected day
          for (const day of data.days) {
            const dayOfWeek = parseInt(day);
            const hasOverlap = checkForOverlaps(
              data.startTime,
              data.endTime,
              true,
              dayOfWeek
            );
            
            if (hasOverlap) {
              // Find the overlapping slots for this day
              const overlaps = availability.filter(slot => 
                slot.is_recurring && 
                slot.day_of_week === dayOfWeek &&
                checkTimeOverlap(data.startTime, data.endTime, slot.start_time, slot.end_time)
              );
              
              overlappingSlots.push(...overlaps);
            }
          }
        } else if (data.type === 'specific' && data.date) {
          // For specific date availability
          const formattedDate = formatDateObject(data.date);
          const hasOverlap = checkForOverlaps(
            data.startTime,
            data.endTime,
            false,
            undefined,
            formattedDate
          );
          
          if (hasOverlap) {
            // Find the overlapping slots for this date
            const overlaps = availability.filter(slot => {
              if (slot.is_recurring) {
                // Check if the recurring slot is on the same day of week
                return slot.day_of_week === data.date?.getDay() &&
                       checkTimeOverlap(data.startTime, data.endTime, slot.start_time, slot.end_time);
              } else {
                // Check if the specific date slot is on the same date
                return slot.specific_date === formattedDate &&
                       checkTimeOverlap(data.startTime, data.endTime, slot.start_time, slot.end_time);
              }
            });
            
            overlappingSlots.push(...overlaps);
          }
        }
        
        // If there are overlapping slots, show the overlap dialog
        if (overlappingSlots.length > 0) {
          handleBaseAvailabilityOverlap(data, overlappingSlots);
          return;
        }
      }
      
      // No overlaps or forcing add, proceed with adding availability
      if (data.type === 'recurring' && data.days) {
        // Add recurring availability for each selected day
        for (const day of data.days) {
          // Convert day name to index (0-6)
          const dayIndex = DAYS_OF_WEEK.indexOf(day);
          console.log('Adding recurring availability for day:', day, 'index:', dayIndex);
          
          if (dayIndex === -1) {
            console.error('Invalid day name:', day);
            continue;
          }
          
          await addAvailability({
            startTime: data.startTime,
            endTime: data.endTime,
            isRecurring: true,
            dayOfWeek: dayIndex
          });
        }
        
        toast({
          title: "Availability added",
          description: `Added recurring availability for ${data.days.length} day(s)`,
        });
      } else if (data.type === 'specific' && data.date) {
        // Add specific date availability
        const formattedDate = formatDateObject(data.date);
        await addAvailability({
          startTime: data.startTime,
          endTime: data.endTime,
          isRecurring: false,
          specificDate: formattedDate
        });
        
        toast({
          title: "Availability added",
          description: `Added availability for ${formattedDate}`,
        });
      }
      
      // Close the dialog
      baseAvailabilityDialog.closeDialog();
    } catch (error) {
      console.error('Error adding availability:', error);
      toast({
        title: "Error",
        description: "Failed to add availability. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handler for submitting exception form
  const onSubmitUnifiedException = async (data: ExceptionFormValues) => {
    try {
      // Check for overlaps with existing exceptions
      const hasOverlap = checkExceptionOverlaps(
        data.startTime,
        data.endTime,
        data.isRecurring,
        data.dayOfWeek,
        data.startDate,
        data.endDate
      );
      
      if (hasOverlap) {
        // Find the overlapping exceptions
        const overlappingExceptions = unifiedAvailability.filter(exception => {
          if (data.isRecurring && exception.is_recurring) {
            // Both are recurring, check if they're on the same day of week
            return data.dayOfWeek === exception.day_of_week &&
                   checkTimeOverlap(data.startTime, data.endTime, exception.start_time, exception.end_time);
          } else if (!data.isRecurring && !exception.is_recurring) {
            // Both are non-recurring, check if their date ranges overlap
            if (data.startDate && data.endDate && exception.start_date && exception.end_date) {
              const newStart = new Date(data.startDate);
              const newEnd = new Date(data.endDate);
              const existingStart = new Date(exception.start_date);
              const existingEnd = new Date(exception.end_date);
              
              return (
                (newStart <= existingEnd && newEnd >= existingStart) &&
                checkTimeOverlap(data.startTime, data.endTime, exception.start_time, exception.end_time)
              );
            }
            return false;
          } else if (data.isRecurring && !exception.is_recurring) {
            // New is recurring, existing is non-recurring
            // Check if the existing exception falls on the same day of week
            if (exception.start_date) {
              const exceptionDate = new Date(exception.start_date);
              return data.dayOfWeek === exceptionDate.getDay() &&
                     checkTimeOverlap(data.startTime, data.endTime, exception.start_time, exception.end_time);
            }
            return false;
          } else if (!data.isRecurring && exception.is_recurring) {
            // New is non-recurring, existing is recurring
            // Check if the new exception falls on the same day of week as the recurring exception
            if (data.startDate) {
              const newDate = new Date(data.startDate);
              return exception.day_of_week === newDate.getDay() &&
                     checkTimeOverlap(data.startTime, data.endTime, exception.start_time, exception.end_time);
            }
            return false;
          }
          
          return false;
        });
        
        if (overlappingExceptions.length > 0) {
          handleTimeOffOverlap(data, overlappingExceptions);
          return;
        }
      }
      
      // No overlaps, proceed with adding the exception
      await addUnifiedException(data);
      
      // Show a single toast notification with appropriate message
      // Skip toast if skipToast flag is set (for batch operations)
      if (!data.skipToast) {
        if (data.isRecurring) {
          toast({
            title: "Time off added",
            description: "Added recurring time off",
          });
        } else if (data.startDate && data.endDate) {
          // For multi-day time off, show a single notification
          const startDateFormatted = formatDate(data.startDate);
          const endDateFormatted = formatDate(data.endDate);
          
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
        } else if (data.startDate) {
          toast({
            title: "Time off added",
            description: `Added time off for ${formatDate(data.startDate)}`,
          });
        }
      }
      
      // Close the dialog
      exceptionDialog.closeDialog();
    } catch (error) {
      console.error('Error adding time off:', error);
      toast({
        title: "Error",
        description: "Failed to add time off. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handler for deleting an exception
  const handleDeleteException = async (id: string) => {
    try {
      // Get the exception before deleting it
      const exceptionToDelete = unifiedAvailability.find(e => e.id === id);
      await deleteUnifiedException(id);
      
      // Show a single toast notification with appropriate message
      if (exceptionToDelete) {
        if (exceptionToDelete.is_recurring) {
          const dayName = DAYS_OF_WEEK[exceptionToDelete.day_of_week || 0];
          toast({
            title: "Time off deleted",
            description: `Successfully deleted recurring time off for ${dayName}s`,
          });
        } else if (exceptionToDelete.start_date && exceptionToDelete.end_date) {
          const startDate = formatDate(exceptionToDelete.start_date);
          const endDate = formatDate(exceptionToDelete.end_date);
          
          if (startDate === endDate) {
            toast({
              title: "Time off deleted",
              description: `Successfully deleted time off for ${startDate}`,
            });
          } else {
            toast({
              title: "Time off deleted",
              description: `Successfully deleted time off for ${startDate} to ${endDate}`,
            });
          }
        } else {
          toast({
            title: "Time off deleted",
            description: "Successfully deleted time off",
          });
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

  // Handler for editing time off
  const handleEditTimeOff = (exception: UnifiedAvailabilityException) => {
    editTimeOffDialog.openDialog(exception);
  };

  // Handler for editing availability
  const handleEditAvailability = (availability: TherapistAvailability) => {
    editAvailabilityDialog.openDialog(availability);
  };

  // Handler for saving edited time off
  const handleSaveTimeOff = async (
    id: string, 
    startTime: string, 
    endTime: string, 
    reason: string,
    startDate?: string,
    endDate?: string,
    isAllDay?: boolean
  ) => {
    try {
      await updateUnifiedException(id, {
        start_time: startTime,
        end_time: endTime,
        reason,
        start_date: startDate,
        end_date: endDate,
        is_all_day: isAllDay
      });
      
      toast({
        title: "Time off updated",
        description: "Successfully updated time off",
      });
      
      // Close the dialog
      editTimeOffDialog.closeDialog();
    } catch (error) {
      console.error('Error updating time off:', error);
      toast({
        title: "Error",
        description: "Failed to update time off. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handler for saving edited availability
  const handleSaveAvailability = async (id: string, startTime: string, endTime: string) => {
    try {
      // Get the availability to update
      const availabilityToUpdate = availability.find(a => a.id === id);
      
      if (!availabilityToUpdate) {
        throw new Error('Availability not found');
      }
      
      // Delete the old availability
      await deleteAvailability(id);
      
      // Add the updated availability
      await addAvailability({
        startTime,
        endTime,
        isRecurring: availabilityToUpdate.is_recurring,
        dayOfWeek: availabilityToUpdate.day_of_week,
        specificDate: availabilityToUpdate.specific_date
      });
      
      toast({
        title: "Availability updated",
        description: "Successfully updated availability",
      });
      
      // Close the dialog
      editAvailabilityDialog.closeDialog();
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: "Error",
        description: "Failed to update availability. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handler for confirming time off overlap action
  const handleTimeOffOverlapConfirm = async (action: 'replace' | 'merge') => {
    if (!overlapState.data || overlapState.type !== 'time-off') {
      return;
    }
    
    try {
      const data = overlapState.data as ExceptionFormValues;
      
      if (action === 'replace') {
        // Delete the overlapping exceptions
        for (const exception of overlapState.conflictingItems) {
          await deleteUnifiedException(exception.id);
        }
        
        // Add the new exception
        await addUnifiedException({
          ...data,
          skipOverlapCheck: true
        });
      } else if (action === 'merge') {
        // Merge the exceptions
        // For simplicity, we'll just merge the first overlapping exception
        const firstOverlap = overlapState.conflictingItems[0];
        
        // Calculate the merged time slot
        const mergedSlot = calculateMergedTimeOffSlot(
          data.startTime,
          data.endTime,
          firstOverlap.start_time,
          firstOverlap.end_time
        );
        
        // Update the first overlapping exception with the merged slot
        await updateUnifiedException(firstOverlap.id, {
          start_time: mergedSlot.startTime,
          end_time: mergedSlot.endTime,
          reason: data.reason || firstOverlap.reason
        });
        
        // Delete the other overlapping exceptions
        for (let i = 1; i < overlapState.conflictingItems.length; i++) {
          await deleteUnifiedException(overlapState.conflictingItems[i].id);
        }
      }
      
      toast({
        title: "Time off added",
        description: data.isRecurring
          ? "Added recurring time off"
          : `Added time off for ${formatDate(data.startDate)}${data.endDate ? ` to ${formatDate(data.endDate)}` : ''}`,
      });
      
      // Close the dialogs
      resetOverlapState();
      exceptionDialog.closeDialog();
    } catch (error) {
      console.error('Error handling time off overlap:', error);
      toast({
        title: "Error",
        description: "Failed to add time off. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to check if two time ranges overlap
  const checkTimeOverlap = (
    startTime1: string,
    endTime1: string,
    startTime2: string,
    endTime2: string
  ): boolean => {
    const start1 = timeToMinutes(startTime1);
    const end1 = timeToMinutes(endTime1);
    const start2 = timeToMinutes(startTime2);
    const end2 = timeToMinutes(endTime2);
    
    return (start1 < end2 && end1 > start2);
  };

  // Function to convert time string to minutes
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Your Availability</h1>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <Tabs defaultValue="weekly" className="w-full">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="weekly">Weekly View</TabsTrigger>
              <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <Button onClick={() => baseAvailabilityDialog.openDialog()} className="flex items-center bg-gray-900 hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Add Availability
              </Button>
              <Button onClick={() => timeOffManagerDialog.openDialog()} variant="outline" className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Manage Time Off
              </Button>
            </div>
          </div>
          
          <TabsContent value="weekly" className="mt-6">
            <WeeklyView
              availability={availability}
              exceptions={unifiedAvailability}
              onAddException={(date) => exceptionDialog.openDialog(date)}
              onDeleteException={handleDeleteException}
              onDeleteAvailability={deleteAvailability}
              formatDate={formatDate}
              onEditException={handleEditTimeOff}
              onEditAvailability={handleEditAvailability}
            />
          </TabsContent>
          
          <TabsContent value="calendar" className="mt-6">
            <UnifiedCalendarView
              availability={availability}
              exceptions={unifiedAvailability}
              onAddException={(date: Date) => exceptionDialog.openDialog(date)}
            />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Dialogs */}
      <BaseAvailabilityForm
        isOpen={baseAvailabilityDialog.isOpen}
        onOpenChange={(open) => open ? baseAvailabilityDialog.openDialog() : baseAvailabilityDialog.closeDialog()}
        onSubmit={onSubmitBase}
        checkForOverlaps={(formData) => {
          const { startTime, endTime, type, days, date } = formData;
          let hasOverlap = false;
          let overlapDays: string[] = [];
          
          if (type === 'recurring' && days) {
            // Check each selected day for overlaps
            for (const day of days) {
              const dayOfWeek = parseInt(day);
              if (checkForOverlaps(startTime, endTime, true, dayOfWeek)) {
                hasOverlap = true;
                overlapDays.push(day);
              }
            }
          } else if (type === 'specific' && date) {
            // Check specific date for overlaps
            const formattedDate = formatDateObject(date);
            hasOverlap = checkForOverlaps(startTime, endTime, false, undefined, formattedDate);
            if (hasOverlap) {
              overlapDays.push(date.getDay().toString());
            }
          }
          
          return { hasOverlap, overlapDays };
        }}
      />
      
      <TimeOffManager
        isOpen={timeOffManagerDialog.isOpen}
        onOpenChange={(open) => open ? timeOffManagerDialog.openDialog() : timeOffManagerDialog.closeDialog()}
        exceptions={unifiedAvailability}
        onDeleteException={handleDeleteException}
        onAddException={async (formData) => {
          try {
            // Track if this is part of a batch operation
            const isBatchOperation = formData.isBatchOperation;
            
            await onSubmitUnifiedException({
              ...formData,
              skipToast: isBatchOperation // Skip individual toasts for batch operations
            });
            
            // Only close dialog and show toast for the last operation in a batch
            if (!isBatchOperation) {
              timeOffManagerDialog.closeDialog();
            }
            
            return Promise.resolve();
          } catch (error) {
            console.error('Error adding time off:', error);
            return Promise.reject(error);
          }
        }}
      />
      
      <UnifiedExceptionDialog
        isOpen={exceptionDialog.isOpen}
        onOpenChange={(open) => open ? exceptionDialog.openDialog(exceptionDialog.data) : exceptionDialog.closeDialog()}
        onSubmit={onSubmitUnifiedException}
        specificDate={exceptionDialog.data || undefined}
      />
      
      <EditTimeOffDialog
        isOpen={editTimeOffDialog.isOpen}
        onOpenChange={(open) => open ? editTimeOffDialog.openDialog(editTimeOffDialog.data) : editTimeOffDialog.closeDialog()}
        exception={editTimeOffDialog.data}
        onSave={handleSaveTimeOff}
      />
      
      <EditAvailabilityDialog
        isOpen={editAvailabilityDialog.isOpen}
        onOpenChange={(open) => open ? editAvailabilityDialog.openDialog(editAvailabilityDialog.data) : editAvailabilityDialog.closeDialog()}
        availability={editAvailabilityDialog.data}
        onSave={handleSaveAvailability}
      />
      
      <OverlapDialog
        isOpen={overlapState.isOpen}
        onOpenChange={(open) => {
          if (!open) resetOverlapState();
        }}
        day={overlapState.type === 'availability' ? 'Selected days' : 'Selected dates'}
        type={overlapState.type}
        conflictingItems={overlapState.conflictingItems}
        newSlot={{ 
          startTime: overlapState.data?.startTime || '09:00', 
          endTime: overlapState.data?.endTime || '17:00' 
        }}
        existingSlot={{ 
          startTime: overlapState.conflictingItems.length > 0 ? overlapState.conflictingItems[0].start_time : '09:00', 
          endTime: overlapState.conflictingItems.length > 0 ? overlapState.conflictingItems[0].end_time : '17:00' 
        }}
        mergedSlot={
          overlapState.type === 'time-off' && overlapState.data && overlapState.conflictingItems.length > 0
            ? calculateMergedTimeOffSlot(
                overlapState.data.startTime,
                overlapState.data.endTime,
                overlapState.conflictingItems[0].start_time,
                overlapState.conflictingItems[0].end_time
              )
            : overlapState.type === 'availability' && overlapState.data && overlapState.conflictingItems.length > 0
            ? calculateMergedSlot(
                overlapState.data.startTime,
                overlapState.data.endTime,
                overlapState.conflictingItems[0].start_time,
                overlapState.conflictingItems[0].end_time
              )
            : { 
                startTime: '09:00', 
                endTime: '17:00' 
              }
        }
        onReplace={() => {
          if (overlapState.type === 'availability') {
            if (overlapState.data) {
              onSubmitBase(overlapState.data, true);
              resetOverlapState();
            }
          } else {
            handleTimeOffOverlapConfirm('replace');
          }
        }}
        onMerge={() => {
          if (overlapState.type === 'availability') {
            if (overlapState.data) {
              onSubmitBase(overlapState.data, true);
              resetOverlapState();
            }
          } else {
            handleTimeOffOverlapConfirm('merge');
          }
        }}
        onCancel={resetOverlapState}
      />
    </div>
  );
} 