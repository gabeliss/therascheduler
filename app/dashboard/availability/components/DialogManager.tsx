import React from 'react';
import { BaseAvailabilityFormValues, ExceptionFormValues } from '../utils/schemas';
import { TherapistAvailability } from '@/app/hooks/use-therapist-availability';
import { TimeOff } from '@/app/types/index';
import BaseAvailabilityForm from './BaseAvailabilityForm';
import TimeOffManager from './TimeOffManager';
import UnifiedExceptionDialog from './UnifiedExceptionDialog';
import EditTimeOffDialog from './EditTimeOffDialog';
import EditAvailabilityDialog from './EditAvailabilityDialog';
import OverlapDialog from './OverlapDialog';
import { format } from 'date-fns';
import { useDialogState } from '@/app/hooks/use-dialog-state';
import { formatTime } from '../utils/time';

// Define DialogState type based on useDialogState hook
type DialogState<T = undefined> = ReturnType<typeof useDialogState<T>>;

// Define OverlapState type
interface OverlapState {
  isOpen: boolean;
  type: 'availability' | 'time-off' | null;
  data: any; // Contains form data which can vary between different forms
  conflictingItems: any[]; // Contains availability items that conflict
  action: 'add' | 'edit' | null;
}

interface DialogManagerProps {
  baseAvailabilityDialog: DialogState;
  timeOffManagerDialog: DialogState;
  exceptionDialog: DialogState<Date>;
  editTimeOffDialog: DialogState<TimeOff>;
  editAvailabilityDialog: DialogState<TherapistAvailability>;
  overlapState: OverlapState;
  resetOverlapState: () => void;
  availability: TherapistAvailability[];
  deleteAvailability: (id: string) => Promise<void>;
  onSubmitBase: (data: BaseAvailabilityFormValues, skipOverlapCheck?: boolean) => Promise<void>;
  onSubmitUnifiedException: (data: ExceptionFormValues & { start_time: string, end_time: string }) => Promise<void>;
  handleDeleteException: (id: string) => Promise<void>;
  handleEditTimeOff: (timeOff: TimeOff) => void;
  handleEditAvailability: (availability: TherapistAvailability) => void;
  handleSaveTimeOff: (
    id: string, 
    startTime: string, 
    endTime: string, 
    reason: string,
    recurrence: string | null
  ) => Promise<void>;
  handleSaveAvailability: (id: string, startTime: string, endTime: string) => Promise<void>;
  handleTimeOffOverlapConfirm: (action: 'replace' | 'merge') => Promise<void>;
  checkForOverlaps: (formData: BaseAvailabilityFormValues) => { hasOverlap: boolean, overlapDays: string[] };
}

/**
 * Component to manage all the dialogs in the Availability page
 */
const DialogManager: React.FC<DialogManagerProps> = ({
  baseAvailabilityDialog,
  timeOffManagerDialog,
  exceptionDialog,
  editTimeOffDialog,
  editAvailabilityDialog,
  overlapState,
  resetOverlapState,
  availability,
  deleteAvailability,
  onSubmitBase,
  onSubmitUnifiedException,
  handleDeleteException,
  handleEditTimeOff,
  handleEditAvailability,
  handleSaveTimeOff,
  handleSaveAvailability,
  handleTimeOffOverlapConfirm,
  checkForOverlaps
}) => {
  return (
    <>
      <BaseAvailabilityForm
        isOpen={baseAvailabilityDialog.isOpen}
        onOpenChange={(open) => open ? baseAvailabilityDialog.openDialog() : baseAvailabilityDialog.closeDialog()}
        onSubmit={onSubmitBase}
        checkForOverlaps={checkForOverlaps}
      />
      
      <TimeOffManager
        isOpen={timeOffManagerDialog.isOpen}
        onOpenChange={(open) => open ? timeOffManagerDialog.openDialog() : timeOffManagerDialog.closeDialog()}
        onDeleteException={handleDeleteException}
        onAddException={async (formData) => {
          try {
            // Track if this is part of a batch operation
            const isBatchOperation = formData.isBatchOperation;
            
            await onSubmitUnifiedException({
              ...formData,
              skipToast: isBatchOperation // Skip individual toasts for batch operations
            });
            
            // Only close dialog and show toast for the last operation in a batch
            if (!isBatchOperation) {
              timeOffManagerDialog.closeDialog();
            }
            
            return Promise.resolve();
          } catch (error) {
            console.error('Error adding time off:', error);
            return Promise.reject(error);
          }
        }}
      />
      
      <UnifiedExceptionDialog
        isOpen={exceptionDialog.isOpen}
        onOpenChange={(open) => open ? exceptionDialog.openDialog(exceptionDialog.data) : exceptionDialog.closeDialog()}
        onSubmit={onSubmitUnifiedException}
        selectedDate={exceptionDialog.data || undefined}
      />
      
      <EditTimeOffDialog
        isOpen={editTimeOffDialog.isOpen}
        onOpenChange={(open) => open ? editTimeOffDialog.openDialog(editTimeOffDialog.data) : editTimeOffDialog.closeDialog()}
        exception={editTimeOffDialog.data}
        onSave={handleSaveTimeOff}
      />
      
      <EditAvailabilityDialog
        isOpen={editAvailabilityDialog.isOpen}
        onOpenChange={(open) => open ? editAvailabilityDialog.openDialog(editAvailabilityDialog.data) : editAvailabilityDialog.closeDialog()}
        availability={editAvailabilityDialog.data}
        onSave={handleSaveAvailability}
      />
      
      <OverlapDialog
        isOpen={overlapState.isOpen}
        onOpenChange={(open) => {
          if (!open) resetOverlapState();
        }}
        day={overlapState.type === 'availability' 
          ? 'Selected days' 
          : overlapState.data?.recurrence
            ? 'Selected recurring days' 
            : overlapState.data?.start_time
              ? format(new Date(overlapState.data.start_time), 'MMMM d') 
              : 'Selected dates'}
        type={overlapState.type}
        conflictingItems={overlapState.conflictingItems}
        newSlot={{ 
          startTime: overlapState.data?.start_time 
            ? formatTime(overlapState.data.start_time)
            : overlapState.data?.startTime || '09:00', 
          endTime: overlapState.data?.end_time 
            ? formatTime(overlapState.data.end_time)
            : overlapState.data?.endTime || '17:00'
        }}
        existingSlot={{ 
          startTime: overlapState.conflictingItems.length > 0 
            ? formatTime(overlapState.conflictingItems[0].start_time)
            : '09:00', 
          endTime: overlapState.conflictingItems.length > 0 
            ? formatTime(overlapState.conflictingItems[0].end_time)
            : '17:00'
        }}
        mergedSlot={
          overlapState.type === 'time-off' && overlapState.data && overlapState.conflictingItems.length > 0
            ? {
                startTime: overlapState.data.start_time 
                  ? formatTime(overlapState.data.start_time)
                  : overlapState.data.startTime || '09:00',
                endTime: overlapState.data.end_time 
                  ? formatTime(overlapState.data.end_time)
                  : overlapState.data.endTime || '17:00'
              }
            : overlapState.type === 'availability' && overlapState.data && overlapState.conflictingItems.length > 0
            ? {
                startTime: overlapState.data.startTime || '09:00',
                endTime: overlapState.data.endTime || '17:00'
              }
            : { 
                startTime: '09:00', 
                endTime: '17:00' 
              }
        }
        onReplace={() => {
          if (overlapState.type === 'availability') {
            if (overlapState.data) {
              onSubmitBase(overlapState.data, true);
              resetOverlapState();
            }
          } else {
            handleTimeOffOverlapConfirm('replace');
          }
        }}
        onMerge={() => {
          if (overlapState.type === 'availability') {
            if (overlapState.data) {
              onSubmitBase(overlapState.data, true);
              resetOverlapState();
            }
          } else {
            handleTimeOffOverlapConfirm('merge');
          }
        }}
        onCancel={resetOverlapState}
      />
    </>
  );
};

export default DialogManager; 