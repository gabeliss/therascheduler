import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

// Import from the new modular structure
import { formatTime } from '../utils/time/format';

interface OverlapDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  day: string;
  type?: 'availability' | 'time-off' | null;
  conflictingItems?: any[];
  newSlot: {
    startTime: string;
    endTime: string;
  };
  existingSlot: {
    startTime: string;
    endTime: string;
  };
  mergedSlot: {
    startTime: string;
    endTime: string;
  };
  onMerge: () => void;
  onReplace: () => void;
  onCancel?: () => void;
  onConfirm?: ((action: 'replace' | 'merge') => Promise<void>) | (() => void);
}

const OverlapDialog = ({
  isOpen,
  onOpenChange,
  day,
  type,
  conflictingItems,
  newSlot,
  existingSlot,
  mergedSlot,
  onMerge,
  onReplace,
  onCancel,
  onConfirm,
}: OverlapDialogProps) => {
  console.log('day', day);
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center text-amber-600 mb-2">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <DialogTitle>Overlapping Time Slots</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <p className="mb-4">
            Your new availability for <span className="font-semibold">{day.split(',')[0]}</span> overlaps with an existing time slot:
          </p>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-100 rounded-md">
              <span className="font-medium">New slot:</span>
              <span>{formatTime(newSlot.startTime)} - {formatTime(newSlot.endTime)}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-md">
              <span className="font-medium">Existing slot:</span>
              <span>{formatTime(existingSlot.startTime)} - {formatTime(existingSlot.endTime)}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-green-50 border border-green-100 rounded-md">
              <span className="font-medium">Merged result:</span>
              <span>{formatTime(mergedSlot.startTime)} - {formatTime(mergedSlot.endTime)}</span>
            </div>
          </div>
          
          <p className="text-gray-600 text-sm">
            {day.includes(',') ? 
              'Please choose how you would like to handle these overlaps. Your choice will be applied to all affected days.' :
              'Please choose how you would like to handle this overlap:'}
          </p>
        </div>
        
        <DialogFooter className="flex justify-center gap-4 mt-6 sm:justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (onCancel) onCancel();
              onOpenChange(false);
            }}
            className="min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onReplace();
              onOpenChange(false);
            }}
            className="min-w-[120px]"
          >
            Replace Existing
          </Button>
          <Button
            type="button"
            onClick={() => {
              onMerge();
              onOpenChange(false);
            }}
            className="min-w-[100px]"
          >
            Merge Slots
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OverlapDialog; 