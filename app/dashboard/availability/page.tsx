'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Clock } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { useHierarchicalAvailability } from '@/app/hooks/use-hierarchical-availability';
import { BaseAvailabilityFormValues, ExceptionFormValues } from './utils/schemas';
import { formatDate, formatTime, checkTimeOverlap, DAYS_OF_WEEK } from './utils/time-utils';
import { convertBaseToAPIFormat, convertToUIFormat, HierarchicalItem } from './utils/types';
import BaseAvailabilityForm from './components/BaseAvailabilityForm';
import ExceptionDialog from './components/ExceptionDialog';
import WeeklyView from './components/WeeklyView';
import { HierarchicalAvailability as OriginalHierarchicalAvailability } from '@/app/types';
import CalendarView from './calendar-view';
import OverlapDialog from './components/OverlapDialog';
import TimeOffManager from './components/TimeOffManager';
import { format } from 'date-fns';

export default function AvailabilityPage() {
  const { 
    hierarchicalAvailability, 
    loading, 
    error, 
    addBaseAvailability, 
    addAvailabilityException,
    deleteBaseAvailability,
    deleteAvailabilityException,
    refreshAvailability
  } = useHierarchicalAvailability();
  
  const [isBaseDialogOpen, setIsBaseDialogOpen] = useState(false);
  const [isTimeOffManagerOpen, setIsTimeOffManagerOpen] = useState(false);
  const { toast } = useToast();

  // Add this state for the exception dialog
  const [exceptionDialogState, setExceptionDialogState] = useState({
    isOpen: false,
    baseId: null as string | null,
    baseStartTime: '',
    baseEndTime: '',
    specificDate: undefined as Date | undefined
  });

  // New state for overlap dialog
  const [overlapDialogState, setOverlapDialogState] = useState<{
    isOpen: boolean;
    day: string;
    newSlot: { startTime: string; endTime: string };
    existingSlot: { startTime: string; endTime: string };
    mergedSlot: { startTime: string; endTime: string };
    onMerge: () => Promise<void>;
    onReplace: () => Promise<void>;
    formData?: BaseAvailabilityFormValues;
  }>({
    isOpen: false,
    day: '',
    newSlot: { startTime: '', endTime: '' },
    existingSlot: { startTime: '', endTime: '' },
    mergedSlot: { startTime: '', endTime: '' },
    onMerge: async () => {},
    onReplace: async () => {},
  });

  // Convert API data to UI format
  const uiFormattedAvailability: HierarchicalItem[] = hierarchicalAvailability.map(convertToUIFormat);

  // Check for overlaps in availability
  const checkForOverlaps = (formData: BaseAvailabilityFormValues): { hasOverlap: boolean, overlapDays: string[] } => {
    const overlapDays: string[] = [];
    let hasOverlap = false;

    // Check for overlaps in recurring availability
    if (formData.type === 'recurring' && formData.days && formData.days.length > 0) {
      formData.days.forEach(day => {
        // Check against other recurring availability
        const dayAvailability = uiFormattedAvailability.filter(
          item => item.base.type === 'recurring' && item.base.day === day
        );

        dayAvailability.forEach(item => {
          if (checkTimeOverlap(
            formData.startTime,
            formData.endTime,
            item.base.start_time,
            item.base.end_time
          )) {
            hasOverlap = true;
            if (!overlapDays.includes(day)) {
              overlapDays.push(day);
            }
          }
        });
        
        // Also check against specific dates that fall on this day of the week
        const specificDateAvailability = uiFormattedAvailability.filter(item => {
          if (item.base.type === 'specific' && item.base.date) {
            // Convert the specific date to a day of the week
            const date = new Date(item.base.date);
            const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
            return dayOfWeek === day;
          }
          return false;
        });
        
        specificDateAvailability.forEach(item => {
          if (checkTimeOverlap(
            formData.startTime,
            formData.endTime,
            item.base.start_time,
            item.base.end_time
          )) {
            hasOverlap = true;
            if (!overlapDays.includes(day)) {
              overlapDays.push(`${day} (${formatDate(item.base.date)})`);
            }
          }
        });
      });
    } 
    // Check for overlaps in specific date availability
    else if (formData.type === 'specific' && formData.date) {
      const specificDateStr = formData.date.toISOString().split('T')[0]; // Get just the date part
      
      // Check against other specific dates
      const dateAvailability = uiFormattedAvailability.filter(
        item => item.base.type === 'specific' && 
               item.base.date && 
               item.base.date.startsWith(specificDateStr)
      );
      
      dateAvailability.forEach(item => {
        if (checkTimeOverlap(
          formData.startTime,
          formData.endTime,
          item.base.start_time,
          item.base.end_time
        )) {
          hasOverlap = true;
          const formattedDate = formatDate(item.base.date);
          if (!overlapDays.includes(formattedDate)) {
            overlapDays.push(formattedDate);
          }
        }
      });
      
      // Also check against recurring availability for the day of the week
      const date = new Date(formData.date);
      const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
      
      const recurringAvailability = uiFormattedAvailability.filter(
        item => item.base.type === 'recurring' && item.base.day === dayOfWeek
      );
      
      recurringAvailability.forEach(item => {
        if (checkTimeOverlap(
          formData.startTime,
          formData.endTime,
          item.base.start_time,
          item.base.end_time
        )) {
          hasOverlap = true;
          if (!overlapDays.includes(dayOfWeek)) {
            overlapDays.push(`${formatDate(formData.date?.toISOString())} (${dayOfWeek})`);
          }
        }
      });
    }

    return { hasOverlap, overlapDays };
  };

  // Handle base availability submission
  const onSubmitBase = async (data: BaseAvailabilityFormValues, forceAdd = false) => {
    try {
      if (data.type === 'recurring' && data.days) {
        // Add recurring availability for each selected day
        for (const day of data.days) {
          try {
            // Check for overlaps first
            const dayAvailability = uiFormattedAvailability.filter(
              item => item.base.type === 'recurring' && item.base.day === day
            );
            
            let overlappingSlot = null;
            for (const item of dayAvailability) {
              if (checkTimeOverlap(
                data.startTime,
                data.endTime,
                item.base.start_time,
                item.base.end_time
              )) {
                overlappingSlot = item;
                break;
              }
            }
            
            if (overlappingSlot && !forceAdd) {
              // Calculate merged slot times
              const mergedStartTime = data.startTime < overlappingSlot.base.start_time ? 
                data.startTime : overlappingSlot.base.start_time;
              const mergedEndTime = data.endTime > overlappingSlot.base.end_time ? 
                data.endTime : overlappingSlot.base.end_time;
              
              // Set up merge function
              const handleMerge = async () => {
                // Delete the old slot
                await deleteBaseAvailability(overlappingSlot.base.id);
                
                // Create new merged slot
                const apiData = convertBaseToAPIFormat({
                  type: 'recurring',
                  day,
                  startTime: mergedStartTime,
                  endTime: mergedEndTime,
                });
                
                await addBaseAvailability({
                  ...apiData,
                  forceAdd: true
                });
              };
              
              // Set up replace function
              const handleReplace = async () => {
                // Delete the old slot
                await deleteBaseAvailability(overlappingSlot.base.id);
                
                // Add the new slot
                const apiData = convertBaseToAPIFormat({
                  type: 'recurring',
                  day,
                  startTime: data.startTime,
                  endTime: data.endTime,
                });
                
                await addBaseAvailability({
                  ...apiData,
                  forceAdd: true
                });
              };
              
              // Open the overlap dialog
              setOverlapDialogState({
                isOpen: true,
                day,
                newSlot: { startTime: data.startTime, endTime: data.endTime },
                existingSlot: { startTime: overlappingSlot.base.start_time, endTime: overlappingSlot.base.end_time },
                mergedSlot: { startTime: mergedStartTime, endTime: mergedEndTime },
                onMerge: handleMerge,
                onReplace: handleReplace,
                formData: data
              });
              
              // Skip to next day
              continue;
            }
            
            // Normal add flow
            const apiData = convertBaseToAPIFormat({
              type: 'recurring',
              day,
              startTime: data.startTime,
              endTime: data.endTime,
            });
            
            await addBaseAvailability({
              ...apiData,
              forceAdd: true // Always force add here since we've handled overlaps above
            });
          } catch (error) {
            console.error(`Error adding availability for ${day}:`, error);
            toast({
              variant: "destructive",
              title: `Error adding availability for ${day}`,
              description: error instanceof Error ? error.message : "An unknown error occurred",
            });
            // Continue with the next day
          }
        }
      } else if (data.type === 'specific' && data.date) {
        // Add specific date availability
        try {
          // Check for overlaps first for specific dates
          const specificDateStr = data.date.toISOString().split('T')[0]; // Get just the date part
          const dateAvailability = uiFormattedAvailability.filter(
            item => item.base.type === 'specific' && 
                   item.base.date && 
                   item.base.date.startsWith(specificDateStr)
          );
          
          let overlappingSlot = null;
          for (const item of dateAvailability) {
            if (checkTimeOverlap(
              data.startTime,
              data.endTime,
              item.base.start_time,
              item.base.end_time
            )) {
              overlappingSlot = item;
              break;
            }
          }
          
          if (overlappingSlot && !forceAdd) {
            // Calculate merged slot times
            const mergedStartTime = data.startTime < overlappingSlot.base.start_time ? 
              data.startTime : overlappingSlot.base.start_time;
            const mergedEndTime = data.endTime > overlappingSlot.base.end_time ? 
              data.endTime : overlappingSlot.base.end_time;
            
            // Set up merge function
            const handleMerge = async () => {
              // Delete the old slot
              await deleteBaseAvailability(overlappingSlot.base.id);
              
              // Create new merged slot
              const apiData = convertBaseToAPIFormat({
                type: 'specific',
                date: data.date?.toISOString() || new Date().toISOString(),
                startTime: mergedStartTime,
                endTime: mergedEndTime,
              });
              
              await addBaseAvailability({
                ...apiData,
                forceAdd: true
              });
            };
            
            // Set up replace function
            const handleReplace = async () => {
              // Delete the old slot
              await deleteBaseAvailability(overlappingSlot.base.id);
              
              // Add the new slot
              const apiData = convertBaseToAPIFormat({
                type: 'specific',
                date: data.date?.toISOString() || new Date().toISOString(),
                startTime: data.startTime,
                endTime: data.endTime,
              });
              
              await addBaseAvailability({
                ...apiData,
                forceAdd: true
              });
            };
            
            // Format the date for display
            const formattedDate = formatDate(overlappingSlot.base.date);
            
            // Open the overlap dialog
            setOverlapDialogState({
              isOpen: true,
              day: formattedDate,
              newSlot: { startTime: data.startTime, endTime: data.endTime },
              existingSlot: { startTime: overlappingSlot.base.start_time, endTime: overlappingSlot.base.end_time },
              mergedSlot: { startTime: mergedStartTime, endTime: mergedEndTime },
              onMerge: handleMerge,
              onReplace: handleReplace,
              formData: data
            });
            
            // Skip to refresh
            return;
          }
          
          const apiData = convertBaseToAPIFormat({
            type: 'specific',
            date: data.date.toISOString(),
            startTime: data.startTime,
            endTime: data.endTime,
          });
          
          // Add forceAdd parameter
          await addBaseAvailability({
            ...apiData,
            forceAdd: true // Always force add here since we've handled overlaps above
          });
        } catch (error) {
          console.error('Error adding specific date availability:', error);
          toast({
            variant: "destructive",
            title: "Error adding availability",
            description: error instanceof Error ? error.message : "An unknown error occurred",
          });
        }
      }
      
      // Refresh data after adding availability
      await refreshAvailability();
      toast({
        title: "Availability added",
        description: "Your availability has been successfully added.",
      });
    } catch (error) {
      console.error('Error adding availability:', error);
      toast({
        variant: "destructive",
        title: "Error adding availability",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  // Handle exception submission for specific date
  const onSubmitException = async (data: ExceptionFormValues) => {
    if (!exceptionDialogState.baseId) {
      throw new Error('No time slot selected. Please try again.');
    }
    
    try {
      await addAvailabilityException({
        baseAvailabilityId: exceptionDialogState.baseId,
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
        isSpecificDate: !!exceptionDialogState.specificDate && !data.isRecurring,
        specificDate: data.isRecurring ? undefined : exceptionDialogState.specificDate,
        isRecurring: data.isRecurring
      });
      
      await refreshAvailability();
      
      toast({
        title: exceptionDialogState.specificDate && !data.isRecurring 
          ? "Time blocked" 
          : data.isRecurring 
            ? "Recurring time off saved"
            : "Time off saved",
        description: exceptionDialogState.specificDate && !data.isRecurring 
          ? "Your time has been blocked for this specific date." 
          : data.isRecurring
            ? "Your recurring time off has been added successfully."
            : "Your time off has been added successfully.",
      });
    } catch (err) {
      console.error('Error saving time off:', err);
      toast({
        title: "Error saving time off",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Handle recurring time off submission
  const onSubmitRecurringTimeOff = async (data: any) => {
    try {
      // For each selected day, find a base availability and add an exception
      for (const day of data.days) {
        // Find base availability for this day
        const baseAvailForDay = uiFormattedAvailability.find(
          item => item.base.type === 'recurring' && item.base.day === day
        );
        
        if (!baseAvailForDay) {
          throw new Error(`No availability set for ${day}. Please set availability first.`);
        }
        
        // Add exception for this day
        await addAvailabilityException({
          baseAvailabilityId: baseAvailForDay.base.id,
          startTime: data.startTime,
          endTime: data.endTime,
          reason: data.reason,
          isRecurring: true
        });
      }
      
      await refreshAvailability();
      
      toast({
        title: "Regular break saved",
        description: `Your regular break has been added for ${data.days.length} day(s).`,
      });
    } catch (err) {
      console.error('Error saving regular break:', err);
      toast({
        title: "Error saving regular break",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Handle one-time time off submission
  const onSubmitOneTimeTimeOff = async (data: any) => {
    try {
      // Get all dates in the range
      const dates: Date[] = [];
      const currentDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // For each date, find a base availability and add an exception
      for (const date of dates) {
        const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
        
        // Find base availability for this day
        const baseAvailForDay = uiFormattedAvailability.find(item => {
          if (item.base.type === 'recurring' && item.base.day === dayOfWeek) {
            return true;
          }
          
          if (item.base.type === 'specific' && item.base.date) {
            const baseDate = new Date(item.base.date);
            return baseDate.toDateString() === date.toDateString();
          }
          
          return false;
        });
        
        if (!baseAvailForDay) {
          console.warn(`No availability set for ${format(date, 'EEEE, MMMM d')}. Skipping.`);
          continue;
        }
        
        // Add exception for this date
        await addAvailabilityException({
          baseAvailabilityId: baseAvailForDay.base.id,
          startTime: data.startTime,
          endTime: data.endTime,
          reason: data.reason,
          isSpecificDate: true,
          specificDate: date
        });
      }
      
      await refreshAvailability();
      
      toast({
        title: "Time off saved",
        description: `Your time off has been added for the selected date range.`,
      });
    } catch (err) {
      console.error('Error saving time off:', err);
      toast({
        title: "Error saving time off",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Handle base availability deletion
  const handleDeleteBase = async (id: string) => {
    try {
      await deleteBaseAvailability(id);
      await refreshAvailability();
      
      toast({
        title: "Availability deleted",
        description: "The availability slot has been removed.",
      });
    } catch (err) {
      console.error('Error deleting availability:', err);
      toast({
        title: "Error deleting availability",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  // Handle exception deletion
  const handleDeleteException = async (id: string) => {
    try {
      await deleteAvailabilityException(id);
      await refreshAvailability();
      
      toast({
        title: "Time off deleted",
        description: "The time off has been removed.",
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

  // Get the list of days that have availability set
  const getAvailableDays = () => {
    const availableDays = new Set<string>();
    
    uiFormattedAvailability.forEach(item => {
      if (item.base.type === 'recurring' && item.base.day) {
        availableDays.add(item.base.day);
      }
    });
    
    return Array.from(availableDays);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Availability</h1>
        <div className="flex space-x-2">
          <Button 
            onClick={() => setIsTimeOffManagerOpen(true)} 
            variant="outline"
            disabled={hierarchicalAvailability.length === 0}
            title={hierarchicalAvailability.length === 0 ? "Set availability first" : "Manage time off"}
          >
            <Clock className="h-4 w-4 mr-2" />
            Manage Time Off
          </Button>
          <Button onClick={() => setIsBaseDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Availability
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
              <div className="text-center py-12">
                <p>Loading availability...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                <p>Error loading availability: {error}</p>
              </div>
            ) : (
              <div>
                {hierarchicalAvailability.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg">
                    <h3 className="text-lg font-medium">No hours set</h3>
                    <p className="text-gray-500 mt-2">
                      Click "Add Availability" to set your working hours.
                    </p>
                  </div>
                ) : (
                  <WeeklyView 
                    hierarchicalAvailability={uiFormattedAvailability}
                    onAddException={(baseId: string, baseStartTime: string, baseEndTime: string, specificDate?: Date) => {
                      setExceptionDialogState({
                        isOpen: true,
                        baseId,
                        baseStartTime,
                        baseEndTime,
                        specificDate
                      });
                    }}
                    onDeleteBase={handleDeleteBase}
                    onDeleteException={handleDeleteException}
                    formatDate={formatDate}
                  />
                )}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="calendar">
          {hierarchicalAvailability.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <h3 className="text-lg font-medium">No hours set</h3>
              <p className="text-gray-500 mt-2">
                Click "Add Availability" to set your working hours.
              </p>
            </div>
          ) : (
            <CalendarView hierarchicalAvailability={hierarchicalAvailability as OriginalHierarchicalAvailability[]} />
          )}
        </TabsContent>
      </Tabs>
      
      {/* Base Availability Form Dialog */}
      <BaseAvailabilityForm
        isOpen={isBaseDialogOpen}
        onOpenChange={setIsBaseDialogOpen}
        onSubmit={onSubmitBase}
        checkForOverlaps={checkForOverlaps}
        onOverlapDetected={(formData) => {
          // Handle the overlap detection here
          if (formData.type === 'recurring' && formData.days && formData.days.length > 0) {
            // Get all days with overlaps
            const daysWithOverlaps = formData.days.filter(day => {
              // Check against recurring availability
              const dayAvailability = uiFormattedAvailability.filter(
                item => item.base.type === 'recurring' && item.base.day === day
              );
              
              const hasRecurringOverlap = dayAvailability.some(item => 
                checkTimeOverlap(
                  formData.startTime,
                  formData.endTime,
                  item.base.start_time,
                  item.base.end_time
                )
              );
              
              // Check against specific dates that fall on this day
              const specificDateAvailability = uiFormattedAvailability.filter(item => {
                if (item.base.type === 'specific' && item.base.date) {
                  const date = new Date(item.base.date);
                  const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
                  return dayOfWeek === day;
                }
                return false;
              });
              
              const hasSpecificDateOverlap = specificDateAvailability.some(item => 
                checkTimeOverlap(
                  formData.startTime,
                  formData.endTime,
                  item.base.start_time,
                  item.base.end_time
                )
              );
              
              return hasRecurringOverlap || hasSpecificDateOverlap;
            });
            
            if (daysWithOverlaps.length > 0) {
              // Process the first day with an overlap
              const day = daysWithOverlaps[0];
              
              // Find the overlapping slot
              const dayAvailability = uiFormattedAvailability.filter(
                item => item.base.type === 'recurring' && item.base.day === day
              );
              
              let overlappingSlot = null;
              for (const item of dayAvailability) {
                if (checkTimeOverlap(
                  formData.startTime,
                  formData.endTime,
                  item.base.start_time,
                  item.base.end_time
                )) {
                  overlappingSlot = item;
                  break;
                }
              }
              
              if (overlappingSlot) {
                // Calculate merged slot times
                const mergedStartTime = formData.startTime < overlappingSlot.base.start_time ? 
                  formData.startTime : overlappingSlot.base.start_time;
                const mergedEndTime = formData.endTime > overlappingSlot.base.end_time ? 
                  formData.endTime : overlappingSlot.base.end_time;
                
                // Create a function to process all days with overlaps
                const processAllDaysWithOverlaps = async (action: 'merge' | 'replace') => {
                  // Process each day with an overlap
                  for (const currentDay of daysWithOverlaps) {
                    // Find the overlapping slot for this day
                    const currentDayAvailability = uiFormattedAvailability.filter(
                      item => item.base.type === 'recurring' && item.base.day === currentDay
                    );
                    
                    let currentOverlappingSlot = null;
                    for (const item of currentDayAvailability) {
                      if (checkTimeOverlap(
                        formData.startTime,
                        formData.endTime,
                        item.base.start_time,
                        item.base.end_time
                      )) {
                        currentOverlappingSlot = item;
                        break;
                      }
                    }
                    
                    if (currentOverlappingSlot) {
                      // Delete the old slot
                      await deleteBaseAvailability(currentOverlappingSlot.base.id);
                      
                      if (action === 'merge') {
                        // Calculate merged times for this day
                        const currentMergedStartTime = formData.startTime < currentOverlappingSlot.base.start_time ? 
                          formData.startTime : currentOverlappingSlot.base.start_time;
                        const currentMergedEndTime = formData.endTime > currentOverlappingSlot.base.end_time ? 
                          formData.endTime : currentOverlappingSlot.base.end_time;
                        
                        // Create new merged slot
                        const apiData = convertBaseToAPIFormat({
                          type: 'recurring',
                          day: currentDay,
                          startTime: currentMergedStartTime,
                          endTime: currentMergedEndTime,
                        });
                        
                        await addBaseAvailability({
                          ...apiData,
                          forceAdd: true
                        });
                      } else {
                        // Add the new slot (replace)
                        const apiData = convertBaseToAPIFormat({
                          type: 'recurring',
                          day: currentDay,
                          startTime: formData.startTime,
                          endTime: formData.endTime,
                        });
                        
                        await addBaseAvailability({
                          ...apiData,
                          forceAdd: true
                        });
                      }
                    }
                  }
                  
                  // Process non-overlapping days
                  const nonOverlappingDays = formData.days?.filter(d => !daysWithOverlaps.includes(d)) || [];
                  for (const currentDay of nonOverlappingDays) {
                    const apiData = convertBaseToAPIFormat({
                      type: 'recurring',
                      day: currentDay,
                      startTime: formData.startTime,
                      endTime: formData.endTime,
                    });
                    
                    await addBaseAvailability({
                      ...apiData,
                      forceAdd: true
                    });
                  }
                };
                
                // Set up merge function
                const handleMerge = async () => {
                  await processAllDaysWithOverlaps('merge');
                };
                
                // Set up replace function
                const handleReplace = async () => {
                  await processAllDaysWithOverlaps('replace');
                };
                
                // Format the days for display
                const daysList = daysWithOverlaps.length > 1 
                  ? `${daysWithOverlaps.join(', ')} (${daysWithOverlaps.length} days)`
                  : day;
                
                // Open the overlap dialog
                setOverlapDialogState({
                  isOpen: true,
                  day: daysList,
                  newSlot: { startTime: formData.startTime, endTime: formData.endTime },
                  existingSlot: { startTime: overlappingSlot.base.start_time, endTime: overlappingSlot.base.end_time },
                  mergedSlot: { startTime: mergedStartTime, endTime: mergedEndTime },
                  onMerge: handleMerge,
                  onReplace: handleReplace,
                  formData
                });
              }
            }
          } else if (formData.type === 'specific' && formData.date) {
            // Handle specific date overlaps
            const specificDateStr = formData.date.toISOString().split('T')[0]; // Get just the date part
            
            // Check against other specific dates
            const dateAvailability = uiFormattedAvailability.filter(
              item => item.base.type === 'specific' && 
                     item.base.date && 
                     item.base.date.startsWith(specificDateStr)
            );
            
            // Check against recurring availability for this day of the week
            const date = new Date(formData.date);
            const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
            
            const recurringAvailability = uiFormattedAvailability.filter(
              item => item.base.type === 'recurring' && item.base.day === dayOfWeek
            );
            
            // Combine both types of availability
            const allAvailability = [...dateAvailability, ...recurringAvailability];
            
            let overlappingSlot = null;
            for (const item of allAvailability) {
              if (checkTimeOverlap(
                formData.startTime,
                formData.endTime,
                item.base.start_time,
                item.base.end_time
              )) {
                overlappingSlot = item;
                break;
              }
            }
            
            if (overlappingSlot) {
              // Calculate merged slot times
              const mergedStartTime = formData.startTime < overlappingSlot.base.start_time ? 
                formData.startTime : overlappingSlot.base.start_time;
              const mergedEndTime = formData.endTime > overlappingSlot.base.end_time ? 
                formData.endTime : overlappingSlot.base.end_time;
              
              // Set up merge function
              const handleMerge = async () => {
                // Delete the old slot
                await deleteBaseAvailability(overlappingSlot.base.id);
                
                // Create new merged slot
                const apiData = convertBaseToAPIFormat({
                  type: 'specific',
                  date: formData.date?.toISOString() || new Date().toISOString(),
                  startTime: mergedStartTime,
                  endTime: mergedEndTime,
                });
                
                await addBaseAvailability({
                  ...apiData,
                  forceAdd: true
                });
              };
              
              // Set up replace function
              const handleReplace = async () => {
                // Delete the old slot
                await deleteBaseAvailability(overlappingSlot.base.id);
                
                // Add the new slot
                const apiData = convertBaseToAPIFormat({
                  type: 'specific',
                  date: formData.date?.toISOString() || new Date().toISOString(),
                  startTime: formData.startTime,
                  endTime: formData.endTime,
                });
                
                await addBaseAvailability({
                  ...apiData,
                  forceAdd: true
                });
              };
              
              // Format the date/day for display
              let displayDay = '';
              if (overlappingSlot.base.type === 'specific' && overlappingSlot.base.date) {
                displayDay = formatDate(overlappingSlot.base.date);
              } else if (overlappingSlot.base.type === 'recurring') {
                displayDay = `${formatDate(formData.date?.toISOString())} (${overlappingSlot.base.day})`;
              }
              
              // Open the overlap dialog
              setOverlapDialogState({
                isOpen: true,
                day: displayDay,
                newSlot: { startTime: formData.startTime, endTime: formData.endTime },
                existingSlot: { startTime: overlappingSlot.base.start_time, endTime: overlappingSlot.base.end_time },
                mergedSlot: { startTime: mergedStartTime, endTime: mergedEndTime },
                onMerge: handleMerge,
                onReplace: handleReplace,
                formData
              });
            }
          }
        }}
      />
      
      {/* Exception Dialog */}
      <ExceptionDialog
        isOpen={exceptionDialogState.isOpen}
        onOpenChange={(open) => setExceptionDialogState(prev => ({ ...prev, isOpen: open }))}
        baseId={exceptionDialogState.baseId}
        baseStartTime={exceptionDialogState.baseStartTime}
        baseEndTime={exceptionDialogState.baseEndTime}
        specificDate={exceptionDialogState.specificDate}
        onSubmit={onSubmitException}
      />
      
      {/* Overlap Dialog */}
      <OverlapDialog
        isOpen={overlapDialogState.isOpen}
        onOpenChange={(open) => {
          setOverlapDialogState(prev => ({ ...prev, isOpen: open }));
          // If dialog is closed without choosing an option, refresh the data
          if (!open) {
            refreshAvailability();
          }
        }}
        day={overlapDialogState.day}
        newSlot={overlapDialogState.newSlot}
        existingSlot={overlapDialogState.existingSlot}
        mergedSlot={overlapDialogState.mergedSlot}
        onMerge={overlapDialogState.onMerge}
        onReplace={overlapDialogState.onReplace}
      />

      {/* Time Off Manager */}
      <TimeOffManager
        isOpen={isTimeOffManagerOpen}
        onOpenChange={setIsTimeOffManagerOpen}
        onSubmitRecurring={onSubmitRecurringTimeOff}
        onSubmitOneTime={onSubmitOneTimeTimeOff}
        availableDays={getAvailableDays()}
        hierarchicalAvailability={hierarchicalAvailability}
      />
    </div>
  );
} 