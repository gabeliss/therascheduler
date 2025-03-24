import { useState } from 'react';
import { addDays, addMonths, subMonths } from 'date-fns';

interface CalendarNavigationOptions {
  periodType: 'week' | 'month';
}

export function useCalendarNavigation({ periodType }: CalendarNavigationOptions = { periodType: 'week' }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const goToPreviousPeriod = () => {
    if (periodType === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };
  
  const goToNextPeriod = () => {
    if (periodType === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };
  
  const goToCurrentPeriod = () => {
    setCurrentDate(new Date());
  };
  
  return {
    currentDate,
    setCurrentDate,
    goToPreviousPeriod,
    goToNextPeriod,
    goToCurrentPeriod
  };
} 