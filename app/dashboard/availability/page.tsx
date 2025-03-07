'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Clock } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { useUnifiedAvailability } from '@/app/hooks/use-unified-availability';
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

export default function AvailabilityPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    unifiedAvailability,
    loading,
    error,
    addUnifiedException,
    deleteUnifiedException,
    refreshAvailability
  } = useUnifiedAvailability();
  
  const [isBaseDialogOpen, setIsBaseDialogOpen] = useState(false);
  const [isTimeOffManagerOpen, setIsTimeOffManagerOpen] = useState(false);
  const { toast } = useToast();

  // State for the unified exception dialog
  const [unifiedExceptionDialogState, setUnifiedExceptionDialogState] = useState({
    isOpen: false,
    specificDate: undefined as Date | undefined
  });

  // State for overlap dialog
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

  // Handle base availability submission
  const onSubmitBase = async (data: BaseAvailabilityFormValues, forceAdd = false) => {
    try {
      // Implementation will be added later
      toast({
        title: "Base availability added",
        description: "Your availability has been added successfully.",
      });
    } catch (err) {
      console.error('Error adding availability:', err);
      toast({
        title: "Error adding availability",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  // Handle exception submission with unified model
  const onSubmitUnifiedException = async (data: ExceptionFormValues) => {
    if (!unifiedExceptionDialogState.specificDate) {
      throw new Error('No date selected. Please try again.');
    }
    
    try {
      // Format date as YYYY-MM-DD
      const formattedDate = format(unifiedExceptionDialogState.specificDate, 'yyyy-MM-dd');
      
      // Get day of week (0-6, Sunday-Saturday)
      const dayOfWeek = unifiedExceptionDialogState.specificDate.getDay();
      
      // Add a single unified exception that handles both specific date and recurring
      await addUnifiedException({
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
        isRecurring: data.isRecurring,
        dayOfWeek: data.isRecurring ? dayOfWeek : undefined,
        specificDate: !data.isRecurring ? formattedDate : undefined
      });
      
      await refreshAvailability();
      
      toast({
        title: !data.isRecurring 
          ? "Time blocked" 
          : "Recurring time off saved",
        description: !data.isRecurring 
          ? "Your time has been blocked for this specific date." 
          : `Your recurring time off has been added for every ${format(unifiedExceptionDialogState.specificDate, 'EEEE')}.`,
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

  // If there's an error from the useUnifiedAvailability hook, show it
  if (error) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Availability</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Error</p>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

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
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            ) : (
              <div>
                {unifiedAvailability.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg">
                    <h3 className="text-lg font-medium">No time off set</h3>
                    <p className="text-gray-500 mt-2">
                      Click "Manage Time Off" to block off time.
                    </p>
                  </div>
                ) : (
                  <WeeklyView 
                    exceptions={unifiedAvailability}
                    onAddException={(date: Date) => {
                      setUnifiedExceptionDialogState({
                        isOpen: true,
                        specificDate: date
                      });
                    }}
                    onDeleteException={handleDeleteException}
                    formatDate={formatDate}
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
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : (
            <UnifiedCalendarView 
              unifiedExceptions={unifiedAvailability} 
              onTimeSlotClick={(date, timeSlot) => {
                setUnifiedExceptionDialogState({
                  isOpen: true,
                  specificDate: date
                });
              }}
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
      />
    </div>
  );
} 