import { NextRequest, NextResponse } from 'next/server';
import { addMinutes, format, parse, isBefore, setHours, setMinutes, getDay } from 'date-fns';
import { supabaseAdmin } from '@/app/utils/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const therapistId = searchParams.get('therapistId');
  const dateParam = searchParams.get('date');

  console.log('Widget preview API called with:', { therapistId, dateParam });

  // Validate required parameters
  if (!therapistId || !dateParam) {
    return NextResponse.json({ 
      error: 'Missing required parameters' 
    }, { status: 400 });
  }

  // Parse the date
  console.log(`Date param: ${dateParam}`);
  
  // Directly use the dateParam as the formattedDate if it matches the yyyy-MM-dd format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateParam)) {
    console.error('Invalid date format:', dateParam);
    return NextResponse.json({ 
      error: 'Invalid date format, expected yyyy-MM-dd' 
    }, { status: 400 });
  }
  
  const formattedDate = dateParam;
  
  // Create a proper Date object for calculations
  const selectedDate = new Date(`${dateParam}T12:00:00Z`); // Use noon UTC to avoid timezone issues
  
  // Check if date is valid
  if (isNaN(selectedDate.getTime())) {
    console.error('Invalid date value:', dateParam);
    return NextResponse.json({ 
      error: 'Invalid date value' 
    }, { status: 400 });
  }
  
  console.log(`Using date: ${formattedDate}, parsed as: ${selectedDate.toISOString()}`);

  // Initialize Supabase client
  if (!supabaseAdmin) {
    return NextResponse.json({ 
      error: 'Database client not available' 
    }, { status: 500 });
  }

  try {
    // Fetch therapist profile
    const { data: therapistData, error: profileError } = await supabaseAdmin
      .from('therapist_profiles')
      .select('*')
      .eq('id', therapistId)
      .single();

    if (profileError || !therapistData) {
      console.error('Error fetching therapist profile:', profileError);
      return NextResponse.json({ 
        error: 'Therapist not found' 
      }, { status: 404 });
    }

    const dayOfWeek = getDay(selectedDate); // 0 = Sunday, 6 = Saturday
    
    console.log(`Using formatted date: ${formattedDate}, day of week: ${dayOfWeek}`);

    // 1. Fetch RECURRING availability for this day of the week
    console.log(`Fetching recurring availability for therapist ${therapistId} on day of week ${dayOfWeek}`);
    const { data: recurringAvailability, error: recurringError } = await supabaseAdmin
      .from('therapist_availability')
      .select('*')
      .eq('therapist_id', therapistId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_recurring', true);

    if (recurringError) {
      console.error('Error fetching recurring availability:', recurringError);
      return NextResponse.json({ 
        error: 'Failed to fetch recurring availability' 
      }, { status: 500 });
    }

    // 2. Fetch SPECIFIC availability for this exact date
    console.log(`Fetching specific availability for therapist ${therapistId} on date ${formattedDate}`);
    const { data: specificAvailability, error: specificError } = await supabaseAdmin
      .from('therapist_availability')
      .select('*')
      .eq('therapist_id', therapistId)
      .eq('specific_date', formattedDate)
      .eq('is_recurring', false);

    if (specificError) {
      console.error('Error fetching specific availability:', specificError);
      return NextResponse.json({ 
        error: 'Failed to fetch specific availability' 
      }, { status: 500 });
    }

    // 3. Fetch TIME OFF for this date
    console.log(`Fetching time off for date: ${formattedDate}`);
    const { data: timeOffData, error: timeOffError } = await supabaseAdmin
      .from('time_off')
      .select('*')
      .eq('therapist_id', therapistId)
      .eq('is_recurring', false)
      .or(`start_date.lte.${formattedDate},end_date.gte.${formattedDate}`);

    if (timeOffError) {
      console.error('Error fetching time off:', timeOffError);
      return NextResponse.json({ 
        error: 'Failed to fetch time off data' 
      }, { status: 500 });
    }
    
    if (timeOffData && timeOffData.length > 0) {
      console.log(`Found ${timeOffData.length} specific time off records`);
      timeOffData.forEach((timeOff, index) => {
        console.log(`Time off record ${index + 1}:`, {
          start_date: timeOff.start_date,
          end_date: timeOff.end_date,
          is_all_day: timeOff.is_all_day,
          start_time: timeOff.start_time,
          end_time: timeOff.end_time
        });
      });
    } else {
      console.log('No specific time off found for this date');
    }

    // 4. Also check for recurring time off for this day of week
    console.log(`Fetching recurring time off for day of week: ${dayOfWeek}`);
    const { data: recurringTimeOff, error: recurringTimeOffError } = await supabaseAdmin
      .from('time_off')
      .select('*')
      .eq('therapist_id', therapistId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_recurring', true);

    if (recurringTimeOffError) {
      console.error('Error fetching recurring time off:', recurringTimeOffError);
      return NextResponse.json({ 
        error: 'Failed to fetch recurring time off data' 
      }, { status: 500 });
    }
    
    if (recurringTimeOff && recurringTimeOff.length > 0) {
      console.log(`Found ${recurringTimeOff.length} recurring time off records`);
      recurringTimeOff.forEach((timeOff, index) => {
        console.log(`Recurring time off ${index + 1}:`, {
          day_of_week: timeOff.day_of_week,
          is_all_day: timeOff.is_all_day,
          start_time: timeOff.start_time,
          end_time: timeOff.end_time
        });
      });
    } else {
      console.log('No recurring time off found for this day of week');
    }

    // Combine both specific and recurring time off
    const allTimeOff = [...(timeOffData || []), ...(recurringTimeOff || [])];

    // 5. Fetch existing APPOINTMENTS for this date
    const { data: appointmentsData, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('start_time, end_time')
      .eq('therapist_id', therapistId)
      .gte('start_time', `${formattedDate}T00:00:00`)
      .lt('start_time', `${formattedDate}T23:59:59`)
      .eq('status', 'confirmed');  // Only consider confirmed appointments

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      return NextResponse.json({ 
        error: 'Failed to fetch appointments' 
      }, { status: 500 });
    }

    // Combine recurring and specific availability slots
    const allAvailabilitySlots = [...(recurringAvailability || []), ...(specificAvailability || [])];
    
    console.log('Availability slots found:', {
      recurring: recurringAvailability?.length || 0,
      specific: specificAvailability?.length || 0,
      total: allAvailabilitySlots.length
    });
    
    if (allAvailabilitySlots.length > 0) {
      console.log('First availability slot:', allAvailabilitySlots[0]);
    }
    
    // Default availability if none exists - business hours (9 AM to 5 PM)
    let availableTimeSlots = [];
    
    if (allAvailabilitySlots.length > 0) {
      console.log('Using defined availability slots');
      // Use therapist's defined availability
      for (const availability of allAvailabilitySlots) {
        try {
          console.log('Processing availability slot:', availability);
          
          // Parse start and end times
          const startTime = parse(availability.start_time, 'HH:mm:ss', new Date());
          const endTime = parse(availability.end_time, 'HH:mm:ss', new Date());
          
          console.log(`Processing availability: ${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`);
          
          // Generate 30-minute slots within this availability window
          const slotDuration = 30;
          let currentTime = startTime;
          
          while (isBefore(currentTime, endTime)) {
            const slotTime = format(currentTime, 'HH:mm');
            const displayTime = format(currentTime, 'h:mm a');
  
            availableTimeSlots.push({
              time: slotTime,
              displayTime: displayTime
            });
            
            currentTime = addMinutes(currentTime, slotDuration);
          }
        } catch (error) {
          console.error('Error processing availability slot:', error);
        }
      }
    } else {
      console.log('No availability slots found, using default business hours (9 AM - 5 PM)');
      // Default business hours if no availability is set
      const defaultStart = setHours(setMinutes(new Date(), 0), 9); // 9:00 AM
      const defaultEnd = setHours(setMinutes(new Date(), 0), 17);  // 5:00 PM
      
      // Generate 30-minute slots
      const slotDuration = 30;
      let currentTime = defaultStart;
      
      while (isBefore(currentTime, defaultEnd)) {
        const slotTime = format(currentTime, 'HH:mm');
        const displayTime = format(currentTime, 'h:mm a');

        availableTimeSlots.push({
          time: slotTime,
          displayTime: displayTime
        });
        
        currentTime = addMinutes(currentTime, slotDuration);
      }
    }

    console.log(`Generated ${availableTimeSlots.length} initial time slots before filtering`);

    // Remove slots that are during time off periods
    if (allTimeOff && allTimeOff.length > 0) {
      console.log(`Found ${allTimeOff.length} time off records to check against`);
      availableTimeSlots = availableTimeSlots.filter(slot => {
        const slotTime = slot.time;
        return !allTimeOff.some(timeOff => {
          try {
            // Check for all-day time off first
            if (timeOff.is_all_day === true) {
              // For non-recurring, make sure it applies to this specific date
              if (!timeOff.is_recurring) {
                if (timeOff.start_date && timeOff.end_date) {
                  // Check if formattedDate is within the date range
                  if (formattedDate >= timeOff.start_date && formattedDate <= timeOff.end_date) {
                    console.log(`All-day time off blocks slot ${slotTime} on ${formattedDate}`);
                    return true;
                  }
                  return false;
                }
              } else if (timeOff.is_recurring && timeOff.day_of_week === dayOfWeek) {
                // For recurring, check day of week
                console.log(`Recurring all-day time off blocks slot ${slotTime} on day ${dayOfWeek}`);
                return true;
              }
              return false;
            }
            
            // For time-based blocks
            if (!timeOff.is_recurring) {
              // Check if this time off applies to the date
              if (timeOff.start_date && timeOff.end_date) {
                if (formattedDate < timeOff.start_date || formattedDate > timeOff.end_date) {
                  return false; // Skip if not in date range
                }
              }
            } else if (timeOff.day_of_week !== dayOfWeek) {
              return false; // Skip if recurring but not matching day of week
            }
            
            const timeOffStart = format(parse(timeOff.start_time, 'HH:mm:ss', new Date()), 'HH:mm');
            const timeOffEnd = format(parse(timeOff.end_time, 'HH:mm:ss', new Date()), 'HH:mm');
            
            const overlaps = slotTime >= timeOffStart && slotTime < timeOffEnd;
            if (overlaps) {
              console.log(`Slot ${slotTime} overlaps with time off ${timeOffStart}-${timeOffEnd}`);
            }
            return overlaps;
          } catch (error) {
            console.error('Error processing time off data:', error);
            return false;  // Skip problematic time off entries
          }
        });
      });
      
      console.log(`After time off filtering: ${availableTimeSlots.length} slots remaining`);
    }

    // Remove slots that overlap with existing appointments
    if (appointmentsData && appointmentsData.length > 0) {
      console.log(`Found ${appointmentsData.length} appointments to check against`);
      availableTimeSlots = availableTimeSlots.filter(slot => {
        const slotTime = slot.time;
        return !appointmentsData.some(appointment => {
          try {
            // Parse the ISO timestamp to extract just the time portion
            const appointmentStartTime = new Date(appointment.start_time);
            const appointmentEndTime = new Date(appointment.end_time);
            
            // Format to HH:mm for comparison
            const appointmentStart = format(appointmentStartTime, 'HH:mm');
            const appointmentEnd = format(appointmentEndTime, 'HH:mm');
            
            const overlaps = slotTime >= appointmentStart && slotTime < appointmentEnd;
            if (overlaps) {
              console.log(`Slot ${slotTime} overlaps with appointment at ${appointmentStart}-${appointmentEnd}`);
            }
            return overlaps;
          } catch (error) {
            console.error('Error processing appointment:', error);
            return false;  // Skip problematic appointments
          }
        });
      });
      
      console.log(`After appointment filtering: ${availableTimeSlots.length} slots remaining`);
    }

    // Sort the available time slots by time
    availableTimeSlots = availableTimeSlots.sort((a, b) => a.time.localeCompare(b.time));
    
    if (availableTimeSlots.length === 0) {
      console.log('WARNING: No available time slots after all filtering. Verify your data is correct.');
      console.log('Meta data:', {
        availabilityCount: allAvailabilitySlots.length,
        timeOffCount: allTimeOff?.length || 0,
        appointmentsCount: appointmentsData?.length || 0,
        formattedDate
      });
    } else {
      console.log(`Final available slots: ${availableTimeSlots.length}`);
      console.log('First available slot:', availableTimeSlots[0]);
      console.log('Last available slot:', availableTimeSlots[availableTimeSlots.length - 1]);
    }

    // Return available time slots
    return NextResponse.json({
      therapistId,
      date: formattedDate,
      slots: availableTimeSlots,
      meta: {
        availabilityCount: allAvailabilitySlots.length,
        timeOffCount: allTimeOff?.length || 0,
        appointmentsCount: appointmentsData?.length || 0
      }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 