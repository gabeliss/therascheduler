'use client';

import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppointmentWithClient } from '../types';

interface AppointmentTableProps {
  filteredAppointments: AppointmentWithClient[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  handleSort: (key: string) => void;
  viewAppointmentDetails: (appointment: AppointmentWithClient) => void;
  handleStatusUpdate: (id: string, status: 'pending' | 'confirmed' | 'cancelled' | 'completed') => void;
}

export default function AppointmentTable({
  filteredAppointments,
  activeTab,
  setActiveTab,
  sortConfig,
  handleSort,
  viewAppointmentDetails,
  handleStatusUpdate,
}: AppointmentTableProps) {
  return (
    <>
      {/* Tabs */}
      <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Appointments Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('start_time')}>
                Date & Time
                {sortConfig.key === 'start_time' && (
                  sortConfig.direction === 'asc' ? 
                    <ChevronUp className="inline ml-1 h-4 w-4" /> : 
                    <ChevronDown className="inline ml-1 h-4 w-4" />
                )}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('client')}>
                Client
                {sortConfig.key === 'client' && (
                  sortConfig.direction === 'asc' ? 
                    <ChevronUp className="inline ml-1 h-4 w-4" /> : 
                    <ChevronDown className="inline ml-1 h-4 w-4" />
                )}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                Status
                {sortConfig.key === 'status' && (
                  sortConfig.direction === 'asc' ? 
                    <ChevronUp className="inline ml-1 h-4 w-4" /> : 
                    <ChevronDown className="inline ml-1 h-4 w-4" />
                )}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('type')}>
                Type
                {sortConfig.key === 'type' && (
                  sortConfig.direction === 'asc' ? 
                    <ChevronUp className="inline ml-1 h-4 w-4" /> : 
                    <ChevronDown className="inline ml-1 h-4 w-4" />
                )}
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAppointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                  No appointments found
                </TableCell>
              </TableRow>
            ) : (
              filteredAppointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    {appointment.formatted_start_time 
                      ? (
                        <>
                          {format(new Date(appointment.formatted_start_time), 'MMM d, yyyy h:mm a')}
                          {appointment.formatted_end_time && (
                            <> - {format(new Date(appointment.formatted_end_time), 'h:mm a')}</>
                          )}
                        </>
                      )
                      : (
                        <>
                          {format(new Date(appointment.start_time), 'MMM d, yyyy h:mm a')}
                          {appointment.end_time && (
                            <> - {format(new Date(appointment.end_time), 'h:mm a')}</>
                          )}
                        </>
                      )}
                  </TableCell>
                  <TableCell>{appointment.client?.name || 'Unknown Client'}</TableCell>
                  <TableCell>
                    <Badge className={`${
                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                      appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' :
                      appointment.status === 'cancelled' ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                      appointment.status === 'completed' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' :
                      'bg-gray-100 text-gray-800 hover:bg-gray-100'
                    }`}>
                      {appointment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{appointment.type}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewAppointmentDetails(appointment)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      {appointment.status === 'pending' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                          >
                            Confirm
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {appointment.status === 'confirmed' && new Date(appointment.start_time) < new Date() && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                        >
                          Mark Completed
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
} 