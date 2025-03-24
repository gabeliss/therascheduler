'use client';

import { useState, useEffect } from 'react';
import { format, addMinutes, parse, getDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/app/utils/supabase';
import { Loader2, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useAuth } from '@/app/context/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getDaysOfWeekFromRecurrence, DayOfWeek } from '@/app/utils/schema-converters';

interface AvailabilitySlot {
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

export default function BookAppointmentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const therapistId = searchParams.get('therapist');
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
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

  // Fetch therapist info on load
  useEffect(() => {
    async function fetchTherapistInfo() {
      if (!therapistId) {
        setError('No therapist specified. Please use a valid booking link.');
        setTherapistLoading(false);
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
        } else {
          setTherapist(data);
        }
      } catch (err) {
        console.error('Error fetching therapist:', err);
        setError('Unable to load therapist information. Please try again later.');
      } finally {
        setTherapistLoading(false);
      }
    }

    fetchTherapistInfo();
  }, [therapistId]);

  // Pre-fill form data if user is logged in
  useEffect(() => {
    if (user) {
      const userName = user.user_metadata?.name || '';
      setFormData(prev => ({
        ...prev,
        name: userName,
        email: user.email || '',
      }));
    }
  }, [user]);

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
      const dayOfWeek = date.getDay() as DayOfWeek; // 0 = Sunday, 6 = Saturday
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Fetch all availability for this therapist
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('availability')
        .select('id, therapist_id, start_time, end_time, recurrence')
        .eq('therapist_id', therapist.id);
      
      if (availabilityError) throw availabilityError;
      
      // Filter the results client-side
      let allSlots: AvailabilitySlot[] = [];
      
      if (availabilityData) {
        // Filter recurring availability for this day of week
        const recurringSlots = availabilityData.filter(slot => {
          if (!slot.recurrence) return false;
          const daysOfWeek = getDaysOfWeekFromRecurrence(slot.recurrence);
          return daysOfWeek.includes(dayOfWeek);
        });
        
        // Filter specific date availability
        const specificSlots = availabilityData.filter(slot => {
          if (slot.recurrence) return false;
          // Extract the date from the start_time ISO string
          const slotDate = new Date(slot.start_time);
          const slotDateStr = format(slotDate, 'yyyy-MM-dd');
          return slotDateStr === formattedDate;
        });
        
        allSlots = [...recurringSlots, ...specificSlots];
      }
      
      setAvailableSlots(allSlots);
      
      // Generate time slots from availability
      if (allSlots.length > 0) {
        const slots = generateTimeSlots(allSlots, formattedDate);
        setTimeSlots(slots);
      }
    } catch (err) {
      console.error('Error fetching availability:', err);
      setError('Failed to load available time slots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate 30-minute time slots from availability ranges
  const generateTimeSlots = (slots: AvailabilitySlot[], dateStr: string) => {
    const timeSlots: {time: string, formatted: string}[] = [];
    
    slots.forEach(slot => {
      // Extract the time part from ISO timestamps for recurring slots
      // or use the actual timestamps for specific date slots
      let startDateTime, endDateTime;
      
      if (slot.recurrence) {
        // For recurring slots, combine the selected date with the time from start_time
        const startTime = new Date(slot.start_time);
        const endTime = new Date(slot.end_time);
        
        // Extract just the time components
        const startHours = startTime.getHours();
        const startMinutes = startTime.getMinutes();
        const endHours = endTime.getHours();
        const endMinutes = endTime.getMinutes();
        
        // Create new dates using the selected date and extracted times
        startDateTime = new Date(dateStr);
        startDateTime.setHours(startHours, startMinutes, 0, 0);
        
        endDateTime = new Date(dateStr);
        endDateTime.setHours(endHours, endMinutes, 0, 0);
      } else {
        // For specific date slots, use the timestamps directly
        startDateTime = new Date(slot.start_time);
        endDateTime = new Date(slot.end_time);
      }
      
      let currentTime = startDateTime;
      while (currentTime < endDateTime) {
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
      
      // TODO: Send email notifications
      
    } catch (err) {
      console.error('Error booking appointment:', err);
      setError('Failed to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (therapistLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !therapist) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {therapist && (
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Book an Appointment with {therapist.name}</h1>
          <p className="text-gray-600 mb-6">Select a date and time for your appointment</p>
          
          {success ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-semibold text-green-600">Appointment Request Submitted!</h2>
                  <p>Your appointment request has been sent to {therapist.name}. You will receive a confirmation email once it's approved.</p>
                  <Button onClick={() => {
                    setSuccess(false);
                    setDate(new Date());
                    setSelectedTime(null);
                  }}>
                    Book Another Appointment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5" /> Select a Date
                    </CardTitle>
                    <CardDescription>Choose a date for your appointment</CardDescription>
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
              
              <div className="md:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" /> Available Time Slots
                    </CardTitle>
                    <CardDescription>
                      {date ? format(date, 'EEEE, MMMM do, yyyy') : 'Please select a date'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : timeSlots.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {timeSlots.map((slot, index) => (
                          <Button
                            key={index}
                            variant={selectedTime === slot.time ? "default" : "outline"}
                            className="w-full"
                            onClick={() => handleTimeSelect(slot.time)}
                          >
                            {slot.formatted}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No available slots for this date. Please select another date.
                      </div>
                    )}
                    
                    {error && (
                      <div className="mt-4 text-red-500 text-sm">
                        {error}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {selectedTime && (
                <div className="md:col-span-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Information</CardTitle>
                      <CardDescription>Please provide your details to book the appointment</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                              id="name"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="notes">Notes (Optional)</Label>
                          <Textarea
                            id="notes"
                            name="notes"
                            placeholder="Any specific concerns or questions?"
                            value={formData.notes}
                            onChange={handleInputChange}
                            rows={3}
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="createAccount" 
                            checked={formData.createAccount}
                            onCheckedChange={handleCheckboxChange}
                          />
                          <Label htmlFor="createAccount" className="text-sm font-normal">
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