import { format } from 'date-fns';

// Format time for display
export const formatTime = (time: string) => {
  if (!time) return '';
  
  try {
    // Handle both HH:MM and HH:MM:SS formats
    const timeValue = time.includes(':') ? time.split(':').slice(0, 2).join(':') : time;
    
    // Parse the time string (assuming format is HH:MM or HH:MM:SS)
    const [hoursStr, minutesStr] = timeValue.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    // Validate hours and minutes
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error(`Invalid time format: ${time}`);
    }
    
    // Format the time manually without using date-fns format
    const period = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${period}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    
    // Try to extract and format the time in a more basic way
    try {
      const parts = time.split(':');
      if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        
        if (!isNaN(hours) && !isNaN(minutes)) {
          const period = hours >= 12 ? 'pm' : 'am';
          const displayHours = hours % 12 || 12;
          const displayMinutes = minutes.toString().padStart(2, '0');
          
          return `${displayHours}:${displayMinutes} ${period}`;
        }
      }
    } catch (e) {
      // If all else fails, return the original time
      console.error('Fallback formatting failed:', e);
    }
    
    return time; // Return the original time string if all parsing fails
  }
}; 