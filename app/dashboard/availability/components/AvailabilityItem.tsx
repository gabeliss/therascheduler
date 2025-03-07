import React from 'react';
import { Clock, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/Accordion';
import { formatTime } from '../utils/time-utils';
import { HierarchicalItem } from '../utils/types';

interface AvailabilityItemProps {
  item: HierarchicalItem;
  onAddException: (baseId: string, baseStartTime: string, baseEndTime: string, specificDate?: Date) => void;
  onDeleteBase: (id: string) => void;
  onDeleteException: (id: string) => void;
  formatDate: (dateString: string | undefined) => string;
  showDateBadge?: boolean;
}

const AvailabilityItem = ({
  item,
  onAddException,
  onDeleteBase,
  onDeleteException,
  formatDate,
  showDateBadge = false
}: AvailabilityItemProps) => {
  return (
    <Accordion className="mb-4 border rounded-md overflow-hidden">
      <AccordionItem value={item.base.id} className="border-0">
        <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
          <div className="flex flex-col items-start">
            <div className="flex items-center">
              <span>
                {formatTime(item.base.start_time)} - {formatTime(item.base.end_time)}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteBase(item.base.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="p-4 border-t">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium">Time Off</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log("Opening exception dialog for base ID:", item.base.id);
                  onAddException(item.base.id, item.base.start_time, item.base.end_time);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Recurring Time Off
              </Button>
            </div>
            
            {item.exceptions.length > 0 ? (
              <div className="space-y-2">
                {item.exceptions.map((exception) => (
                  <div
                    key={exception.id}
                    className="flex justify-between items-center p-2 rounded-md border"
                  >
                    <div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span>
                          {formatTime(exception.start_time)} - {formatTime(exception.end_time)}
                        </span>
                      </div>
                      {exception.reason && (
                        <div className="text-sm text-gray-500 ml-6">
                          {exception.reason}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log("Deleting time off for exception ID:", exception.id);
                        onDeleteException(exception.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No time off for this time slot.</p>
                <p className="text-sm">
                  Add time off for lunch breaks, meetings, or other blocked times.
                </p>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default AvailabilityItem; 