import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getWeekDates } from '../utils/time-utils';
import AvailabilityItem from './AvailabilityItem';
import { HierarchicalItem } from '../utils/types';

interface WeeklyViewProps {
  hierarchicalAvailability: HierarchicalItem[];
  onAddException: (baseId: string, baseStartTime: string, baseEndTime: string) => void;
  onDeleteBase: (id: string) => void;
  onDeleteException: (id: string) => void;
  formatDate: (dateString: string | undefined) => string;
}

const WeeklyView = ({
  hierarchicalAvailability,
  onAddException,
  onDeleteBase,
  onDeleteException,
  formatDate
}: WeeklyViewProps) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekDates, setWeekDates] = useState(getWeekDates(weekOffset));
  
  // Update weekDates when weekOffset changes
  useEffect(() => {
    setWeekDates(getWeekDates(weekOffset));
  }, [weekOffset]);
  
  // Helper function to format week range for display
  const getWeekRangeText = () => {
    const startOfWeek = weekDates[0].date;
    const endOfWeek = weekDates[6].date;
    return `${format(startOfWeek, 'MMM d')} - ${format(endOfWeek, 'MMM d, yyyy')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Weekly Schedule</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(weekOffset - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{getWeekRangeText()}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(weekOffset + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {weekDates.map((weekDay) => {
          // Filter availability for this day
          const dayAvailability = hierarchicalAvailability.filter((item) => {
            if (item.base.type === 'recurring') {
              return item.base.day === weekDay.dayName;
            } else if (item.base.type === 'specific' && item.base.date) {
              try {
                const baseDate = new Date(item.base.date);
                return baseDate.toDateString() === weekDay.date.toDateString();
              } catch (error) {
                console.error('Error comparing dates:', error);
                return false;
              }
            }
            return false;
          });

          return (
            <div key={weekDay.dayName} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-medium">
                  {weekDay.dayName}, {format(weekDay.date, 'MMMM d')}
                </h3>
              </div>
              <div className="p-4">
                {dayAvailability.length > 0 ? (
                  <div className="space-y-2">
                    {dayAvailability.map((item) => (
                      <AvailabilityItem
                        key={item.base.id}
                        item={item}
                        onAddException={onAddException}
                        onDeleteBase={onDeleteBase}
                        onDeleteException={onDeleteException}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p>No availability set for this day.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyView; 