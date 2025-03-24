import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Clock } from 'lucide-react';
import WeeklyView from './WeeklyView';
import UnifiedCalendarView from '../calendar-view';
import { TherapistAvailability } from '@/app/hooks/use-therapist-availability';
import { TimeOff } from '@/app/types/index';
import { Appointment } from '@/app/types';
import { formatDate } from '../utils/time';

interface AvailabilityViewProps {
  availability: TherapistAvailability[];
  appointments: Appointment[];
  loading: boolean;
  onAddAvailability: () => void;
  onManageTimeOff: () => void;
  onAddException: (date: Date) => void;
  onDeleteException: (id: string) => Promise<void>;
  onDeleteAvailability: (id: string) => Promise<void>;
  onEditException: (timeOff: TimeOff) => void;
  onEditAvailability: (availability: TherapistAvailability) => void;
}

/**
 * Main view component for the Availability page containing tabs for different views
 */
const AvailabilityView: React.FC<AvailabilityViewProps> = ({
  availability,
  appointments,
  loading,
  onAddAvailability,
  onManageTimeOff,
  onAddException,
  onDeleteException, 
  onDeleteAvailability,
  onEditException,
  onEditAvailability
}) => {
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Your Availability</h1>
      </div>
      
      <Tabs defaultValue="weekly" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="weekly">Weekly View</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button onClick={onAddAvailability} className="flex items-center bg-gray-900 hover:bg-gray-800">
              <Plus className="h-4 w-4 mr-2" />
              Add Availability
            </Button>
            <Button onClick={onManageTimeOff} variant="outline" className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Manage Time Off
            </Button>
          </div>
        </div>
        
        <TabsContent value="weekly" className="mt-6">
          <WeeklyView
            availability={availability}
            exceptions={availability}
            appointments={appointments}
            onAddException={onAddException}
            onDeleteException={onDeleteException}
            onDeleteAvailability={onDeleteAvailability}
            formatDate={formatDate}
            onEditException={onEditException}
            onEditAvailability={onEditAvailability}
            showAppointments={true}
            loading={loading}
          />
        </TabsContent>
        
        <TabsContent value="calendar" className="mt-6">
          <UnifiedCalendarView
            availability={availability}
            exceptions={availability}
            appointments={appointments}
            onAddException={onAddException}
            showAppointments={true}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AvailabilityView; 