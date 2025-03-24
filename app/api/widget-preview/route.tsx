import { NextRequest, NextResponse } from 'next/server';
import { addMinutes, format, parse, getDay, addDays, startOfMonth, endOfMonth, 
         isSameMonth, isToday, isPast, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
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

// Helper function to generate calendar days for a given month
function generateCalendarGrid(selectedDate: Date, currentMonth: Date) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // 0 = Sunday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  let day = startDate;
  const calendarDays = [];
  
  // Generate week rows
  while (day <= endDate) {
    const weekRow = [];
    
    // Generate days in a week
    for (let i = 0; i < 7; i++) {
      const dayObj = {
        date: format(day, 'd'),
        fullDate: new Date(day),
        isCurrentMonth: isSameMonth(day, monthStart),
        isToday: isToday(day),
        isSelected: isSameDay(day, selectedDate),
        isPast: isPast(day) || isToday(day),
        dayOfWeek: getDay(day),
      };
      
      weekRow.push(dayObj);
      day = addDays(day, 1);
    }
    
    calendarDays.push(weekRow);
  }
  
  return calendarDays;
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
    .from('therapists')
    .select('id, name')
    .eq('id', therapistId)
    .single();

  console.log('therapistData', therapistData);
  
  if (therapistError) {
    console.error('Error fetching therapist:', therapistError);
    return new NextResponse('Failed to load therapist information', { status: 500 });
  }
  
  // Generate calendar data for the widget
  const currentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const calendarDays = generateCalendarGrid(selectedDate, currentMonth);
  
  // Create calendar HTML
  let calendarHtml = '';
  
  // Generate day headers
  const dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => 
    `<div class="day-header">${day}</div>`
  ).join('');
  
  // Generate calendar grid
  for (const week of calendarDays) {
    const weekHtml = week.map(day => {
      const classNames = [
        'calendar-day',
        !day.isCurrentMonth ? 'other-month' : '',
        day.isToday ? 'today' : '',
        day.isSelected ? 'selected' : '',
        day.isPast ? 'past' : ''
      ].filter(Boolean).join(' ');
      
      const dataDate = format(day.fullDate, 'yyyy-MM-dd');
      const isDisabled = day.isPast ? 'disabled' : '';
      
      return `<div class="${classNames}" data-date="${dataDate}" ${isDisabled}>${day.date}</div>`;
    }).join('');
    
    calendarHtml += weekHtml;
  }
  
  // Remove the unused timeSlotsHtml code since we're now loading dynamically
  const initialTimeSlots = `
    <div class="loading-spinner">Loading available times...</div>
  `;
  
  // Define inline styles
  const styles = `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f9fafb;
      color: #111827;
    }
    .container {
      max-width: 600px;
      margin: 2rem auto;
      padding: 1.5rem;
      background-color: white;
      border-radius: 0.75rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .heading {
      margin-top: 0;
      margin-bottom: 1.5rem;
      font-size: 1.5rem;
      font-weight: 600;
      color: #111827;
      text-align: center;
    }
    .grid {
      display: grid;
      gap: 1.5rem;
    }
    .card {
      padding: 1.25rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    }
    .section-title {
      display: flex;
      align-items: center;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #4b5563;
      font-size: 1rem;
    }
    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      font-weight: 600;
    }
    .calendar {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }
    .day-header {
      text-align: center;
      font-weight: 600;
      font-size: 0.75rem;
      color: #6b7280;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .calendar-day {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 32px;
      font-size: 0.875rem;
      cursor: pointer;
      border-radius: 0.25rem;
      transition: all 0.15s ease;
    }
    .calendar-day:hover:not(.past):not([disabled]) {
      background-color: #f3f4f6;
    }
    .calendar-day.selected {
      background-color: ${primaryColor};
      color: white;
      font-weight: 600;
    }
    .calendar-day.today {
      opacity: 0.5;
      cursor: not-allowed;
      color: #ccc;
      background-color: #f9f9f9;
      position: relative;
    }
    .calendar-day.today:hover {
      background-color: #f9f9f9;
    }
    .calendar-day.today:after {
      content: "";
      position: absolute;
      bottom: 5px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background-color: #9ca3af;
    }
    .calendar-day.today.selected:after {
      background-color: white;
    }
    .calendar-day.other-month {
      color: #9ca3af;
    }
    .selected-date {
      margin: 0.75rem 0;
      font-size: 0.875rem;
      color: #4b5563;
    }
    .time-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .time-button {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0.5rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
      background-color: white;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .time-button:hover:not([disabled]) {
      background-color: #f3f4f6;
    }
    .time-button.selected {
      background-color: ${primaryColor};
      border-color: ${primaryColor};
      color: white;
    }
    .book-button {
      margin-top: 1.5rem;
      padding: 0.75rem 1rem;
      width: 100%;
      background-color: ${primaryColor};
      color: white;
      border: none;
      border-radius: 0.375rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .book-button:hover:not([disabled]) {
      opacity: 0.9;
    }
    .book-button:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }
    .empty-message {
      text-align: center;
      color: #6b7280;
      padding: 1.5rem;
      font-size: 0.875rem;
    }
    .loading-spinner {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1.5rem;
      color: #6b7280;
      font-size: 0.875rem;
    }
    .loading-spinner:before {
      content: "";
      width: 20px;
      height: 20px;
      margin-right: 0.5rem;
      border: 2px solid #e5e7eb;
      border-top-color: ${primaryColor};
      border-radius: 50%;
      animation: spinner 0.6s linear infinite;
    }
    @keyframes spinner {
      to {
        transform: rotate(360deg);
      }
    }
    .calendar-day.past {
      opacity: 0.5;
      cursor: not-allowed;
      color: #ccc;
      background-color: #f9f9f9;
    }
    .calendar-day.past:hover {
      background-color: #f9f9f9;
    }
    .calendar-day.past.today {
      opacity: 0.7;
      background-color: #f9f9f9;
    }
    .calendar-day.past.today:after {
      background-color: #9ca3af;
    }
  `;
  
  // Update JavaScript for date handling
  const scriptCode = `
    let currentMonth = new Date(${selectedDate.getFullYear()}, ${selectedDate.getMonth()}, 1);
    let selectedDate = new Date(${selectedDate.getFullYear()}, ${selectedDate.getMonth()}, ${selectedDate.getDate()});
    let selectedTimeSlot = null;
    
    // Format date for display
    function formatDateDisplay(date) {
      // Using toDateString to ensure consistent date display across browsers
      // This prevents timezone issues that can cause the date to appear off by one day
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'UTC' // Using UTC timezone to avoid date shifting
      });
    }
    
    // Fetch available time slots for the selected date
    async function fetchAvailableTimeSlots(date) {
      const dateStr = date.toISOString().split('T')[0];
      document.getElementById('selected-date-display').textContent = formatDateDisplay(date);
      document.getElementById('selected-time-display').textContent = 'No time selected';
      selectedTimeSlot = null;
      
      // Disable book button until a time is selected
      const bookButton = document.getElementById('book-button');
      if (bookButton) {
        bookButton.disabled = true;
      }
      
      const timeSlotsContainer = document.querySelector('.time-grid');
      
      if (timeSlotsContainer) {
        timeSlotsContainer.innerHTML = '<div class="loading-spinner">Loading available times...</div>';
        
        try {
          // Get therapist ID from URL params
          const urlParams = new URLSearchParams(window.location.search);
          const therapistId = urlParams.get('therapistId');
          
          // Fetch available slots from server
          const response = await fetch(\`/api/widget-preview/get-slots?therapistId=\${therapistId}&date=\${dateStr}\`);
          
          if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
          }
          
          const data = await response.json();
          console.log('Fetched slots:', data);
          
          if (data.slots && data.slots.length > 0) {
            // Display time slots
            timeSlotsContainer.innerHTML = '';
            data.slots.forEach(slot => {
              const timeButton = document.createElement('button');
              timeButton.className = 'time-button';
              timeButton.textContent = slot.displayTime;
              timeButton.setAttribute('data-time', slot.time);
              
              timeButton.addEventListener('click', function() {
                document.querySelectorAll('.time-button').forEach(btn => btn.classList.remove('selected'));
                this.classList.add('selected');
                selectedTimeSlot = slot;
                
                // Update selected time display
                const selectedTimeDisplay = document.getElementById('selected-time-display');
                if (selectedTimeDisplay) {
                  selectedTimeDisplay.textContent = this.textContent;
                }
                
                // Enable the book button
                const bookButton = document.getElementById('book-button');
                if (bookButton) {
                  bookButton.disabled = false;
                }
              });
              
              timeSlotsContainer.appendChild(timeButton);
            });
          } else {
            // No available slots
            timeSlotsContainer.innerHTML = '<div class="empty-message">No available times for this date. Please select another day.</div>';
          }
        } catch (error) {
          console.error('Error fetching time slots:', error);
          timeSlotsContainer.innerHTML = \`<div class="empty-message">Error loading time slots: \${error.message}</div>\`;
        }
      }
    }
    
    // Update calendar for new month
    function updateCalendar(month) {
      // Format month year display
      document.getElementById('current-month').textContent = 
        month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      // Fetch new calendar data
      fetch(\`/api/widget-preview?therapistId=\${new URLSearchParams(window.location.search).get('therapistId')}&date=\${month.toISOString()}\`)
        .then(response => response.text())
        .then(html => {
          // Create a temporary element to parse the HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          
          // Extract just the calendar part
          const newCalendar = tempDiv.querySelector('.calendar');
          if (newCalendar) {
            document.querySelector('.calendar').innerHTML = newCalendar.innerHTML;
            attachCalendarListeners();
          }
        })
        .catch(error => {
          console.error('Error updating calendar:', error);
        });
    }
    
    // Attach event listeners to calendar days
    function attachCalendarListeners() {
      document.querySelectorAll('.calendar-day').forEach(day => {
        // Skip past days and today
        if (day.classList.contains('past') || day.classList.contains('today') || day.hasAttribute('disabled')) {
          return;
        }
        
        day.addEventListener('click', () => {
          document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
          day.classList.add('selected');
          
          const dateStr = day.getAttribute('data-date');
          if (dateStr) {
            selectedDate = new Date(dateStr);
            fetchAvailableTimeSlots(selectedDate);
          } else {
            // For other month days or invalid dates, show a message
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
    
    // Add event listeners for month navigation
    document.getElementById('prev-month').addEventListener('click', () => {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      updateCalendar(currentMonth);
    });
    
    document.getElementById('next-month').addEventListener('click', () => {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      updateCalendar(currentMonth);
    });
    
    // Book appointment button handler
    document.getElementById('book-button').addEventListener('click', () => {
      const selectedTimeBtn = document.querySelector('.time-button.selected');
      if (!selectedTimeBtn) {
        alert('Please select a time slot');
        return;
      }
      
      const time = selectedTimeBtn.getAttribute('data-time');
      const date = selectedDate.toISOString().split('T')[0];
      
      // In a real implementation, this would submit to your booking API
      alert(\`Booking for \${date} at \${selectedTimeBtn.textContent}\`);
      
      // Mock API call - in a real application you would post to your booking endpoint
      console.log('Booking appointment:', {
        therapistId: new URLSearchParams(window.location.search).get('therapistId'),
        date: date,
        time: time
      });
    });
    
    // Initialize the page
    document.addEventListener('DOMContentLoaded', () => {
      attachCalendarListeners();
      
      // Initialize with selected date
      const selectedDay = document.querySelector('.calendar-day.selected');
      if (selectedDay) {
        const dateStr = selectedDay.getAttribute('data-date');
        if (dateStr) {
          fetchAvailableTimeSlots(new Date(dateStr));
        }
      } else {
        // Always look for the first non-past, non-today day
        const firstAvailableDay = Array.from(document.querySelectorAll('.calendar-day'))
          .find(day => !day.classList.contains('past') && 
                       !day.classList.contains('today') && 
                       !day.hasAttribute('disabled') && 
                       day.classList.contains('other-month') === false);
        
        if (firstAvailableDay) {
          firstAvailableDay.click();
        }
      }
    });
  `;
  
  // Update the calendar HTML in your template
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
          <h1 class="heading">${modalTitle}${therapistData ? ' with ' + therapistData.name : ''}</h1>
          
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
                <div id="current-month">${format(currentMonth, 'MMMM yyyy')}</div>
                <button class="time-button" style="width: auto; padding: 0.25rem 0.5rem;" id="next-month">&rarr;</button>
              </div>
              
              <div class="calendar">
                ${dayHeaders}
                ${calendarHtml}
              </div>
              
              <div class="selected-date">
                Selected: <span id="selected-date-display">${format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
              </div>
            </div>
            
            <div class="card">
              <div class="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.5rem">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Select a Time
              </div>
              
              <div class="selected-date">
                Selected: <span id="selected-time-display">No time selected</span>
              </div>
              
              <div class="time-grid">
                ${initialTimeSlots}
              </div>
              
              <button id="book-button" class="book-button" disabled>${buttonText}</button>
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