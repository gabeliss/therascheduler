'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/app/utils/supabase';
import { Loader2 } from 'lucide-react';

interface AvailableSlot {
  id: string;
  therapist_id: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  therapist_name: string;
}

interface BookingFormData {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export default function BookAppointmentPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available slots when date changes
  useEffect(() => {
    if (!date) return;
    
    const fetchAvailableSlots = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        const formattedDate = format(date, 'yyyy-MM-dd');
        
        // Get recurring availability for this day of week
        const { data: recurringSlots, error: recurringError } = await supabase
          .from('availability')
          .select(`
            id,
            therapist_id,
            start_time,
            end_time,
            day_of_week,
            therapist_profiles:therapist_id (
              name
            )
          `)
          .eq('day_of_week', dayOfWeek)
          .eq('is_recurring', true);
          
        if (recurringError) throw recurringError;
        
        // Get specific availability for this date
        const { data: specificSlots, error: specificError } = await supabase
          .from('availability')
          .select(`
            id,
            therapist_id,
            start_time,
            end_time,
            day_of_week,
            therapist_profiles:therapist_id (
              name
            )
          `)
          .eq('specific_date', formattedDate);
          
        if (specificError) throw specificError;
        
        // Combine and format slots
        const allSlots = [...(recurringSlots || []), ...(specificSlots || [])];
        
        // Format the slots with therapist name
        const formattedSlots: AvailableSlot[] = allSlots.map((slot: any) => {
          // Extract therapist name safely
          let therapistName = 'Unknown Therapist';
          try {
            if (slot.therapist_profiles && typeof slot.therapist_profiles === 'object') {
              therapistName = slot.therapist_profiles.name || 'Unknown Therapist';
            }
          } catch (e) {
            console.error('Error extracting therapist name:', e);
          }
          
          return {
            id: slot.id,
            therapist_id: slot.therapist_id,
            start_time: slot.start_time,
            end_time: slot.end_time,
            day_of_week: slot.day_of_week,
            therapist_name: therapistName
          };
        });
        
        setAvailableSlots(formattedSlots);
      } catch (err) {
        console.error('Error fetching available slots:', err);
        setError('Failed to load available slots. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAvailableSlots();
  }, [date]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSlot) {
      setError('Please select a time slot');
      return;
    }
    
    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Format the appointment date and time
      const appointmentDate = format(date!, 'yyyy-MM-dd');
      const startTime = `${appointmentDate}T${selectedSlot.start_time}`;
      const endTime = `${appointmentDate}T${selectedSlot.end_time}`;
      
      // Create the appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert([
          {
            therapist_id: selectedSlot.therapist_id,
            client_name: formData.name,
            client_email: formData.email,
            client_phone: formData.phone,
            start_time: startTime,
            end_time: endTime,
            notes: formData.notes,
            status: 'pending'
          }
        ]);
        
      if (appointmentError) throw appointmentError;
      
      setSuccess(true);
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        notes: '',
      });
      setSelectedSlot(null);
    } catch (err) {
      console.error('Error booking appointment:', err);
      setError('Failed to book appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Book an Appointment</h1>
      
      {success ? (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-green-600">Appointment Requested!</CardTitle>
            <CardDescription>
              Your appointment request has been submitted. The therapist will review your request and confirm the appointment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setSuccess(false)} className="w-full">Book Another Appointment</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Select a Date</CardTitle>
              <CardDescription>Choose a date for your appointment</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
          
          <div>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Available Time Slots</CardTitle>
                <CardDescription>Select a time slot for {date ? format(date, 'EEEE, MMMM d, yyyy') : 'your appointment'}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.id}
                        variant={selectedSlot?.id === slot.id ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => setSelectedSlot(slot)}
                      >
                        <div className="text-left">
                          <div>{slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}</div>
                          <div className="text-xs text-muted-foreground">{slot.therapist_name}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No available slots for this date. Please select another date.</p>
                )}
              </CardContent>
            </Card>
            
            {selectedSlot && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Information</CardTitle>
                  <CardDescription>Please provide your details to book the appointment</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleInputChange} 
                        required 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
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
                      <Label htmlFor="phone">Phone</Label>
                      <Input 
                        id="phone" 
                        name="phone" 
                        value={formData.phone} 
                        onChange={handleInputChange} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea 
                        id="notes" 
                        name="notes" 
                        value={formData.notes} 
                        onChange={handleInputChange} 
                        placeholder="Any additional information you'd like to share"
                      />
                    </div>
                    
                    {error && (
                      <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                        {error}
                      </div>
                    )}
                    
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Booking...
                        </>
                      ) : (
                        'Book Appointment'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}