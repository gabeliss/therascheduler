'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Clock } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { useUnifiedAvailability } from '@/app/hooks/use-unified-availability';
import { useTherapistAvailability, TherapistAvailability } from '@/app/hooks/use-therapist-availability';
import { BaseAvailabilityFormValues, ExceptionFormValues } from './utils/schemas';
import { formatDate, formatTime, checkTimeOverlap, DAYS_OF_WEEK } from './utils/time-utils';
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

export default function AvailabilityPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    unifiedAvailability,
    loading: exceptionsLoading,
    error: exceptionsError,
    addUnifiedException,
    deleteUnifiedException,
    updateUnifiedException,
    refreshAvailability: refreshExceptions
  } = useUnifiedAvailability();

  const {
    availability,
    loading: availabilityLoading,
    error: availabilityError,
    addAvailability,
    deleteAvailability,
    checkForOverlaps,
    refreshAvailability
  } = useTherapistAvailability();
  
  const [isBaseDialogOpen, setIsBaseDialogOpen] = useState(false);
  const [isTimeOffManagerOpen, setIsTimeOffManagerOpen] = useState(false);
  const { toast } = useToast();

  // State for the unified exception dialog
  const [unifiedExceptionDialogState, setUnifiedExceptionDialogState] = useState({
    isOpen: false,
    specificDate: undefined as Date | undefined
  });

  // State for submitting
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for overlap data
  const [overlapData, setOverlapData] = useState<{
    formData?: BaseAvailabilityFormValues;
    overlapDays: string[];
    existingSlots: { day: string, startTime: string, endTime: string }[];
    mergedSlots: { day: string, startTime: string, endTime: string }[];
  }>({
    overlapDays: [],
    existingSlots: [],
    mergedSlots: []
  });

  // State for showing overlap dialog
  const [showOverlapDialog, setShowOverlapDialog] = useState(false);

  // Calculate merged time off slot
  const calculateMergedTimeOffSlot = (
    newStartTime: string, 
    newEndTime: string, 
    existingStartTime: string, 
    existingEndTime: string
  ) => {
    return calculateMergedSlot(newStartTime, newEndTime, existingStartTime, existingEndTime);
  };

  // State for time off overlap data
  const [timeOffOverlapData, setTimeOffOverlapData] = useState<{
    formData?: ExceptionFormValues;
    overlapDays: string[];
    existingSlots: { day: string, startTime: string, endTime: string }[];
    mergedSlots: { day: string, startTime: string, endTime: string }[];
  }>({
    overlapDays: [],
    existingSlots: [],
    mergedSlots: []
  });

  // State for showing time off overlap dialog
  const [showTimeOffOverlapDialog, setShowTimeOffOverlapDialog] = useState(false);

  // State for edit time off dialog
  const [isEditTimeOffDialogOpen, setIsEditTimeOffDialogOpen] = useState(false);
  const [selectedTimeOffException, setSelectedTimeOffException] = useState<UnifiedAvailabilityException | null>(null);

  // State for edit availability dialog
  const [isEditAvailabilityDialogOpen, setIsEditAvailabilityDialogOpen] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState<TherapistAvailability | null>(null);

  // Helper function to calculate merged time slot
  const calculateMergedSlot = (
    newStartTime: string, 
    newEndTime: string, 
    existingStartTime: string, 
    existingEndTime: string
  ) => {
    // Convert times to minutes for easier comparison
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const newStart = timeToMinutes(newStartTime);
    const newEnd = timeToMinutes(newEndTime);
    const existingStart = timeToMinutes(existingStartTime);
    const existingEnd = timeToMinutes(existingEndTime);

    // Calculate the merged slot (earliest start, latest end)
    const mergedStart = Math.min(newStart, existingStart);
    const mergedEnd = Math.max(newEnd, existingEnd);

    // Convert back to time format
    const minutesToTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    return {
      startTime: minutesToTime(mergedStart),
      endTime: minutesToTime(mergedEnd)
    };
  };

  // Handle base availability submission
  const onSubmitBase = async (data: BaseAvailabilityFormValues, forceAdd = false) => {
    try {
      setIsSubmitting(true);
      
      // Handle recurring availability
      if (data.type === 'recurring') {
        // Ensure at least one day is selected
        if (!data.days || data.days.length === 0) {
          throw new Error('Please select at least one day of the week');
        }
        
        // Check for overlaps
        const overlappingDays: string[] = [];
        
        for (const day of data.days || []) {
          const dayIndex = DAYS_OF_WEEK.indexOf(day);
          if (dayIndex === -1) continue;
          
          const hasOverlap = checkForOverlaps(
            data.startTime,
            data.endTime,
            true,
            dayIndex
          );
          
          if (hasOverlap) {
            overlappingDays.push(day);
          }
        }
        
        // If there are overlaps and we're not forcing the add, show dialog
        if (overlappingDays.length > 0 && !forceAdd) {
          // Find existing slots for overlapping days
          const existingSlots: { day: string, startTime: string, endTime: string }[] = [];
          const mergedSlots: { day: string, startTime: string, endTime: string }[] = [];
          
          for (const day of overlappingDays) {
            const dayIndex = DAYS_OF_WEEK.indexOf(day);
            if (dayIndex === -1) continue;
            
            // Find all existing slots for this day
            const existingSlotsForDay = availability.filter(
              slot => slot.is_recurring && slot.day_of_week === dayIndex
            );
            
            // If there are multiple slots, find the one with the most overlap
            let bestMatch = existingSlotsForDay[0];
            
            if (existingSlotsForDay.length > 0) {
              existingSlots.push({
                day,
                startTime: bestMatch.start_time,
                endTime: bestMatch.end_time
              });
              
              // Calculate merged slot
              const mergedSlot = calculateMergedSlot(
                data.startTime,
                data.endTime,
                bestMatch.start_time,
                bestMatch.end_time
              );
              
              mergedSlots.push({
                day,
                startTime: mergedSlot.startTime,
                endTime: mergedSlot.endTime
              });
            }
          }
          
          setOverlapData({
            formData: data,
            overlapDays: overlappingDays,
            existingSlots,
            mergedSlots
          });
          setShowOverlapDialog(true);
          return;
        }
        
        // Add availability for all selected days
        for (const day of data.days || []) {
          const dayIndex = DAYS_OF_WEEK.indexOf(day);
          if (dayIndex === -1) continue;
          
          await addAvailability({
            startTime: data.startTime,
            endTime: data.endTime,
            isRecurring: true,
            dayOfWeek: dayIndex
          });
        }
      } else {
        // Handle specific date availability
        if (!data.date) {
          throw new Error('Please select a date');
        }

        // Check if the date is in the past
        const selectedDate = new Date(data.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          toast({
            title: "Cannot set availability in the past",
            description: "Please select a current or future date.",
            variant: "destructive"
          });
          return;
        }

        const formattedDate = format(data.date, 'yyyy-MM-dd');
        const dayOfWeek = data.date.getDay();
        
        // Check for overlaps with existing specific date availability
        const hasSpecificOverlap = availability.some(slot => {
          if (!slot.is_recurring && slot.specific_date === formattedDate) {
            return (
              (data.startTime >= slot.start_time && data.startTime < slot.end_time) ||
              (data.endTime > slot.start_time && data.endTime <= slot.end_time) ||
              (data.startTime <= slot.start_time && data.endTime >= slot.end_time)
            );
          }
          return false;
        });
        
        // If there's a specific date overlap, show the dialog
        if (hasSpecificOverlap && !forceAdd) {
          // Find existing specific date slots
          const specificDateSlots = availability.filter(
            slot => !slot.is_recurring && slot.specific_date === formattedDate
          );
          
          const existingSlots: { day: string, startTime: string, endTime: string }[] = [];
          const mergedSlots: { day: string, startTime: string, endTime: string }[] = [];
          const dayName = format(data.date, 'EEEE');
          
          if (specificDateSlots.length > 0) {
            // Use the first slot as the existing slot
            const bestMatch = specificDateSlots[0];
            
            existingSlots.push({
              day: dayName,
              startTime: bestMatch.start_time,
              endTime: bestMatch.end_time
            });
            
            // Calculate merged slot
            const mergedSlot = calculateMergedSlot(
              data.startTime,
              data.endTime,
              bestMatch.start_time,
              bestMatch.end_time
            );
            
            mergedSlots.push({
              day: dayName,
              startTime: mergedSlot.startTime,
              endTime: mergedSlot.endTime
            });
          }
          
          setOverlapData({
            formData: data,
            overlapDays: [dayName],
            existingSlots,
            mergedSlots
          });
          setShowOverlapDialog(true);
          return;
        }
        
        // For specific date vs recurring conflicts, we don't need to show the dialog
        // Specific date availability always overrides recurring availability
        
        // Add the specific date availability
        await addAvailability({
          startTime: data.startTime,
          endTime: data.endTime,
          isRecurring: false,
          specificDate: formattedDate
        });
      }
      
      // Close the dialog and show success message
      setIsBaseDialogOpen(false);
      toast({
        title: "Availability added",
        description: "Your availability has been successfully added.",
      });
    } catch (error) {
      console.error('Error adding availability:', error);
      toast({
        title: "Error adding availability",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle exception submission with unified model
  const onSubmitUnifiedException = async (data: ExceptionFormValues) => {
    try {
      // For specific date exceptions, check if the date is in the past
      if (!data.isRecurring && data.specificDate) {
        const specificDateObj = new Date(data.specificDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (specificDateObj < today) {
          toast({
            title: "Cannot set time off in the past",
            description: "Please select a current or future date.",
            variant: "destructive"
          });
          return;
        }
      }
      
      // Check for overlaps
      let hasOverlap = false;
      const overlappingDays: string[] = [];
      const existingSlots: { day: string, startTime: string, endTime: string }[] = [];
      const mergedSlots: { day: string, startTime: string, endTime: string }[] = [];
      
      if (data.isRecurring && data.dayOfWeek !== undefined) {
        // Check for recurring time off overlaps
        const dayName = DAYS_OF_WEEK[data.dayOfWeek];
        
        // Find existing recurring time off for this day
        const existingTimeOff = unifiedAvailability.filter(
          ex => ex.is_recurring && ex.day_of_week === data.dayOfWeek
        );
        
        if (existingTimeOff.length > 0) {
          hasOverlap = true;
          overlappingDays.push(dayName);
          
          // Use the first slot as the existing slot (we could be more sophisticated here)
          const bestMatch = existingTimeOff[0];
          
          existingSlots.push({
            day: dayName,
            startTime: bestMatch.start_time,
            endTime: bestMatch.end_time
          });
          
          // Calculate merged slot
          const mergedSlot = calculateMergedTimeOffSlot(
            data.startTime,
            data.endTime,
            bestMatch.start_time,
            bestMatch.end_time
          );
          
          mergedSlots.push({
            day: dayName,
            startTime: mergedSlot.startTime,
            endTime: mergedSlot.endTime
          });
        }
      } else if (!data.isRecurring && data.specificDate) {
        // Check for specific date time off overlaps
        const specificDate = new Date(data.specificDate);
        const dayName = format(specificDate, 'EEEE');
        
        // Find existing specific date time off
        const existingSpecificTimeOff = unifiedAvailability.filter(
          ex => !ex.is_recurring && ex.specific_date === data.specificDate
        );
        
        if (existingSpecificTimeOff.length > 0) {
          hasOverlap = true;
          overlappingDays.push(dayName);
          
          // Use the first slot as the existing slot
          const bestMatch = existingSpecificTimeOff[0];
          
          existingSlots.push({
            day: dayName,
            startTime: bestMatch.start_time,
            endTime: bestMatch.end_time
          });
          
          // Calculate merged slot
          const mergedSlot = calculateMergedTimeOffSlot(
            data.startTime,
            data.endTime,
            bestMatch.start_time,
            bestMatch.end_time
          );
          
          mergedSlots.push({
            day: dayName,
            startTime: mergedSlot.startTime,
            endTime: mergedSlot.endTime
          });
        }
        
        // For specific date vs recurring conflicts, we don't need to show the dialog
        // Specific date time off always overrides recurring time off
      }
      
      // If there are overlaps, show the overlap dialog
      if (hasOverlap) {
        setTimeOffOverlapData({
          formData: data,
          overlapDays: overlappingDays,
          existingSlots,
          mergedSlots
        });
        setShowTimeOffOverlapDialog(true);
        return;
      }
      
      // If no overlaps, add the time off exception
      await addUnifiedException(data);
      
      toast({
        title: "Time off added",
        description: "Your time off has been successfully added.",
      });
    } catch (error) {
      console.error('Error adding time off:', error);
      toast({
        title: "Error adding time off",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive"
      });
    }
  };

  // Handle delete exception
  const handleDeleteException = async (id: string) => {
    try {
      await deleteUnifiedException(id);
      
      toast({
        title: "Time off deleted",
        description: "Your time off has been deleted successfully.",
      });
    } catch (err) {
      console.error('Error deleting time off:', err);
      toast({
        title: "Error deleting time off",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  // Function to handle editing time off
  const handleEditTimeOff = (exception: UnifiedAvailabilityException) => {
    console.log('handleEditTimeOff called with exception:', exception);
    setSelectedTimeOffException(exception);
    setIsEditTimeOffDialogOpen(true);
  };

  // Function to handle editing availability
  const handleEditAvailability = (availability: TherapistAvailability) => {
    console.log('handleEditAvailability called with availability:', availability);
    setSelectedAvailability(availability);
    setIsEditAvailabilityDialogOpen(true);
  };

  // Function to save edited time off
  const handleSaveTimeOff = async (id: string, startTime: string, endTime: string, reason: string) => {
    try {
      await updateUnifiedException(id, {
        start_time: startTime,
        end_time: endTime,
        reason
      });
      
      toast({
        title: "Time off updated",
        description: "Your time off has been successfully updated.",
      });
      
      // Refresh the data
      await refreshExceptions();
    } catch (error) {
      console.error('Error updating time off:', error);
      toast({
        title: "Error updating time off",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive"
      });
      throw error;
    }
  };

  // Function to save edited availability
  const handleSaveAvailability = async (id: string, startTime: string, endTime: string) => {
    try {
      // Find the availability to update
      const availabilityToUpdate = availability.find(a => a.id === id);
      if (!availabilityToUpdate) {
        throw new Error('Availability not found');
      }
      
      // Delete the existing availability
      await deleteAvailability(id);
      
      // Wait a moment to ensure the deletion is processed
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
        description: "Your availability has been successfully updated.",
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: "Error updating availability",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive"
      });
      throw error;
    }
  };

  // If auth is still loading, show a loading spinner
  if (authLoading) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Availability</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show a sign-in button
  if (!user) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Availability</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Authentication Error</p>
          <p className="mt-2">You need to be signed in to access this page.</p>
          <div className="mt-4">
            <Button asChild>
              <a href="/auth/login">Sign In</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If there's an error from either hook, show it
  if (exceptionsError || availabilityError) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Availability</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Error</p>
          <p className="mt-2">{exceptionsError || availabilityError}</p>
        </div>
      </div>
    );
  }

  const loading = exceptionsLoading || availabilityLoading;

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Availability</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsBaseDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Availability
          </Button>
          <Button variant="outline" onClick={() => setIsTimeOffManagerOpen(true)}>
            <Clock className="h-4 w-4 mr-2" />
            Manage Time Off
          </Button>
        </div>
      </div>

      <Tabs defaultValue="weekly" className="space-y-6">
        <TabsList>
          <TabsTrigger value="weekly">Weekly View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="weekly">
          <div className="space-y-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div>
                {availability.length === 0 && unifiedAvailability.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg">
                    <h3 className="text-lg font-medium">No availability set</h3>
                    <p className="text-gray-500 mt-2">
                      Click "Add Availability" to set your schedule.
                    </p>
                  </div>
                ) : (
                  <WeeklyView 
                    availability={availability}
                    exceptions={unifiedAvailability}
                    onAddException={(date: Date) => {
                      setUnifiedExceptionDialogState({
                        isOpen: true,
                        specificDate: date
                      });
                    }}
                    onDeleteException={handleDeleteException}
                    onDeleteAvailability={deleteAvailability}
                    formatDate={formatDate}
                    onEditException={handleEditTimeOff}
                    onEditAvailability={handleEditAvailability}
                  />
                )}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="calendar">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <UnifiedCalendarView 
              availability={availability}
              unifiedExceptions={unifiedAvailability} 
              onTimeSlotClick={(date, timeSlot) => {
                setUnifiedExceptionDialogState({
                  isOpen: true,
                  specificDate: date
                });
              }}
              onEditException={handleEditTimeOff}
              onEditAvailability={handleEditAvailability}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Base Availability Form */}
      <BaseAvailabilityForm
        isOpen={isBaseDialogOpen}
        onOpenChange={setIsBaseDialogOpen}
        onSubmit={onSubmitBase}
        onOverlapDetected={(formData) => {
          // Handle overlap detection
          console.log("Overlap detected", formData);
        }}
      />
      
      {/* Unified Exception Dialog */}
      <UnifiedExceptionDialog
        isOpen={unifiedExceptionDialogState.isOpen}
        onOpenChange={(open) => setUnifiedExceptionDialogState(prev => ({ ...prev, isOpen: open }))}
        specificDate={unifiedExceptionDialogState.specificDate}
        onSubmit={onSubmitUnifiedException}
      />
      
      {/* Time Off Manager */}
      <TimeOffManager
        isOpen={isTimeOffManagerOpen}
        onOpenChange={setIsTimeOffManagerOpen}
        exceptions={unifiedAvailability}
        onDeleteException={handleDeleteException}
        onAddException={onSubmitUnifiedException}
      />

      {/* Overlap Dialog */}
      <OverlapDialog
        isOpen={showOverlapDialog}
        onOpenChange={(open) => setShowOverlapDialog(open)}
        day={overlapData.overlapDays.join(', ')}
        newSlot={{ 
          startTime: overlapData.formData?.startTime || '09:00', 
          endTime: overlapData.formData?.endTime || '17:00' 
        }}
        existingSlot={{ 
          startTime: overlapData.existingSlots.length > 0 ? overlapData.existingSlots[0].startTime : '09:00', 
          endTime: overlapData.existingSlots.length > 0 ? overlapData.existingSlots[0].endTime : '17:00' 
        }}
        mergedSlot={{ 
          startTime: overlapData.mergedSlots.length > 0 ? overlapData.mergedSlots[0].startTime : '09:00', 
          endTime: overlapData.mergedSlots.length > 0 ? overlapData.mergedSlots[0].endTime : '17:00' 
        }}
        onCancel={() => {
          // Do nothing, just close the dialog
          setShowOverlapDialog(false);
        }}
        onReplace={async () => {
          if (!overlapData.formData) return;
          
          try {
            setIsSubmitting(true);
            
            if (overlapData.formData.type === 'recurring') {
              // For recurring availability, delete existing slots for the selected days
              for (const day of overlapData.formData.days || []) {
                const dayIndex = DAYS_OF_WEEK.indexOf(day);
                if (dayIndex === -1) continue;
                
                // Find existing recurring availability for this day
                const existingSlots = availability.filter(
                  slot => slot.is_recurring && slot.day_of_week === dayIndex
                );
                
                // Delete existing slots
                for (const slot of existingSlots) {
                  await deleteAvailability(slot.id);
                }
                
                // Add new availability
                await addAvailability({
                  startTime: overlapData.formData.startTime,
                  endTime: overlapData.formData.endTime,
                  isRecurring: true,
                  dayOfWeek: dayIndex
                });
              }
            } else if (overlapData.formData.date) {
              // For specific date availability
              const formattedDate = format(overlapData.formData.date, 'yyyy-MM-dd');
              const dayOfWeek = overlapData.formData.date.getDay();
              
              // Find existing specific date availability
              const existingSpecificSlots = availability.filter(
                slot => !slot.is_recurring && slot.specific_date === formattedDate
              );
              
              // Delete existing specific date slots
              for (const slot of existingSpecificSlots) {
                await deleteAvailability(slot.id);
              }
              
              // If there's a recurring availability for this day, we need to handle it
              // For specific date vs recurring, we'll create a specific date entry
              // that overrides the recurring one
              
              // Add new specific date availability
              await addAvailability({
                startTime: overlapData.formData.startTime,
                endTime: overlapData.formData.endTime,
                isRecurring: false,
                specificDate: formattedDate
              });
            }
            
            toast({
              title: "Availability updated",
              description: "Your availability has been successfully updated.",
            });
          } catch (error) {
            console.error('Error updating availability:', error);
            toast({
              title: "Error updating availability",
              description: error instanceof Error ? error.message : 'An unknown error occurred',
              variant: "destructive"
            });
          } finally {
            setIsSubmitting(false);
          }
        }}
        onMerge={async () => {
          if (!overlapData.formData || overlapData.mergedSlots.length === 0) return;
          
          try {
            setIsSubmitting(true);
            
            if (overlapData.formData.type === 'recurring') {
              // For recurring availability, delete existing slots and add merged ones
              for (const day of overlapData.formData.days || []) {
                const dayIndex = DAYS_OF_WEEK.indexOf(day);
                if (dayIndex === -1) continue;
                
                // Find the merged slot for this day
                const mergedSlot = overlapData.mergedSlots.find(slot => slot.day === day);
                if (!mergedSlot) continue;
                
                // Find existing recurring availability for this day
                const existingSlots = availability.filter(
                  slot => slot.is_recurring && slot.day_of_week === dayIndex
                );
                
                // Delete existing slots
                for (const slot of existingSlots) {
                  await deleteAvailability(slot.id);
                }
                
                // Add merged availability
                await addAvailability({
                  startTime: mergedSlot.startTime,
                  endTime: mergedSlot.endTime,
                  isRecurring: true,
                  dayOfWeek: dayIndex
                });
              }
            } else if (overlapData.formData.date) {
              // For specific date availability
              const formattedDate = format(overlapData.formData.date, 'yyyy-MM-dd');
              const dayOfWeek = overlapData.formData.date.getDay();
              const dayName = format(overlapData.formData.date, 'EEEE');
              
              // Find the merged slot
              const mergedSlot = overlapData.mergedSlots.find(slot => slot.day === dayName);
              if (!mergedSlot) return;
              
              // Find existing specific date availability
              const existingSpecificSlots = availability.filter(
                slot => !slot.is_recurring && slot.specific_date === formattedDate
              );
              
              // Delete existing specific date slots
              for (const slot of existingSpecificSlots) {
                await deleteAvailability(slot.id);
              }
              
              // Add merged specific date availability
              await addAvailability({
                startTime: mergedSlot.startTime,
                endTime: mergedSlot.endTime,
                isRecurring: false,
                specificDate: formattedDate
              });
            }
            
            toast({
              title: "Availability merged",
              description: "Your availability has been successfully merged.",
            });
          } catch (error) {
            console.error('Error merging availability:', error);
            toast({
              title: "Error merging availability",
              description: error instanceof Error ? error.message : 'An unknown error occurred',
              variant: "destructive"
            });
          } finally {
            setIsSubmitting(false);
          }
        }}
      />

      {/* Time Off Overlap Dialog */}
      <OverlapDialog
        isOpen={showTimeOffOverlapDialog}
        onOpenChange={(open) => setShowTimeOffOverlapDialog(open)}
        day={timeOffOverlapData.overlapDays.join(', ')}
        newSlot={{ 
          startTime: timeOffOverlapData.formData?.startTime || '09:00', 
          endTime: timeOffOverlapData.formData?.endTime || '17:00' 
        }}
        existingSlot={{ 
          startTime: timeOffOverlapData.existingSlots.length > 0 ? timeOffOverlapData.existingSlots[0].startTime : '09:00', 
          endTime: timeOffOverlapData.existingSlots.length > 0 ? timeOffOverlapData.existingSlots[0].endTime : '17:00' 
        }}
        mergedSlot={{ 
          startTime: timeOffOverlapData.mergedSlots.length > 0 ? timeOffOverlapData.mergedSlots[0].startTime : '09:00', 
          endTime: timeOffOverlapData.mergedSlots.length > 0 ? timeOffOverlapData.mergedSlots[0].endTime : '17:00' 
        }}
        onCancel={() => {
          // Do nothing, just close the dialog
          setShowTimeOffOverlapDialog(false);
        }}
        onReplace={async () => {
          if (!timeOffOverlapData.formData) return;
          
          try {
            setIsSubmitting(true);
            
            if (timeOffOverlapData.formData.isRecurring && timeOffOverlapData.formData.dayOfWeek !== undefined) {
              // For recurring time off, delete existing slots for the selected day
              // Find existing recurring time off for this day
              const existingTimeOff = unifiedAvailability.filter(
                ex => ex.is_recurring && ex.day_of_week === timeOffOverlapData.formData!.dayOfWeek
              );
              
              // Delete existing slots
              for (const ex of existingTimeOff) {
                await deleteUnifiedException(ex.id);
              }
              
              // Wait a moment to ensure the deletion is processed
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Add new time off
              await addUnifiedException(timeOffOverlapData.formData);
            } else if (!timeOffOverlapData.formData.isRecurring && timeOffOverlapData.formData.specificDate) {
              // For specific date time off
              // Find existing specific date time off
              const existingSpecificTimeOff = unifiedAvailability.filter(
                ex => !ex.is_recurring && ex.specific_date === timeOffOverlapData.formData!.specificDate
              );
              
              // Delete existing specific date slots
              for (const ex of existingSpecificTimeOff) {
                await deleteUnifiedException(ex.id);
              }
              
              // Wait a moment to ensure the deletion is processed
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Add new specific date time off
              await addUnifiedException(timeOffOverlapData.formData);
            }
            
            toast({
              title: "Time off updated",
              description: "Your time off has been successfully updated.",
            });
            
            // Close the dialog
            setShowTimeOffOverlapDialog(false);
            
            // Refresh the data
            await refreshExceptions();
          } catch (error) {
            console.error('Error updating time off:', error);
            toast({
              title: "Error updating time off",
              description: error instanceof Error ? error.message : 'An unknown error occurred',
              variant: "destructive"
            });
          } finally {
            setIsSubmitting(false);
          }
        }}
        onMerge={async () => {
          if (!timeOffOverlapData.formData || timeOffOverlapData.mergedSlots.length === 0) return;
          
          try {
            setIsSubmitting(true);
            
            if (timeOffOverlapData.formData.isRecurring && timeOffOverlapData.formData.dayOfWeek !== undefined) {
              // For recurring time off, delete existing slots and add merged ones
              // Find the merged slot for this day
              const mergedSlot = timeOffOverlapData.mergedSlots[0];
              
              // Find existing recurring time off for this day
              const existingTimeOff = unifiedAvailability.filter(
                ex => ex.is_recurring && ex.day_of_week === timeOffOverlapData.formData!.dayOfWeek
              );
              
              // Delete existing slots
              for (const ex of existingTimeOff) {
                await deleteUnifiedException(ex.id);
              }
              
              // Wait a moment to ensure the deletion is processed
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Add merged time off
              await addUnifiedException({
                ...timeOffOverlapData.formData,
                startTime: mergedSlot.startTime,
                endTime: mergedSlot.endTime
              });
            } else if (!timeOffOverlapData.formData.isRecurring && timeOffOverlapData.formData.specificDate) {
              // For specific date time off
              // Find the merged slot
              const mergedSlot = timeOffOverlapData.mergedSlots[0];
              
              // Find existing specific date time off
              const existingSpecificTimeOff = unifiedAvailability.filter(
                ex => !ex.is_recurring && ex.specific_date === timeOffOverlapData.formData!.specificDate
              );
              
              // Delete existing specific date slots
              for (const ex of existingSpecificTimeOff) {
                await deleteUnifiedException(ex.id);
              }
              
              // Wait a moment to ensure the deletion is processed
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Add merged specific date time off
              await addUnifiedException({
                ...timeOffOverlapData.formData,
                startTime: mergedSlot.startTime,
                endTime: mergedSlot.endTime
              });
            }
            
            toast({
              title: "Time off merged",
              description: "Your time off has been successfully merged.",
            });
            
            // Close the dialog
            setShowTimeOffOverlapDialog(false);
            
            // Refresh the data
            await refreshExceptions();
          } catch (error) {
            console.error('Error merging time off:', error);
            toast({
              title: "Error merging time off",
              description: error instanceof Error ? error.message : 'An unknown error occurred',
              variant: "destructive"
            });
          } finally {
            setIsSubmitting(false);
          }
        }}
      />

      {/* Edit Time Off Dialog */}
      <EditTimeOffDialog
        isOpen={isEditTimeOffDialogOpen}
        onOpenChange={(open) => setIsEditTimeOffDialogOpen(open)}
        exception={selectedTimeOffException}
        onSave={handleSaveTimeOff}
      />

      {/* Edit Availability Dialog */}
      <EditAvailabilityDialog
        isOpen={isEditAvailabilityDialogOpen}
        onOpenChange={setIsEditAvailabilityDialogOpen}
        availability={selectedAvailability}
        onSave={handleSaveAvailability}
      />
    </div>
  );
} 