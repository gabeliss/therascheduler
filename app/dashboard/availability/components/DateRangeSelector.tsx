import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { isAfter } from 'date-fns';

interface DateRangeSelectorProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  disablePastDates?: boolean;
  className?: string;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disablePastDates = true,
  className = '',
}) => {
  // Handle start date change with validation
  const handleStartDateChange = (date: Date | undefined) => {
    onStartDateChange(date);
    
    // If start date is after end date, update end date to match start date
    if (date && endDate && isAfter(date, endDate)) {
      onEndDateChange(date);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium">Date Range</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Start Date</label>
          <div className="border rounded-md p-1 w-full">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={handleStartDateChange}
              className="rounded-md border w-full"
              disabled={disablePastDates ? (date) => date < new Date(new Date().setHours(0, 0, 0, 0)) : undefined}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">End Date</label>
          <div className="border rounded-md p-1 w-full">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={onEndDateChange}
              className="rounded-md border w-full"
              disabled={(date) => {
                if (disablePastDates) {
                  const today = new Date(new Date().setHours(0, 0, 0, 0));
                  if (date < today) return true;
                }
                if (startDate && date < startDate) return true;
                return false;
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangeSelector; 