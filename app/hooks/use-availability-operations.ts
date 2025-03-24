import { useState } from 'react';
import { timeToMinutes } from '@/app/dashboard/availability/utils/time/calculations';
import { minutesToTime } from '@/app/dashboard/availability/utils/time/additional';
import { BaseAvailabilityFormValues } from '@/app/dashboard/availability/utils/schemas';
import { TherapistAvailability } from './use-therapist-availability';
import { TimeOff } from '@/app/types/index';

interface OverlapState {
  isOpen: boolean;
  type: 'availability' | 'time-off' | null;
  data: any;
  conflictingItems: any[];
  action: 'add' | 'edit' | null;
}

export function useAvailabilityOperations() {
  const [overlapState, setOverlapState] = useState<OverlapState>({
    isOpen: false,
    type: null,
    data: null,
    conflictingItems: [],
    action: null,
  });

  // Calculate merged time slot for time-off exceptions
  const calculateMergedTimeOffSlot = (
    newStartTime: string, 
    newEndTime: string, 
    existingStartTime: string, 
    existingEndTime: string
  ) => {
    const newStart = timeToMinutes(newStartTime);
    const newEnd = timeToMinutes(newEndTime);
    const existingStart = timeToMinutes(existingStartTime);
    const existingEnd = timeToMinutes(existingEndTime);
    
    // Take the earlier start time and later end time
    const mergedStart = Math.min(newStart, existingStart);
    const mergedEnd = Math.max(newEnd, existingEnd);
    
    return {
      startTime: minutesToTime(mergedStart),
      endTime: minutesToTime(mergedEnd)
    };
  };

  // Calculate merged time slot for availability
  const calculateMergedSlot = (
    newStartTime: string, 
    newEndTime: string, 
    existingStartTime: string, 
    existingEndTime: string
  ) => {
    const newStart = timeToMinutes(newStartTime);
    const newEnd = timeToMinutes(newEndTime);
    const existingStart = timeToMinutes(existingStartTime);
    const existingEnd = timeToMinutes(existingEndTime);
    
    // Take the earlier start time and later end time
    const mergedStart = Math.min(newStart, existingStart);
    const mergedEnd = Math.max(newEnd, existingEnd);
    
    return {
      startTime: minutesToTime(mergedStart),
      endTime: minutesToTime(mergedEnd)
    };
  };

  // Handle overlap detection for base availability
  const handleBaseAvailabilityOverlap = (
    data: BaseAvailabilityFormValues,
    overlappingSlots: TherapistAvailability[]
  ) => {
    setOverlapState({
      isOpen: true,
      type: 'availability',
      data,
      conflictingItems: overlappingSlots,
      action: 'add',
    });
  };

  // Handle overlap detection for time-off
  const handleTimeOffOverlap = (
    data: any,
    overlappingTimeOffs: TimeOff[]
  ) => {
    setOverlapState({
      isOpen: true,
      type: 'time-off',
      data,
      conflictingItems: overlappingTimeOffs,
      action: 'add',
    });
  };

  // Reset overlap state
  const resetOverlapState = () => {
    setOverlapState({
      isOpen: false,
      type: null,
      data: null,
      conflictingItems: [],
      action: null,
    });
  };

  return {
    overlapState,
    setOverlapState,
    resetOverlapState,
    calculateMergedTimeOffSlot,
    calculateMergedSlot,
    handleBaseAvailabilityOverlap,
    handleTimeOffOverlap,
  };
} 