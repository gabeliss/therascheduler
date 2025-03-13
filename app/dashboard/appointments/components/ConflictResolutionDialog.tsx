'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { AvailabilityConflict, TimeOffConflict } from '@/app/hooks/use-appointments';
import { AlertCircle, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { formatTime } from '@/app/utils/time-utils';

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  availabilityConflict: AvailabilityConflict | null;
  timeOffConflict: TimeOffConflict | null;
  onCancel: () => void;
  onOverride: (reason: string) => void;
  onReschedule: () => void;
}

export default function ConflictResolutionDialog({
  isOpen,
  onOpenChange,
  availabilityConflict,
  timeOffConflict,
  onCancel,
  onOverride,
  onReschedule
}: ConflictResolutionDialogProps) {
  const [overrideReason, setOverrideReason] = useState('');
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-amber-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            Scheduling Conflict Detected
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {availabilityConflict && (
            <div className="mb-6 p-4 bg-amber-50 rounded-md border border-amber-200">
              <h3 className="font-semibold text-amber-700 flex items-center mb-2">
                <Clock className="h-4 w-4 mr-2" />
                Outside Regular Hours
              </h3>
              <p className="text-amber-700 text-sm">{availabilityConflict.message}</p>
            </div>
          )}
          
          {timeOffConflict && (
            <div className="mb-6 p-4 bg-red-50 rounded-md border border-red-200">
              <h3 className="font-semibold text-red-700 flex items-center mb-2">
                <Calendar className="h-4 w-4 mr-2" />
                Time-Off Conflict
              </h3>
              <p className="text-red-700 text-sm">{timeOffConflict.message}</p>
              
              {timeOffConflict.exception.is_recurring ? (
                <div className="mt-2 text-xs text-red-600">
                  <p>Recurring time-off: {formatTime(timeOffConflict.exception.start_time)} - {formatTime(timeOffConflict.exception.end_time)}</p>
                </div>
              ) : (
                <div className="mt-2 text-xs text-red-600">
                  <p>Time-off period: {timeOffConflict.exception.start_date && format(new Date(timeOffConflict.exception.start_date), 'MMM d, yyyy')} to {timeOffConflict.exception.end_date && format(new Date(timeOffConflict.exception.end_date), 'MMM d, yyyy')}</p>
                </div>
              )}
            </div>
          )}
          
          {timeOffConflict && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">
                Reason for overriding time-off (optional)
              </label>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g., Emergency session, client requested this specific time"
                className="resize-none"
              />
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between mt-6 gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onReschedule}>
              Reschedule
            </Button>
            <Button 
              onClick={() => onOverride(overrideReason)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Schedule Anyway
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 