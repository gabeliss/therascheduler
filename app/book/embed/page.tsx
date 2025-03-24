'use client';

import { useState, useEffect } from 'react';
import { format, addMinutes, parse } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/app/utils/supabase';
import { Loader2, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getDaysOfWeekFromRecurrence, DayOfWeek } from '@/app/utils/schema-converters';

// Update interface to use new schema
interface AvailableSlot {
  id: string;
  therapist_id: string;
  start_time: string;
  end_time: string;
  recurrence: string | null;
}

interface TherapistInfo {
  id: string;
  name: string;
  email: string;
}

interface BookingFormData {
  name: string;
  email: string;
  phone: string;
  notes: string;
  createAccount: boolean;
}

export default function EmbeddedBookingPage() {
  const searchParams = useSearchParams();
  const therapistId = searchParams.get('therapist');
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [timeSlots, setTimeSlots] = useState<{time: string, formatted: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [therapistLoading, setTherapistLoading] = useState(true);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [therapist, setTherapist] = useState<TherapistInfo | null>(null);
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    email: '',
    phone: '',
    notes: '',
    createAccount: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Send messages to parent window
  const sendMessageToParent = (message: any) => {
    if (window.parent) {
      window.parent.postMessage(message, '*');
    }
  };

  // Fetch therapist info on load
  useEffect(() => {
    async function fetchTherapistInfo() {
      if (!therapistId) {
        setError('No therapist specified. Please use a valid booking link.');
        setTherapistLoading(false);
        sendMessageToParent({ type: 'booking-error', message: 'No therapist specified' });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('therapists')
          .select('id, name, email')
          .eq('id', therapistId)
          .single();

        if (error) throw error;
        if (!data) {
          setError('Therapist not found. Please check your booking link.');
          sendMessageToParent({ type: 'booking-error', message: 'Therapist not found' });
        } else {
          setTherapist(data);
        }
      } catch (err) {
        console.error('Error fetching therapist:', err);
        setError('Unable to load therapist information. Please try again later.');
        sendMessageToParent({ type: 'booking-error', message: 'Unable to load therapist information' });
      } finally {
        setTherapistLoading(false);
      }
    }

    fetchTherapistInfo();
  }, [therapistId]);

  // Fetch available slots when date or therapist changes
  useEffect(() => {
    if (date && therapist) {
      fetchAvailableSlots();
    }
  }, [date, therapist]);

  const fetchAvailableSlots = async () => {
    if (!date || !therapist) return;
    
    setLoading(true);
    setError('');
    setTimeSlots([]);
    setSelectedTime(null);
    
    try {
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Get all availability for this therapist
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('availability')
        .select('id, therapist_id, start_time, end_time, recurrence')
        .eq('therapist_id', therapist.id);
      
      if (availabilityError) throw availabilityError;
      
      // Filter for recurring slots matching the day of week and one-time slots for this date
      const filteredSlots = (availabilityData || []).filter(slot => {
        if (slot.recurrence) {
          // For recurring slots, check if this day of week is included in the recurrence pattern
          const daysOfWeek = getDaysOfWeekFromRecurrence(slot.recurrence);
          return daysOfWeek.includes(dayOfWeek as DayOfWeek);
        } else {
          // For one-time slots, check if the date matches
          const slotDate = new Date(slot.start_time);
          const slotDateStr = format(slotDate, 'yyyy-MM-dd');
          return slotDateStr === formattedDate;
        }
      });
      
      setAvailableSlots(filteredSlots);
      
      // Generate time slots from availability
      if (filteredSlots.length > 0) {
        const slots = generateTimeSlots(filteredSlots, formattedDate);
        setTimeSlots(slots);
      }
    } catch (err) {
      console.error('Error fetching availability:', err);
      setError('Failed to load available time slots. Please try again.');
      sendMessageToParent({ type: 'booking-error', message: 'Failed to load available time slots' });
    } finally {
      setLoading(false);
    }
  };

  // Update generateTimeSlots function to extract time from ISO timestamps
  const generateTimeSlots = (slots: AvailableSlot[], dateStr: string) => {
    const timeSlots: {time: string, formatted: string}[] = [];
    
    slots.forEach(slot => {
      // Extract time parts from ISO timestamps
      const startTime = new Date(slot.start_time);
      const endTime = new Date(slot.end_time);
      
      // If the slot is a one-time slot for a specific date, make sure it's for today
      if (!slot.recurrence) {
        const slotDateStr = format(startTime, 'yyyy-MM-dd');
        if (slotDateStr !== dateStr) return;
      }
      
      // Generate 30-minute slots from start to end time
      let currentTime = new Date(startTime);
      while (currentTime < endTime) {
        const timeStr = format(currentTime, 'HH:mm');
        timeSlots.push({
          time: timeStr,
          formatted: format(currentTime, 'h:mm a')
        });
        currentTime = addMinutes(currentTime, 30); // 30-minute slots
      }
    });
    
    // Sort by time
    return timeSlots.sort((a, b) => a.time.localeCompare(b.time));
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      createAccount: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTime || !date || !therapist) {
      setError('Please select a date and time for your appointment.');
      return;
    }
    
    if (!formData.name || !formData.email) {
      setError('Please provide your name and email.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Format the appointment date and time
      const appointmentDate = format(date, 'yyyy-MM-dd');
      const startTime = `${appointmentDate}T${selectedTime}:00`;
      const endTime = format(addMinutes(new Date(`${appointmentDate}T${selectedTime}:00`), 50), "yyyy-MM-dd'T'HH:mm:ss");
      
      // Check if client exists
      const { data: existingClients, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('email', formData.email)
        .limit(1);
      
      if (clientError) throw clientError;
      
      let clientId;
      
      if (existingClients && existingClients.length > 0) {
        // Use existing client
        clientId = existingClients[0].id;
      } else {
        // Create new client
        const { data: newClient, error: createError } = await supabase
          .from('clients')
          .insert({
            name: formData.name,
            email: formData.email,
            phone: formData.phone
          })
          .select('id')
          .single();
        
        if (createError) throw createError;
        clientId = newClient.id;
      }
      
      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          therapist_id: therapist.id,
          client_id: clientId,
          start_time: startTime,
          end_time: endTime,
          status: 'pending',
          notes: formData.notes
        });
      
      if (appointmentError) throw appointmentError;
      
      // Success!
      setSuccess(true);
      
      // Send success message to parent window
      sendMessageToParent({ 
        type: 'booking-success', 
        data: {
          therapistName: therapist.name,
          clientName: formData.name,
          appointmentDate: format(date, 'EEEE, MMMM do, yyyy'),
          appointmentTime: format(parse(selectedTime, 'HH:mm', new Date()), 'h:mm a')
        }
      });
      
      // Send email notification request
      try {
        await fetch('/api/email/appointment-request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            therapistId: therapist.id,
            clientName: formData.name,
            clientEmail: formData.email,
            appointmentDate: format(date, 'EEEE, MMMM do, yyyy'),
            appointmentTime: format(parse(selectedTime, 'HH:mm', new Date()), 'h:mm a'),
            notes: formData.notes
          }),
        });
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        // Don't fail the booking if email fails
      }
      
    } catch (err) {
      console.error('Error booking appointment:', err);
      setError('Failed to book appointment. Please try again.');
      sendMessageToParent({ type: 'booking-error', message: 'Failed to book appointment' });
    } finally {
      setLoading(false);
    }
  };

  if (therapistLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !therapist) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Embedded version has a more compact layout
  return (
    <div className="p-4">
      {therapist && (
        <div>
          <h1 className="text-xl font-bold mb-2">Book with {therapist.name}</h1>
          
          {success ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-green-600">Appointment Request Submitted!</h2>
                  <p>Your appointment request has been sent to {therapist.name}. You will receive a confirmation email once it's approved.</p>
                  <div className="bg-gray-50 p-4 rounded-md text-sm">
                    <p className="font-medium">Appointment Details:</p>
                    <p>Date: {format(date!, 'EEEE, MMMM do, yyyy')}</p>
                    <p>Time: {format(parse(selectedTime!, 'HH:mm', new Date()), 'h:mm a')}</p>
                    <p>Status: Pending approval</p>
                  </div>
                  <Button onClick={() => {
                    setSuccess(false);
                    setDate(new Date());
                    setSelectedTime(null);
                    setFormData({
                      name: '',
                      email: '',
                      phone: '',
                      notes: '',
                      createAccount: false
                    });
                  }}>
                    Book Another Appointment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" /> Select a Date
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={{ before: new Date() }}
                      className="rounded-md border"
                    />
                  </CardContent>
                </Card>
              </div>
              
              <div className="md:col-span-3">
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Available Times
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {date ? format(date, 'EEEE, MMMM do, yyyy') : 'Please select a date'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : timeSlots.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {timeSlots.map((slot, index) => (
                          <Button
                            key={index}
                            variant={selectedTime === slot.time ? "default" : "outline"}
                            className="w-full text-sm py-1 h-auto"
                            onClick={() => handleTimeSelect(slot.time)}
                          >
                            {slot.formatted}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No available slots for this date.
                      </div>
                    )}
                    
                    {error && (
                      <div className="mt-4 text-red-500 text-xs">
                        {error}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {selectedTime && (
                <div className="md:col-span-5">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Your Information</CardTitle>
                      <CardDescription className="text-xs">
                        Please provide your details to book the appointment
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="name" className="text-sm">Full Name</Label>
                            <Input
                              id="name"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              required
                              className="h-8 text-sm"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <Label htmlFor="email" className="text-sm">Email</Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              required
                              className="h-8 text-sm"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <Label htmlFor="phone" className="text-sm">Phone Number</Label>
                            <Input
                              id="phone"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="notes" className="text-sm">Notes (Optional)</Label>
                          <Textarea
                            id="notes"
                            name="notes"
                            placeholder="Any specific concerns or questions?"
                            value={formData.notes}
                            onChange={handleInputChange}
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="createAccount" 
                            checked={formData.createAccount}
                            onCheckedChange={handleCheckboxChange}
                          />
                          <Label htmlFor="createAccount" className="text-xs font-normal">
                            Create an account for faster booking in the future
                          </Label>
                        </div>
                        
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            'Request Appointment'
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 