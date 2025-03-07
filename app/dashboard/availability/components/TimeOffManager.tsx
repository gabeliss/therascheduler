'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { UnifiedAvailabilityException } from '@/app/types/index';
import { formatTime } from '../utils/time-utils';

interface TimeOffManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  exceptions: UnifiedAvailabilityException[];
  onDeleteException: (id: string) => void;
}

export default function TimeOffManager({ 
  isOpen, 
  onOpenChange, 
  exceptions,
  onDeleteException 
}: TimeOffManagerProps) {
  const [activeTab, setActiveTab] = useState('recurring');
  
  // Filter exceptions by type
  const recurringExceptions = exceptions.filter(ex => ex.is_recurring);
  const specificExceptions = exceptions.filter(ex => !ex.is_recurring);
  
  // Group recurring exceptions by day of week
  const groupedRecurringExceptions: { [key: string]: UnifiedAvailabilityException[] } = {};
  
  recurringExceptions.forEach(ex => {
    const dayName = getDayName(ex.day_of_week);
    if (!groupedRecurringExceptions[dayName]) {
      groupedRecurringExceptions[dayName] = [];
    }
    groupedRecurringExceptions[dayName].push(ex);
  });
  
  // Sort specific exceptions by date
  const sortedSpecificExceptions = [...specificExceptions].sort((a, b) => {
    if (!a.specific_date || !b.specific_date) return 0;
    return new Date(a.specific_date).getTime() - new Date(b.specific_date).getTime();
  });
  
  // Helper function to get day name
  function getDayName(dayOfWeek?: number): string {
    if (dayOfWeek === undefined) return 'Unknown';
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Time Off</DialogTitle>
          <DialogDescription>
            View and manage your recurring and one-time time off.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="recurring" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recurring">Recurring Time Off</TabsTrigger>
            <TabsTrigger value="specific">Specific Dates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="recurring" className="space-y-4 mt-4">
            {Object.keys(groupedRecurringExceptions).length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>No recurring time off set.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedRecurringExceptions).map(([day, exs]) => (
                  <div key={day} className="border rounded-md p-4">
                    <h3 className="font-medium mb-2">{day}</h3>
                    <div className="space-y-2">
                      {exs.map(ex => (
                        <div 
                          key={ex.id} 
                          className="bg-red-50 p-3 rounded-md border border-red-100 flex justify-between items-center"
                        >
                          <div>
                            <div className="font-medium">
                              {formatTime(ex.start_time)} - {formatTime(ex.end_time)}
                            </div>
                            {ex.reason && (
                              <div className="text-sm text-gray-500">{ex.reason}</div>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => onDeleteException(ex.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="specific" className="space-y-4 mt-4">
            {sortedSpecificExceptions.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>No specific date time off set.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedSpecificExceptions.map(ex => (
                  <div 
                    key={ex.id} 
                    className="bg-red-50 p-3 rounded-md border border-red-100 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">
                        {ex.specific_date && format(new Date(ex.specific_date), 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="text-sm">
                        {formatTime(ex.start_time)} - {formatTime(ex.end_time)}
                      </div>
                      {ex.reason && (
                        <div className="text-sm text-gray-500">{ex.reason}</div>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onDeleteException(ex.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 