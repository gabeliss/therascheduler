'use client';

import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AppointmentWithClient } from '../types';

interface AppointmentDetailsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentWithClient | null;
  handleStatusUpdate: (id: string, status: 'pending' | 'confirmed' | 'cancelled' | 'completed') => void;
}

export default function AppointmentDetails({
  isOpen,
  onOpenChange,
  appointment,
  handleStatusUpdate,
}: AppointmentDetailsProps) {
  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Client</h3>
              <p className="text-base font-medium">{appointment.client?.name || 'Unknown Client'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <Badge className={`mt-1 ${
                appointment.status === 'confirmed' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' :
                appointment.status === 'cancelled' ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                appointment.status === 'completed' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' :
                'bg-gray-100 text-gray-800 hover:bg-gray-100'
              }`}>
                {appointment.status}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Email</h3>
              <p className="text-base">{appointment.client?.email || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Phone</h3>
              <p className="text-base">{appointment.client?.phone || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Start Time</h3>
              <p className="text-base">
                {appointment.formatted_start_time 
                  ? format(new Date(appointment.formatted_start_time), 'MMM d, yyyy h:mm a')
                  : format(new Date(appointment.start_time), 'MMM d, yyyy h:mm a')}
                {appointment.time_zone_abbr && ` (${appointment.time_zone_abbr})`}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">End Time</h3>
              <p className="text-base">
                {appointment.formatted_end_time 
                  ? format(new Date(appointment.formatted_end_time), 'h:mm a')
                  : format(new Date(appointment.end_time), 'h:mm a')}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Appointment Type</h3>
            <p className="text-base">{appointment.type}</p>
          </div>

          {appointment.notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Notes</h3>
              <p className="text-base whitespace-pre-wrap">{appointment.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-4 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex gap-2">
            {appointment.status === 'pending' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    handleStatusUpdate(appointment.id, 'confirmed');
                    onOpenChange(false);
                  }}
                >
                  Confirm
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    handleStatusUpdate(appointment.id, 'cancelled');
                    onOpenChange(false);
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
            {appointment.status === 'confirmed' && new Date(appointment.start_time) < new Date() && (
              <Button 
                variant="outline" 
                onClick={() => {
                  handleStatusUpdate(appointment.id, 'completed');
                  onOpenChange(false);
                }}
              >
                Mark Completed
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 