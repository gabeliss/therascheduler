'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { useHierarchicalAvailability } from '@/app/hooks/use-hierarchical-availability';
import { BaseAvailabilityFormValues, ExceptionFormValues } from './utils/schemas';
import { formatDate } from './utils/time-utils';
import { checkTimeOverlap } from './utils/time-utils';
import { convertBaseToAPIFormat, convertToUIFormat, HierarchicalItem } from './utils/types';
import BaseAvailabilityForm from './components/BaseAvailabilityForm';
import ExceptionDialog from './components/ExceptionDialog';
import WeeklyView from './components/WeeklyView';
import { HierarchicalAvailability as OriginalHierarchicalAvailability } from '@/app/types';
import CalendarView from './calendar-view';

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
  const { toast } = useToast();

  // Add this state for the exception dialog
  const [exceptionDialogState, setExceptionDialogState] = useState({
    isOpen: false,
    baseId: null as string | null,
    baseStartTime: '',
    baseEndTime: ''
  });

  // Convert API data to UI format
  const uiFormattedAvailability: HierarchicalItem[] = hierarchicalAvailability.map(convertToUIFormat);

  // Check for overlaps in availability
  const checkForOverlaps = (formData: BaseAvailabilityFormValues): { hasOverlap: boolean, overlapDays: string[] } => {
    const overlapDays: string[] = [];
    let hasOverlap = false;

    // Skip overlap check for specific dates
    if (formData.type === 'specific') {
      return { hasOverlap, overlapDays };
    }

    // Check for overlaps in recurring availability
    if (formData.days && formData.days.length > 0) {
      formData.days.forEach(day => {
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
      });
    }

    return { hasOverlap, overlapDays };
  };

  // Handle base availability submission
  const onSubmitBase = async (data: BaseAvailabilityFormValues) => {
    try {
      if (data.type === 'recurring' && data.days) {
        // Add recurring availability for each selected day
        for (const day of data.days) {
          await addBaseAvailability(convertBaseToAPIFormat({
            type: 'recurring',
            day,
            startTime: data.startTime,
            endTime: data.endTime,
          }));
        }
      } else if (data.type === 'specific' && data.date) {
        // Add specific date availability
        await addBaseAvailability(convertBaseToAPIFormat({
          type: 'specific',
          date: data.date.toISOString(),
          startTime: data.startTime,
          endTime: data.endTime,
        }));
      }

      await refreshAvailability();
      
      toast({
        title: "Availability saved",
        description: "Your availability has been updated successfully.",
      });
    } catch (err) {
      console.error('Error saving availability:', err);
      toast({
        title: "Error saving availability",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Handle exception submission
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
      });
      
      await refreshAvailability();
      
      toast({
        title: "Time off saved",
        description: "Your time off has been added successfully.",
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Availability</h1>
        <Button onClick={() => setIsBaseDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Regular Hours
        </Button>
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
                      Click "Add Regular Hours" to set your working hours.
                    </p>
                  </div>
                ) : (
                  <WeeklyView 
                    hierarchicalAvailability={uiFormattedAvailability}
                    onAddException={(baseId, baseStartTime, baseEndTime) => {
                      setExceptionDialogState({
                        isOpen: true,
                        baseId,
                        baseStartTime,
                        baseEndTime
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
                Click "Add Regular Hours" to set your working hours.
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
      />
      
      {/* Exception Dialog */}
      <ExceptionDialog
        isOpen={exceptionDialogState.isOpen}
        onOpenChange={(open) => setExceptionDialogState(prev => ({ ...prev, isOpen: open }))}
        baseId={exceptionDialogState.baseId}
        baseStartTime={exceptionDialogState.baseStartTime}
        baseEndTime={exceptionDialogState.baseEndTime}
        onSubmit={onSubmitException}
      />
    </div>
  );
} 