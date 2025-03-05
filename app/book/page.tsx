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
import { useAuth } from '@/app/context/auth-context';
import { useRouter } from 'next/navigation';

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
  password?: string;
  createAccount: boolean;
}

export default function BookAppointmentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    email: '',
    phone: '',
    notes: '',
    password: '',
    createAccount: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (date) {
      fetchAvailableSlots();
    }
  }, [date]);

  useEffect(() => {
    // Pre-fill form data if user is logged in
    if (user) {
      // This assumes user metadata contains name
      const userName = user.user_metadata?.name || '';
      setFormData(prev => ({
        ...prev,
        name: userName,
        email: user.email || '',
      }));
    }
  }, [user]);

  const fetchAvailableSlots = async () => {
    if (!date) return;
    
    setLoading(true);
    setError('');
    
    try {
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Fetch recurring availability for the day of week
      const { data: recurringData, error: recurringError } = await supabase
        .from('availability')
        .select(`
          id,
          therapist_id,
          start_time,
          end_time,
          day_of_week,
          therapists:therapist_id (name)
        `)
        .eq('day_of_week', dayOfWeek)
        .eq('is_recurring', true);
      
      if (recurringError) throw recurringError;
      
      // Fetch specific availability for the selected date
      const { data: specificData, error: specificError } = await supabase
        .from('availability')
        .select(`
          id,
          therapist_id,
          start_time,
          end_time,
          day_of_week,
          therapists:therapist_id (name)
        `)
        .eq('date', formattedDate)
        .eq('is_recurring', false);
      
      if (specificError) throw specificError;
      
      // Combine and format the data
      const combinedData = [...(recurringData || []), ...(specificData || [])];
      
      // Format the data to match the AvailableSlot interface
      const formattedSlots: AvailableSlot[] = combinedData.map(slot => {
        // Safely extract therapist name
        let therapistName = 'Unknown Therapist';
        try {
          if (slot.therapists && typeof slot.therapists === 'object') {
            therapistName = (slot.therapists as any).name || 'Unknown Therapist';
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
      setError('Failed to load available time slots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSlot) {
      setError('Please select an available time slot');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Format the appointment date and time
      const appointmentDate = format(date!, 'yyyy-MM-dd');
      const startTime = `${appointmentDate}T${selectedSlot.start_time}`;
      const endTime = `${appointmentDate}T${selectedSlot.end_time}`;
      
      // Check if we need to create a client account
      let clientId = null;
      
      if (formData.createAccount && formData.password) {
        // TODO: Implement account creation
        // This would be implemented in the next phase
      }
      
      // Insert the appointment
      const { data, error: insertError } = await supabase
        .from('appointments')
        .insert({
          therapist_id: selectedSlot.therapist_id,
          client_name: formData.name,
          client_email: formData.email,
          client_phone: formData.phone,
          start_time: startTime,
          end_time: endTime,
          notes: formData.notes,
          status: 'pending',
          client_id: user?.id || clientId
        })
        .select();
      
      if (insertError) throw insertError;
      
      setSuccess(true);
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        notes: '',
        password: '',
        createAccount: false
      });
      setSelectedSlot(null);
      
    } catch (err) {
      console.error('Error booking appointment:', err);
      setError('Failed to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Book an Appointment</h1>
      
      {success ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold text-green-600">Appointment Request Submitted!</h2>
              <p>Your appointment request has been sent to the therapist. You will receive a confirmation email once it's approved.</p>
              <Button onClick={() => {
                setSuccess(false);
                setDate(new Date());
              }}>
                Book Another Appointment
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
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
                  disabled={{ before: new Date() }}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
            
            {date && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Available Time Slots</CardTitle>
                  <CardDescription>
                    {format(date, 'EEEE, MMMM do, yyyy')}
                  </CardDescription>
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
                          onClick={() => handleSlotSelect(slot)}
                        >
                          {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {slot.therapist_name}
                          </span>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-4 text-muted-foreground">
                      No available slots for this date. Please select another date.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
                <CardDescription>
                  {selectedSlot 
                    ? `Booking with ${selectedSlot.therapist_name} at ${selectedSlot.start_time.substring(0, 5)}`
                    : 'Please select a time slot'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Any specific concerns or questions?"
                      rows={3}
                    />
                  </div>
                  
                  {!user && (
                    <div className="space-y-4 border-t pt-4 mt-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="createAccount"
                          name="createAccount"
                          checked={formData.createAccount}
                          onChange={handleInputChange}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="createAccount" className="text-sm font-normal">
                          Create an account for faster booking in the future
                        </Label>
                      </div>
                      
                      {formData.createAccount && (
                        <div className="space-y-2">
                          <Label htmlFor="password">Create Password</Label>
                          <Input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required={formData.createAccount}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {error && (
                    <div className="text-red-500 text-sm">{error}</div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || !selectedSlot}
                  >
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
        </div>
      )}
    </div>
  );
}