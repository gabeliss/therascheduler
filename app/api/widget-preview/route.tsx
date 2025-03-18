import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const therapistId = searchParams.get('therapistId');
  const primaryColor = searchParams.get('primaryColor') || '#0f766e';
  const buttonText = searchParams.get('buttonText') || 'Book Appointment';
  const modalTitle = searchParams.get('modalTitle') || 'Book Your Appointment';
  
  if (!therapistId) {
    return new NextResponse('Missing therapistId parameter', { status: 400 });
  }
  
  // Define inline styles to avoid any external dependencies
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
  `;
  
  // Simple booking widget HTML with no connection to the main app
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
          <h1 class="heading">Book an Appointment</h1>
          
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
                <button class="time-button" style="width: auto; padding: 0.25rem 0.5rem;">&larr;</button>
                <div>March 2024</div>
                <button class="time-button" style="width: auto; padding: 0.25rem 0.5rem;">&rarr;</button>
              </div>
              
              <div class="calendar">
                <div class="day-header">Su</div>
                <div class="day-header">Mo</div>
                <div class="day-header">Tu</div>
                <div class="day-header">We</div>
                <div class="day-header">Th</div>
                <div class="day-header">Fr</div>
                <div class="day-header">Sa</div>
                
                <!-- Example calendar days -->
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
              <div style="font-size: 0.75rem; color: #666; margin-bottom: 0.75rem">
                Tuesday, March 19, 2024
              </div>
              
              <div class="time-grid">
                <div class="time-button">9:00 AM</div>
                <div class="time-button">9:30 AM</div>
                <div class="time-button">10:00 AM</div>
                <div class="time-button">10:30 AM</div>
                <div class="time-button selected">11:00 AM</div>
                <div class="time-button">11:30 AM</div>
                <div class="time-button">1:00 PM</div>
                <div class="time-button">1:30 PM</div>
                <div class="time-button">2:00 PM</div>
              </div>
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
        
        <script>
          // Simple preview interactivity - just for demo purposes
          document.querySelectorAll('.calendar-day').forEach(day => {
            day.addEventListener('click', () => {
              document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
              day.classList.add('selected');
            });
          });
          
          document.querySelectorAll('.time-button').forEach(button => {
            button.addEventListener('click', () => {
              document.querySelectorAll('.time-button').forEach(b => b.classList.remove('selected'));
              button.classList.add('selected');
            });
          });
        </script>
      </body>
    </html>
  `;
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
} 