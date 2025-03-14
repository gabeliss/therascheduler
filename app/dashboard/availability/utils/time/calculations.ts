// Convert time string (HH:MM) to minutes
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper function to convert minutes to time string (HH:MM:SS)
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
}

// Check if two time ranges overlap
export function checkTimeOverlap(
  startTime1: string,
  endTime1: string,
  startTime2: string,
  endTime2: string
): boolean {
  // Convert times to minutes for easier comparison
  const start1 = timeToMinutes(startTime1);
  const end1 = timeToMinutes(endTime1);
  const start2 = timeToMinutes(startTime2);
  const end2 = timeToMinutes(endTime2);

  // Check for overlap
  return start1 < end2 && start2 < end1;
}

// Validate that end time is after start time
export function validateTimeRange(startTime: string, endTime: string): { isValid: boolean; errorMessage?: string } {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  if (endMinutes <= startMinutes) {
    return {
      isValid: false,
      errorMessage: 'End time cannot be before or equal to start time'
    };
  }
  
  return { isValid: true };
} 