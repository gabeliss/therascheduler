'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { AvailabilityConflict, TimeOffConflict, AppointmentConflict } from '@/app/hooks/use-appointments';
import { AlertCircle, Calendar, Clock, Info, AlertTriangle, CheckCircle2, Check, Users } from 'lucide-react';
import { format } from 'date-fns';
import { formatTime } from '@/app/dashboard/availability/utils/time/format';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  availabilityConflict: AvailabilityConflict | null;
  timeOffConflict: TimeOffConflict | null;
  appointmentConflict: AppointmentConflict | null;
  onCancel: () => void;
  onOverride: (reason: string) => void;
  onReschedule: () => void;
}

export default function EnhancedConflictResolutionDialog({
  isOpen,
  onOpenChange,
  availabilityConflict,
  timeOffConflict,
  appointmentConflict,
  onCancel,
  onOverride,
  onReschedule
}: ConflictResolutionDialogProps) {
  const [overrideReason, setOverrideReason] = useState('');
  const [confirmOverride, setConfirmOverride] = useState(false);
  
  // Determine the severity of the conflict
  const isHighSeverity = appointmentConflict || (timeOffConflict && timeOffConflict.exception && !timeOffConflict.exception.is_recurring);
  const isMediumSeverity = !appointmentConflict && timeOffConflict && timeOffConflict.exception && timeOffConflict.exception.is_recurring;
  const isLowSeverity = !appointmentConflict && availabilityConflict && !timeOffConflict;
  
  // Reset state when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setOverrideReason('');
      setConfirmOverride(false);
    }
    onOpenChange(open);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className={cn(
            "flex items-center",
            isHighSeverity ? "text-red-600" : 
            isMediumSeverity ? "text-amber-600" : 
            "text-yellow-600"
          )}>
            <AlertCircle className="h-5 w-5 mr-2" />
            Scheduling Conflict Detected
          </DialogTitle>
          <DialogDescription>
            {appointmentConflict 
              ? "This appointment conflicts with an existing appointment."
              : "This appointment conflicts with your availability or time-off settings."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {/* Conflict Summary */}
          <div className={cn(
            "p-4 rounded-md border",
            isHighSeverity ? "bg-red-50 border-red-200" : 
            isMediumSeverity ? "bg-amber-50 border-amber-200" : 
            "bg-yellow-50 border-yellow-200"
          )}>
            <h3 className={cn(
              "font-semibold flex items-center mb-2",
              isHighSeverity ? "text-red-700" : 
              isMediumSeverity ? "text-amber-700" : 
              "text-yellow-700"
            )}>
              {isHighSeverity ? (
                <AlertTriangle className="h-4 w-4 mr-2" />
              ) : (
                <Info className="h-4 w-4 mr-2" />
              )}
              {appointmentConflict ? "Appointment Time Conflict" :
               isHighSeverity ? "High Priority Conflict" : 
               isMediumSeverity ? "Recurring Time-Off Conflict" : 
               "Outside Regular Hours"}
            </h3>
            <p className={cn(
              "text-sm",
              isHighSeverity ? "text-red-700" : 
              isMediumSeverity ? "text-amber-700" : 
              "text-yellow-700"
            )}>
              {appointmentConflict ? 
                "This time slot overlaps with an existing appointment. Double-booking is not recommended." :
                isHighSeverity ? 
                "This appointment conflicts with a specific time-off period you've scheduled. Booking during this time is not recommended." : 
                isMediumSeverity ? 
                "This appointment conflicts with your recurring time-off. You may want to reschedule." : 
                "This appointment is outside your regular availability hours."}
            </p>
          </div>
          
          {/* Appointment Conflict Details */}
          {appointmentConflict && (
            <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
              <h3 className="font-semibold text-gray-700 flex items-center mb-2">
                <Users className="h-4 w-4 mr-2" />
                Appointment Conflict Details
              </h3>
              <p className="text-gray-700 text-sm">{appointmentConflict?.message}</p>
              <p className="text-gray-500 text-xs mt-2">
                Double-booking appointments can lead to scheduling issues and client dissatisfaction.
              </p>
            </div>
          )}
          
          {/* Availability Conflict Details */}
          {availabilityConflict && (
            <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
              <h3 className="font-semibold text-gray-700 flex items-center mb-2">
                <Clock className="h-4 w-4 mr-2" />
                Availability Conflict Details
              </h3>
              <p className="text-gray-700 text-sm">{availabilityConflict?.message}</p>
              <p className="text-gray-500 text-xs mt-2">
                Consider updating your regular availability if you plan to take appointments during these hours regularly.
              </p>
            </div>
          )}
          
          {/* Time-Off Conflict Details */}
          {timeOffConflict && timeOffConflict.exception && (
            <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
              <h3 className="font-semibold text-gray-700 flex items-center mb-2">
                <Calendar className="h-4 w-4 mr-2" />
                Time-Off Conflict Details
              </h3>
              <p className="text-gray-700 text-sm">{timeOffConflict?.message}</p>
              
              {timeOffConflict.exception.is_recurring ? (
                <div className="mt-2 text-xs text-gray-600">
                  <p>Recurring time-off: {formatTime(timeOffConflict.exception.start_time)} - {formatTime(timeOffConflict.exception.end_time)}</p>
                  <p className="mt-1">This time is blocked off every {format(new Date(2023, 0, (timeOffConflict.exception.day_of_week || 0) + 1), 'EEEE')}.</p>
                </div>
              ) : (
                <div className="mt-2 text-xs text-gray-600">
                  <p>Time-off period: {timeOffConflict.exception.start_date && format(new Date(timeOffConflict.exception.start_date), 'MMM d, yyyy')} to {timeOffConflict.exception.end_date && format(new Date(timeOffConflict.exception.end_date), 'MMM d, yyyy')}</p>
                  {timeOffConflict.exception.reason && (
                    <p className="mt-1">Reason: {timeOffConflict.exception.reason}</p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Override Reason Input */}
          {(appointmentConflict || timeOffConflict || availabilityConflict) && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">
                Reason for overriding {appointmentConflict ? 'appointment conflict' : timeOffConflict ? 'time-off' : 'availability'} (required)
              </label>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g., Emergency session, client requested this specific time, one-time exception"
                className="resize-none"
              />
              
              {isHighSeverity && (
                <div className="mt-4">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setConfirmOverride(prev => !prev)}
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                        confirmOverride 
                          ? "border-primary bg-primary text-primary-foreground" 
                          : "border-primary"
                      )}
                    >
                      {confirmOverride && <Check className="h-3 w-3" />}
                    </button>
                    <Label 
                      className="text-sm text-red-700 font-medium cursor-pointer"
                      onClick={() => setConfirmOverride(prev => !prev)}
                    >
                      {appointmentConflict 
                        ? "I understand this conflicts with an existing appointment and confirm I want to double-book anyway"
                        : "I understand this conflicts with my scheduled time-off and confirm I want to book anyway"}
                    </Label>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Recommendations */}
          <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
            <h3 className="font-semibold text-blue-700 flex items-center mb-2">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Recommendations
            </h3>
            <ul className="text-blue-700 text-sm list-disc pl-5 space-y-1">
              <li>Consider rescheduling to a time within your regular availability</li>
              {appointmentConflict && (
                <li>Choose a time slot that doesn't overlap with existing appointments</li>
              )}
              {timeOffConflict && (
                <li>If this is an exception, provide a clear reason for overriding your time-off</li>
              )}
              {availabilityConflict && (
                <li>If you regularly want to book during these hours, update your availability settings</li>
              )}
            </ul>
          </div>
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
              className={cn(
                isHighSeverity ? "bg-red-600 hover:bg-red-700" : 
                isMediumSeverity ? "bg-amber-600 hover:bg-amber-700" : 
                "bg-yellow-600 hover:bg-yellow-700"
              )}
              disabled={isHighSeverity ? (!overrideReason.trim() || !confirmOverride) : false}
            >
              {appointmentConflict ? "Double-Book Anyway" : isHighSeverity ? "Override Time-Off" : "Schedule Anyway"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 