import { NextRequest, NextResponse } from 'next/server';
import { addMinutes, format, parse } from 'date-fns';
import { supabaseAdmin } from '@/app/utils/supabase-server'; // Use the server-compatible admin client

// Helper function to generate time slots from availability ranges
function generateTimeSlots(slots: any[], selectedDate: string) {
  const timeSlots: { time: string; formatted: string }[] = [];
  
  slots.forEach(slot => {
    try {
      const startTime = parse(slot.start_time, 'HH:mm:ss', new Date());
      const endTime = parse(slot.end_time, 'HH:mm:ss', new Date());
      
      let currentTime = startTime;
      while (currentTime < endTime) {
        const timeStr = format(currentTime, 'HH:mm');
        timeSlots.push({
          time: timeStr,
          formatted: format(currentTime, 'h:mm a')
        });
        currentTime = addMinutes(currentTime, 30); // 30-minute slots
      }
    } catch (error) {
      console.error('Error parsing time:', error);
    }
  });
  
  // Sort by time
  return timeSlots.sort((a, b) => a.time.localeCompare(b.time));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const therapistId = searchParams.get('therapistId');
  const primaryColor = searchParams.get('primaryColor') || '#0f766e';
  const buttonText = searchParams.get('buttonText') || 'Book Appointment';
  const modalTitle = searchParams.get('modalTitle') || 'Book Your Appointment';
  const dateParam = searchParams.get('date');
  
  if (!therapistId) {
    return new NextResponse('Missing therapistId parameter', { status: 400 });
  }
  
  // Get selected date from the URL or use current date
  const selectedDate = dateParam ? new Date(dateParam) : new Date();
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
  const displayDate = format(selectedDate, 'EEEE, MMMM d, yyyy');

  console.log('therapistId', therapistId);
  
  // Check if supabaseAdmin is available
  if (!supabaseAdmin) {
    console.error('Supabase admin client not available');
    return new NextResponse('Internal server error - database client not available', { status: 500 });
  }
  
  // Fetch therapist info with admin client to bypass RLS
  const { data: therapistData, error: therapistError } = await supabaseAdmin
    .from('therapist_profiles')
    .select('id, name')
    .eq('id', therapistId)
    .single();

  console.log('therapistData', therapistData);
  
  if (therapistError) {
    console.error('Error fetching therapist:', therapistError);
    return new NextResponse('Failed to load therapist information', { status: 500 });
  }
  
  // Fetch availability data
  let availableTimeSlots: { time: string; formatted: string }[] = [];
  
  try {
    // Fetch recurring availability for the day of week
    const { data: recurringData, error: recurringError } = await supabaseAdmin
      .from('therapist_availability')
      .select('id, therapist_id, start_time, end_time, day_of_week')
      .eq('day_of_week', dayOfWeek)
      .eq('is_recurring', true)
      .eq('therapist_id', therapistId);
    
    if (recurringError) throw recurringError;
    
    // Fetch specific availability for the selected date
    const { data: specificData, error: specificError } = await supabaseAdmin
      .from('therapist_availability')
      .select('id, therapist_id, start_time, end_time, day_of_week')
      .eq('specific_date', formattedDate)
      .eq('is_recurring', false)
      .eq('therapist_id', therapistId);
    
    if (specificError) throw specificError;
    
    // Combine both types of availability
    const allSlots = [...(recurringData || []), ...(specificData || [])];
    
    // Generate time slots from availability
    if (allSlots.length > 0) {
      availableTimeSlots = generateTimeSlots(allSlots, formattedDate);
    }
  } catch (error) {
    console.error('Error fetching availability:', error);
  }
  
  // Define inline styles
  const styles = `
    :root {
      --primary-color: ${primaryColor};
      --background-color: white;
      --text-color: #333;
      --border-color: #ddd;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 0;
      color: var(--text-color);
      background: var(--background-color);
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
      padding: 1rem;
    }
    .heading {
      font-weight: bold;
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }
    .card {
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1rem;
      background: white;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
    .section-title {
      font-weight: 600;
      font-size: 1rem;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
    }
    .calendar {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.25rem;
      margin-top: 0.5rem;
    }
    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .calendar-day {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .calendar-day:hover {
      background-color: #f5f5f5;
    }
    .calendar-day.today {
      border: 1px solid var(--primary-color);
      color: var(--primary-color);
    }
    .calendar-day.selected {
      background-color: var(--primary-color);
      color: white;
    }
    .calendar-day.other-month {
      color: #aaa;
    }
    .day-header {
      text-align: center;
      font-size: 0.75rem;
      font-weight: 500;
      color: #666;
    }
    .time-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .time-button {
      padding: 0.5rem;
      border: 1px solid var(--border-color);
      border-radius: 0.25rem;
      background: white;
      cursor: pointer;
      font-size: 0.875rem;
      text-align: center;
    }
    .time-button:hover {
      border-color: var(--primary-color);
    }
    .time-button.selected {
      background-color: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    .form-input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--border-color);
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }
    .form-button {
      width: 100%;
      padding: 0.75rem;
      background-color: var(--primary-color);
      color: white;
      border: none;
      border-radius: 0.25rem;
      font-weight: 500;
      cursor: pointer;
    }
    .form-button:hover {
      opacity: 0.9;
    }
    .helper-text {
      font-size: 0.75rem;
      color: #666;
      margin-top: 0.25rem;
      text-align: center;
    }
    .empty-message {
      text-align: center;
      padding: 2rem 0;
      color: #666;
      font-size: 0.875rem;
    }
  `;
  
  // Build the time slots HTML based on fetched availability
  let timeSlotsHtml = '';
  
  if (availableTimeSlots.length === 0) {
    timeSlotsHtml = `
      <div class="empty-message">
        No available slots for this date.
      </div>
    `;
  } else {
    let timeButtonsHtml = '';
    availableTimeSlots.forEach((slot, index) => {
      const isSelected = index === 0; // Default select first time slot
      timeButtonsHtml += `
        <div class="time-button${isSelected ? ' selected' : ''}" data-time="${slot.time}">
          ${slot.formatted}
        </div>
      `;
    });
    
    timeSlotsHtml = `
      <div class="time-grid">
        ${timeButtonsHtml}
      </div>
    `;
  }
  
  // JavaScript for the widget functionality
  const scriptCode = `
    // Get therapist ID from URL 
    const urlParams = new URLSearchParams(window.location.search);
    const therapistId = urlParams.get('therapistId');
    
    // Function to fetch available time slots for a given date
    async function fetchAvailableTimeSlots(date) {
      if (!therapistId) return;
      
      try {
        // Show loading indicator
        const timeSlotsContainer = document.querySelector('.card:nth-child(2) .time-grid') || 
                                   document.querySelector('.card:nth-child(2) .empty-message');
        
        if (timeSlotsContainer) {
          timeSlotsContainer.innerHTML = '<div class="empty-message">Loading available times...</div>';
        }
        
        // Format date for API request
        const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Create URL with date and therapist ID
        const apiUrl = new URL(window.location.href);
        apiUrl.searchParams.set('date', formattedDate);
        
        // Fetch from our own API
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error('Failed to fetch time slots');
        }
        
        // Get the HTML response
        const html = await response.text();
        
        // Create a temporary element to parse the HTML
        const tempElement = document.createElement('div');
        tempElement.innerHTML = html;
        
        // Extract the time slots HTML
        const newTimeSlotsContainer = tempElement.querySelector('.card:nth-child(2) .time-grid') || 
                                      tempElement.querySelector('.card:nth-child(2) .empty-message');
        
        // Update the date display
        const dateDisplay = document.getElementById('selected-date-display');
        if (dateDisplay) {
          const newDateDisplay = tempElement.querySelector('#selected-date-display');
          if (newDateDisplay) {
            dateDisplay.textContent = newDateDisplay.textContent;
          }
        }
        
        // Replace the time slots in the current page
        if (newTimeSlotsContainer && timeSlotsContainer) {
          timeSlotsContainer.parentNode.replaceChild(newTimeSlotsContainer, timeSlotsContainer);
          
          // Reattach event listeners to new time buttons
          attachTimeButtonListeners();
        }
      } catch (error) {
        console.error('Error fetching time slots:', error);
        const timeSlotsContainer = document.querySelector('.card:nth-child(2) .time-grid') || 
                                   document.querySelector('.card:nth-child(2) .empty-message');
        
        if (timeSlotsContainer) {
          timeSlotsContainer.innerHTML = '<div class="empty-message">Error loading available times. Please try again.</div>';
        }
      }
    }
    
    // Attach event listeners to calendar days
    function attachCalendarListeners() {
      document.querySelectorAll('.calendar-day').forEach(day => {
        day.addEventListener('click', () => {
          document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
          day.classList.add('selected');
          
          // Extract date from the calendar and create a Date object
          const dayText = day.textContent || '';
          const monthYearText = document.getElementById('current-month').textContent || '';
          if (dayText && monthYearText && !day.classList.contains('other-month')) {
            const monthYearParts = monthYearText.split(' ');
            const month = monthYearParts[0];
            const year = monthYearParts[1];
            const dateStr = month + ' ' + dayText + ', ' + year;
            const date = new Date(dateStr);
            
            // Fetch available times for this date
            fetchAvailableTimeSlots(date);
          } else {
            // For other month days, just show a message
            const dateText = day.classList.contains('other-month') 
              ? 'Date in another month' 
              : 'Unknown date';
            
            document.getElementById('selected-date-display').textContent = dateText;
            
            const timeSlotsContainer = document.querySelector('.card:nth-child(2) .time-grid') || 
                                       document.querySelector('.card:nth-child(2) .empty-message');
            
            if (timeSlotsContainer) {
              timeSlotsContainer.innerHTML = '<div class="empty-message">Please select a date from the current month.</div>';
            }
          }
        });
      });
    }
    
    // Attach event listeners to time buttons
    function attachTimeButtonListeners() {
      document.querySelectorAll('.time-button').forEach(button => {
        if (!button.id) { // Skip month navigation buttons
          button.addEventListener('click', () => {
            document.querySelectorAll('.time-button').forEach(b => {
              if (!b.id) b.classList.remove('selected');
            });
            button.classList.add('selected');
          });
        }
      });
    }
    
    // Attach navigation button listeners
    function attachNavigationListeners() {
      document.getElementById('prev-month').addEventListener('click', () => {
        alert('This calendar navigation is just a preview. In the actual widget, this would navigate to the previous month.');
      });
      
      document.getElementById('next-month').addEventListener('click', () => {
        alert('This calendar navigation is just a preview. In the actual widget, this would navigate to the next month.');
      });
    }
    
    // Initialize all event listeners
    function initListeners() {
      attachCalendarListeners();
      attachTimeButtonListeners();
      attachNavigationListeners();
    }
    
    // Run initializer when DOM is loaded
    document.addEventListener('DOMContentLoaded', initListeners);
  `;
  
  // Simple booking widget HTML with dynamic content
  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Widget Preview</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="container">
          <h1 class="heading">Book an Appointment${therapistData ? ' with ' + therapistData.name : ''}</h1>
          
          <div class="grid">
            <div class="card">
              <div class="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.5rem">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Select a Date
              </div>
              
              <div class="calendar-header">
                <button class="time-button" style="width: auto; padding: 0.25rem 0.5rem;" id="prev-month">&larr;</button>
                <div id="current-month">${format(selectedDate, 'MMMM yyyy')}</div>
                <button class="time-button" style="width: auto; padding: 0.25rem 0.5rem;" id="next-month">&rarr;</button>
              </div>
              
              <div class="calendar">
                <div class="day-header">Su</div>
                <div class="day-header">Mo</div>
                <div class="day-header">Tu</div>
                <div class="day-header">We</div>
                <div class="day-header">Th</div>
                <div class="day-header">Fr</div>
                <div class="day-header">Sa</div>
                
                <!-- Example calendar days - in production this would be dynamically generated -->
                <div class="calendar-day other-month">26</div>
                <div class="calendar-day other-month">27</div>
                <div class="calendar-day other-month">28</div>
                <div class="calendar-day other-month">29</div>
                <div class="calendar-day">1</div>
                <div class="calendar-day">2</div>
                <div class="calendar-day">3</div>
                <div class="calendar-day">4</div>
                <div class="calendar-day">5</div>
                <div class="calendar-day">6</div>
                <div class="calendar-day">7</div>
                <div class="calendar-day">8</div>
                <div class="calendar-day">9</div>
                <div class="calendar-day">10</div>
                <div class="calendar-day">11</div>
                <div class="calendar-day">12</div>
                <div class="calendar-day">13</div>
                <div class="calendar-day">14</div>
                <div class="calendar-day">15</div>
                <div class="calendar-day">16</div>
                <div class="calendar-day">17</div>
                <div class="calendar-day today">18</div>
                <div class="calendar-day selected">19</div>
                <div class="calendar-day">20</div>
                <div class="calendar-day">21</div>
                <div class="calendar-day">22</div>
                <div class="calendar-day">23</div>
                <div class="calendar-day">24</div>
              </div>
            </div>
            
            <div class="card">
              <div class="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.5rem">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Available Times
              </div>
              <div style="font-size: 0.75rem; color: #666; margin-bottom: 0.75rem" id="selected-date-display">
                ${displayDate}
              </div>
              
              ${timeSlotsHtml}
            </div>
          </div>
          
          <div class="card">
            <div class="section-title">Your Information</div>
            
            <div class="grid">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" class="form-input" placeholder="Your name">
              </div>
              
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" placeholder="your@email.com">
              </div>
            </div>
            
            <button class="form-button">${buttonText}</button>
            <div class="helper-text">
              This is a preview. No actual appointment will be booked.
            </div>
          </div>
        </div>
        
        <script>${scriptCode}</script>
      </body>
    </html>
  `;
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
} 