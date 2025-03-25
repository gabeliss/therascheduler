'use client';

import { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { useTherapistAvailability } from '@/app/hooks/use-therapist-availability';
import { BaseAvailabilityFormValues, ExceptionFormValues } from './utils/schemas';
import { useAuth } from '@/app/context/auth-context';
import { useDialogState } from '@/app/hooks/use-dialog-state';
import { useAvailabilityOperations } from '@/app/hooks/use-availability-operations';
import { useAppointments } from '@/app/hooks/use-appointments';
import { TimeOff } from '@/app/types/index';

// Import components
import AvailabilityView from './components/AvailabilityView';
import DialogManager from './components/DialogManager';

// Import handlers and utilities
import {
  handleBaseAvailabilitySubmit,
  handleExceptionSubmit,
  handleExceptionDelete,
  handleTimeOffSave,
  handleAvailabilitySave,
  handleTimeOffOverlapConfirm,
  formatDateObject
} from './utils/handlers';

export default function AvailabilityPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    availability,
    loading: availabilityLoading,
    error: availabilityError,
    addAvailability,
    deleteAvailability,
    checkForOverlaps
  } = useTherapistAvailability();
  
  const { 
    appointments, 
    loading: appointmentsLoading 
  } = useAppointments();
  
  const { toast } = useToast();
  
  // Use custom hooks for dialog state management
  const baseAvailabilityDialog = useDialogState();
  const timeOffManagerDialog = useDialogState();
  const exceptionDialog = useDialogState<Date>();
  const editTimeOffDialog = useDialogState<TimeOff>();
  const editAvailabilityDialog = useDialogState<any>();
  
  // Use custom hook for overlap operations
  const {
    overlapState,
    setOverlapState,
    resetOverlapState,
    calculateMergedTimeOffSlot,
    calculateMergedSlot
  } = useAvailabilityOperations();

  // Handler for submitting base availability
  const onSubmitBase = async (data: BaseAvailabilityFormValues, skipOverlapCheck: boolean = false) => {
    return handleBaseAvailabilitySubmit(
      data, 
      skipOverlapCheck, 
      addAvailability, 
      checkForOverlaps, 
      setOverlapState,
      availability,
      baseAvailabilityDialog.closeDialog
    );
  };

  // Handler for submitting exception form
  const onSubmitUnifiedException = async (data: ExceptionFormValues & { start_time?: string, end_time?: string }) => {
    return handleExceptionSubmit(
      data,
      addAvailability,
      exceptionDialog.closeDialog
    );
  };

  // Handler for deleting an exception
  const handleDeleteException = async (id: string) => {
    return handleExceptionDelete(
      id,
      availability,
      deleteAvailability
    );
  };

  // Handler for editing time off
  const handleEditTimeOff = (timeOff: TimeOff) => {
    editTimeOffDialog.openDialog(timeOff);
  };

  // Handler for editing availability
  const handleEditAvailability = (availability: any) => {
    editAvailabilityDialog.openDialog(availability);
  };

  // Handler for saving edited time off
  const handleSaveTimeOff = async (
    id: string, 
    startTime: string, 
    endTime: string, 
    reason: string,
    recurrence: string | null
  ) => {
    return handleTimeOffSave(
      id,
      startTime,
      endTime,
      reason,
      recurrence,
      addAvailability,
      deleteAvailability,
      availability,
      editTimeOffDialog.closeDialog
    );
  };

  // Handler for saving edited availability
  const handleSaveAvailability = async (id: string, startTime: string, endTime: string) => {
    return handleAvailabilitySave(
      id,
      startTime,
      endTime,
      addAvailability,
      deleteAvailability,
      availability,
      editAvailabilityDialog.closeDialog
    );
  };

  // Handler for confirming time off overlap action
  const handleTimeOffOverlapConfirmAction = async (action: 'replace' | 'merge') => {
    return handleTimeOffOverlapConfirm(
      action,
      overlapState,
      deleteAvailability,
      addAvailability,
      resetOverlapState,
      exceptionDialog.closeDialog,
      calculateMergedTimeOffSlot
    );
  };

  // Check for overlaps
  const checkForAvailabilityOverlaps = (formData: BaseAvailabilityFormValues) => {
    const { startTime, endTime, type, days, date } = formData;
    let hasOverlap = false;
    let overlapDays: string[] = [];
    
    if (type === 'recurring' && days) {
      // Check each selected day for overlaps
      for (const day of days) {
        const dayOfWeek = parseInt(day);
        const recurrence = `weekly:${dayOfWeek}`;
        if (checkForOverlaps(startTime, endTime, recurrence)) {
          hasOverlap = true;
          overlapDays.push(day);
        }
      }
    } else if (type === 'specific' && date) {
      // Check specific date for overlaps
      const formattedDate = formatDateObject(date);
      const start_time = `${formattedDate}T${startTime}:00`;
      const end_time = `${formattedDate}T${endTime}:00`;
      hasOverlap = checkForOverlaps(start_time, end_time, null);
      if (hasOverlap) {
        overlapDays.push(date.getDay().toString());
      }
    }
    
    return { hasOverlap, overlapDays };
  };

  return (
    <>
      <AvailabilityView
        availability={availability}
        appointments={appointments}
        loading={availabilityLoading}
        onAddAvailability={baseAvailabilityDialog.openDialog}
        onManageTimeOff={timeOffManagerDialog.openDialog}
        onAddException={exceptionDialog.openDialog}
        onDeleteException={handleDeleteException}
        onDeleteAvailability={deleteAvailability}
        onEditException={handleEditTimeOff}
        onEditAvailability={handleEditAvailability}
      />
      
      <DialogManager
        baseAvailabilityDialog={baseAvailabilityDialog}
        timeOffManagerDialog={timeOffManagerDialog}
        exceptionDialog={exceptionDialog}
        editTimeOffDialog={editTimeOffDialog}
        editAvailabilityDialog={editAvailabilityDialog}
        overlapState={overlapState}
        resetOverlapState={resetOverlapState}
        availability={availability}
        deleteAvailability={deleteAvailability}
        onSubmitBase={onSubmitBase}
        onSubmitUnifiedException={onSubmitUnifiedException}
        handleDeleteException={handleDeleteException}
        handleEditTimeOff={handleEditTimeOff}
        handleEditAvailability={handleEditAvailability}
        handleSaveTimeOff={handleSaveTimeOff}
        handleSaveAvailability={handleSaveAvailability}
        handleTimeOffOverlapConfirm={handleTimeOffOverlapConfirmAction}
        checkForOverlaps={checkForAvailabilityOverlaps}
      />
    </>
  );
} 