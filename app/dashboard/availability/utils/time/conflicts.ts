import { format } from 'date-fns';
import { TimeBlock } from './types';
import { timeToMinutes, minutesToTimeString } from './calculations';
import { getDaysOfWeekFromRecurrence, DayOfWeek } from '@/app/utils/schema-converters';

/**
 * Helper to determine if a time-off is all-day based on timestamps
 */
function isAllDayTimeOff(startTime: string, endTime: string): boolean {
  try {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    const startHours = startDate.getHours();
    const startMinutes = startDate.getMinutes();
    const endHours = endDate.getHours();
    const endMinutes = endDate.getMinutes();
    
    // Consider it all-day if it starts at/before 00:10 and ends at/after 23:50
    return (startHours === 0 && startMinutes <= 10) && 
           (endHours === 23 && endMinutes >= 50);
  } catch (error) {
    return false;
  }
}

/**
 * Resolves conflicts between appointments and time off blocks
 * Appointments always take precedence over time off blocks
 * 
 * @param blocks Array of time blocks to resolve conflicts for
 * @returns Array of time blocks with conflicts resolved
 */
export function resolveTimeBlockConflicts(blocks: TimeBlock[]): TimeBlock[] {
  // First pass: identify all appointments
  const appointments = blocks.filter(block => block.type === 'appointment');
  
  // If no appointments, return blocks as is
  if (appointments.length === 0) {
    return blocks;
  }
  
  // Second pass: remove or split time off blocks that conflict with appointments
  const resolvedBlocks: TimeBlock[] = [];
  
  // First add all non-time-off blocks (including appointments)
  const nonTimeOffBlocks = blocks.filter(block => block.type !== 'time-off');
  resolvedBlocks.push(...nonTimeOffBlocks);
  
  // Then process time-off blocks
  for (const block of blocks) {
    // Skip non-time-off blocks as we've already added them
    if (block.type !== 'time-off') {
      continue;
    }
    
    const blockStartMinutes = timeToMinutes(block.start_time);
    const blockEndMinutes = timeToMinutes(block.end_time);
    
    // Find all appointments that overlap with this time off block
    const overlappingAppointments = appointments.filter(appt => {
      const apptStartMinutes = timeToMinutes(appt.start_time);
      const apptEndMinutes = timeToMinutes(appt.end_time);
      
      const overlaps = (
        (apptStartMinutes < blockEndMinutes && apptEndMinutes > blockStartMinutes) ||
        (blockStartMinutes < apptEndMinutes && blockEndMinutes > apptStartMinutes)
      );
      
      return overlaps;
    }).sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    
    // If no overlapping appointments, add the time off block as is
    if (overlappingAppointments.length === 0) {
      resolvedBlocks.push(block);
      continue;
    }
    
    // Split the time off block around the appointments
    let currentStartMinutes = blockStartMinutes;
    let hasAddedSegment = false;
    
    for (const appt of overlappingAppointments) {
      const apptStartMinutes = timeToMinutes(appt.start_time);
      const apptEndMinutes = timeToMinutes(appt.end_time);
      
      // Add time off segment before the appointment if there's a gap
      if (currentStartMinutes < apptStartMinutes) {
        const newBlock = {
          ...block,
          id: `${block.id}-split-before-${appt.id}`,
          start_time: minutesToTimeString(currentStartMinutes),
          end_time: minutesToTimeString(apptStartMinutes)
        };

        resolvedBlocks.push(newBlock);
        hasAddedSegment = true;
      }
      
      // Update current start to after this appointment
      currentStartMinutes = Math.max(currentStartMinutes, apptEndMinutes);
    }
    
    // Add final time off segment after all appointments if needed
    if (currentStartMinutes < blockEndMinutes) {
      const newBlock = {
        ...block,
        id: `${block.id}-split-after`,
        start_time: minutesToTimeString(currentStartMinutes),
        end_time: minutesToTimeString(blockEndMinutes)
      };
      
      resolvedBlocks.push(newBlock);
      hasAddedSegment = true;
    }
  }
  
  // Sort the resolved blocks by start time
  const result = resolvedBlocks.sort((a, b) => 
    timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );
  
  return result;
}

/**
 * Converts an appointment to a TimeBlock
 */
function appointmentToTimeBlock(appointment: any): TimeBlock {
  // Get the correct start and end times
  let startTimeStr, endTimeStr;
  
  if ('display_start_time' in appointment && typeof appointment.display_start_time === 'string') {
    // Use the display time properties if available
    startTimeStr = appointment.display_start_time;
    endTimeStr = 'display_end_time' in appointment && typeof appointment.display_end_time === 'string' 
      ? appointment.display_end_time 
      : format(new Date(appointment.end_time), 'HH:mm:ss');
  } else if ('formatted_start_time' in appointment && typeof appointment.formatted_start_time === 'string') {
    // Use the formatted time if available
    const formattedStart = new Date(appointment.formatted_start_time);
    const formattedEnd = new Date(
      'formatted_end_time' in appointment && typeof appointment.formatted_end_time === 'string' 
        ? appointment.formatted_end_time 
        : appointment.end_time
    );
    startTimeStr = format(formattedStart, 'HH:mm:ss');
    endTimeStr = format(formattedEnd, 'HH:mm:ss');
  } else {
    // Fall back to regular time handling
    const startDate = new Date(appointment.start_time);
    const endDate = new Date(appointment.end_time);
    startTimeStr = format(startDate, 'HH:mm:ss');
    endTimeStr = format(endDate, 'HH:mm:ss');
  }
  
  // Get client name safely with proper type checking
  let clientName = undefined;
  if ('client' in appointment && 
      appointment.client && 
      typeof appointment.client === 'object' && 
      'name' in appointment.client) {
    clientName = appointment.client.name;
  }
  
  return {
    id: appointment.id,
    start_time: startTimeStr,
    end_time: endTimeStr,
    recurrence: null,
    type: 'appointment' as const,
    reason: appointment.notes,
    original: appointment,
    client_name: clientName,
    status: appointment.status,
    overrides_time_off: appointment.overrides_time_off || true
  };
}

/**
 * Processes all-day time off blocks for a specific date
 */
function processAllDayTimeOffBlocks(
  timeOffPeriods: any[],
  date: Date,
  processedTimeOffIds: Set<string>
): TimeBlock[] {
  const allDayTimeOffBlocks: TimeBlock[] = [];
  const currentDateStr = format(date, 'yyyy-MM-dd');
  
  // Find all-day time off blocks for this date
  const allDayTimeOff = timeOffPeriods.filter(timeOff => {
    // Check if this time-off period covers the full day (00:00 to 23:59)
    const startTime = new Date(timeOff.start_time);
    const endTime = new Date(timeOff.end_time);
    
    // Extract dates
    const startDateStr = format(startTime, 'yyyy-MM-dd');
    const endDateStr = format(endTime, 'yyyy-MM-dd');
    
    // Check if this is an all-day time-off by examining the time part
    const isFullDay = isAllDayTimeOff(timeOff.start_time, timeOff.end_time);
    
    // Check if this day falls within the time-off period
    const isInRange = currentDateStr >= startDateStr && currentDateStr <= endDateStr;
    
    return isFullDay && isInRange;
  });
  
  // Convert all-day time-off periods to TimeBlocks
  allDayTimeOffBlocks.push(...allDayTimeOff.map(timeOff => {
    // Mark this time-off period as processed
    processedTimeOffIds.add(timeOff.id);
    
    return {
      id: `${timeOff.id}-${currentDateStr}`, // Make ID unique for each day
      start_time: '00:00:00',
      end_time: '23:59:59',
      recurrence: timeOff.recurrence,
      type: 'time-off' as const,
      reason: timeOff.reason,
      original: timeOff
    };
  }));
  
  return allDayTimeOffBlocks;
}

/**
 * Processes appointments that override time off
 */
function processAppointmentsOverridingTimeOff(appointmentSlots: any[]): TimeBlock[] {
  return appointmentSlots
    .filter(appt => appt.overrides_time_off === true)
    .map(appointmentToTimeBlock)
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
}

/**
 * Converts availability slots to TimeBlock format
 */
function availabilityToTimeBlocks(availabilitySlots: any[]): TimeBlock[] {
  return availabilitySlots.map(slot => ({
    id: slot.id,
    start_time: slot.start_time,
    end_time: slot.end_time,
    recurrence: slot.recurrence,
    type: 'availability' as const,
    original: slot
  }));
}

/**
 * Checks if two time blocks overlap
 */
function doTimeBlocksOverlap(
  block1Start: number,
  block1End: number,
  block2Start: number,
  block2End: number
): boolean {
  return (
    (block1Start < block2End && block1End > block2Start) ||
    (block2Start < block1End && block2End > block1Start)
  );
}

/**
 * Splits a time block around overlapping blocks
 */
function splitTimeBlockAroundOverlaps(
  blockToSplit: TimeBlock,
  overlappingBlocks: TimeBlock[]
): TimeBlock[] {
  const result: TimeBlock[] = [];
  const blockStartMinutes = timeToMinutes(blockToSplit.start_time);
  const blockEndMinutes = timeToMinutes(blockToSplit.end_time);
  
  // Sort overlapping blocks by start time
  const sortedOverlaps = [...overlappingBlocks].sort((a, b) => 
    timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );
  
  let currentStartMinutes = blockStartMinutes;
  
  for (const overlapBlock of sortedOverlaps) {
    const overlapStartMinutes = timeToMinutes(overlapBlock.start_time);
    const overlapEndMinutes = timeToMinutes(overlapBlock.end_time);
    
    // Add segment before this overlap if there's a gap
    if (currentStartMinutes < overlapStartMinutes) {
      result.push({
        ...blockToSplit,
        id: `${blockToSplit.id}-split-${currentStartMinutes}-${overlapStartMinutes}`,
        start_time: minutesToTimeString(currentStartMinutes),
        end_time: minutesToTimeString(overlapStartMinutes),
        original_time: `${blockToSplit.start_time} - ${blockToSplit.end_time}`
      });
    }
    
    // Add the overlapping block
    result.push(overlapBlock);
    
    // Update current start to after this overlap
    currentStartMinutes = Math.max(currentStartMinutes, overlapEndMinutes);
  }
  
  // Add final segment if needed
  if (currentStartMinutes < blockEndMinutes) {
    result.push({
      ...blockToSplit,
      id: `${blockToSplit.id}-split-${currentStartMinutes}-${blockEndMinutes}`,
      start_time: minutesToTimeString(currentStartMinutes),
      end_time: minutesToTimeString(blockEndMinutes),
      original_time: `${blockToSplit.start_time} - ${blockToSplit.end_time}`
    });
  }
  
  return result;
}

/**
 * Processes time off exceptions, handling overlaps with appointments
 */
function processTimeOffExceptions(
  exceptionSlots: any[],
  appointmentBlocks: TimeBlock[],
  processedExceptionIds: Set<string>
): TimeBlock[] {
  const processedExceptionBlocks: TimeBlock[] = [];
  
  // Sort exceptions by priority (non-recurring first, then by start time)
  const sortedExceptions = [...exceptionSlots].sort((a, b) => {
    // Non-recurring exceptions take precedence
    if ((a.recurrence !== null) !== (b.recurrence !== null)) {
      return a.recurrence !== null ? 1 : -1;
    }
    // If both are the same type, sort by start time
    return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
  });
  
  // Process each exception and handle overlaps
  for (const ex of sortedExceptions) {
    // Skip exceptions we've already processed as all-day events
    if (processedExceptionIds.has(ex.id)) {
      continue;
    }
    
    const exStartMinutes = timeToMinutes(ex.start_time);
    const exEndMinutes = timeToMinutes(ex.end_time);
    
    // Check if this exception overlaps with any appointment
    const overlappingAppointments = appointmentBlocks
      .filter(appt => {
        const apptStartMinutes = timeToMinutes(appt.start_time);
        const apptEndMinutes = timeToMinutes(appt.end_time);
        
        return doTimeBlocksOverlap(exStartMinutes, exEndMinutes, apptStartMinutes, apptEndMinutes);
      })
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    
    // If this exception overlaps with appointments, split it
    if (overlappingAppointments.length > 0) {
      let currentStartMinutes = exStartMinutes;
      
      for (const appt of overlappingAppointments) {
        const apptStartMinutes = timeToMinutes(appt.start_time);
        const apptEndMinutes = timeToMinutes(appt.end_time);
        
        // Add exception segment before the appointment if there's a gap
        if (currentStartMinutes < apptStartMinutes) {
          processedExceptionBlocks.push({
            id: `${ex.id}-split-before-${appt.id}`,
            start_time: minutesToTimeString(currentStartMinutes),
            end_time: minutesToTimeString(apptStartMinutes),
            recurrence: ex.recurrence,
            type: 'time-off' as const,
            reason: ex.reason,
            original: ex
          });
        }
        
        // Update current start to after this appointment
        currentStartMinutes = Math.max(currentStartMinutes, apptEndMinutes);
      }
      
      // Add final exception segment after all appointments if needed
      if (currentStartMinutes < exEndMinutes) {
        processedExceptionBlocks.push({
          id: `${ex.id}-split-after`,
          start_time: minutesToTimeString(currentStartMinutes),
          end_time: minutesToTimeString(exEndMinutes),
          recurrence: ex.recurrence,
          type: 'time-off' as const,
          reason: ex.reason,
          original: ex
        });
      }
    } else {
      // No overlaps with appointments, check for overlaps with other exceptions
      const overlappingBlocks = processedExceptionBlocks.filter(block => {
        const blockStartMinutes = timeToMinutes(block.start_time);
        const blockEndMinutes = timeToMinutes(block.end_time);
        
        return doTimeBlocksOverlap(exStartMinutes, exEndMinutes, blockStartMinutes, blockEndMinutes);
      });
      
      if (overlappingBlocks.length === 0) {
        // No overlaps, add the exception as is
        processedExceptionBlocks.push({
          id: ex.id,
          start_time: ex.start_time,
          end_time: ex.end_time,
          recurrence: ex.recurrence,
          type: 'time-off' as const,
          reason: ex.reason,
          original: ex
        });
        continue;
      }
      
      // Handle overlaps for recurring exceptions
      if (ex.recurrence) {
        // Check if it's completely covered by any one-time exception
        const completelyOverlapped = overlappingBlocks.some(block => {
          const blockStartMinutes = timeToMinutes(block.start_time);
          const blockEndMinutes = timeToMinutes(block.end_time);
          return blockStartMinutes <= exStartMinutes && blockEndMinutes >= exEndMinutes;
        });
        
        if (completelyOverlapped) {
          // Skip this recurring exception as it's completely covered
          continue;
        }
        
        // Split the recurring exception around one-time exceptions
        let currentStartMinutes = exStartMinutes;
        let segments: {start: number, end: number}[] = [];
        
        // Sort overlapping blocks by start time
        const sortedOverlaps = [...overlappingBlocks].sort((a, b) => 
          timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
        );
        
        // Create segments for the parts of the recurring exception that don't overlap
        for (const block of sortedOverlaps) {
          const blockStartMinutes = timeToMinutes(block.start_time);
          const blockEndMinutes = timeToMinutes(block.end_time);
          
          // Add segment before this overlap if there's a gap
          if (currentStartMinutes < blockStartMinutes) {
            segments.push({
              start: currentStartMinutes,
              end: blockStartMinutes
            });
          }
          
          // Update current start to after this overlap
          currentStartMinutes = Math.max(currentStartMinutes, blockEndMinutes);
        }
        
        // Add final segment if needed
        if (currentStartMinutes < exEndMinutes) {
          segments.push({
            start: currentStartMinutes,
            end: exEndMinutes
          });
        }
        
        // Add each segment as a separate block
        segments.forEach((segment, index) => {
          processedExceptionBlocks.push({
            id: `${ex.id}-split-${index}`,
            start_time: minutesToTimeString(segment.start),
            end_time: minutesToTimeString(segment.end),
            recurrence: ex.recurrence,
            type: 'time-off' as const,
            reason: ex.reason,
            original: ex
          });
        });
      } else {
        // For one-time exceptions, they take precedence over recurring ones
        // Just add them as is
        processedExceptionBlocks.push({
          id: ex.id,
          start_time: ex.start_time,
          end_time: ex.end_time,
          recurrence: ex.recurrence,
          type: 'time-off' as const,
          reason: ex.reason,
          original: ex
        });
      }
    }
  }
  
  return processedExceptionBlocks;
}

/**
 * Creates a unified timeline by splitting availability blocks around time off blocks
 */
function createUnifiedTimeline(
  availabilityBlocks: TimeBlock[],
  exceptionBlocks: TimeBlock[]
): TimeBlock[] {
  let unifiedBlocks: TimeBlock[] = [];

  // Process each availability block
  for (const availBlock of availabilityBlocks) {
    const availStartMinutes = timeToMinutes(availBlock.start_time);
    const availEndMinutes = timeToMinutes(availBlock.end_time);
    
    // Find all overlapping time off blocks
    const overlappingExceptions = exceptionBlocks.filter(exBlock => {
      const exStartMinutes = timeToMinutes(exBlock.start_time);
      const exEndMinutes = timeToMinutes(exBlock.end_time);
      
      return (
        (exStartMinutes >= availStartMinutes && exStartMinutes < availEndMinutes) ||
        (exEndMinutes > availStartMinutes && exEndMinutes <= availEndMinutes) ||
        (exStartMinutes <= availStartMinutes && exEndMinutes >= availEndMinutes)
      );
    }).sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    
    // If no overlapping exceptions, add the availability block as is
    if (overlappingExceptions.length === 0) {
      unifiedBlocks.push(availBlock);
      continue;
    }
    
    // Split the availability block around the time off blocks
    const splitBlocks = splitTimeBlockAroundOverlaps(availBlock, overlappingExceptions);
    unifiedBlocks.push(...splitBlocks);
  }
  
  return unifiedBlocks;
}

/**
 * Processes availability blocks around appointments
 */
function processAvailabilityAroundAppointments(
  unifiedBlocks: TimeBlock[],
  appointmentBlocks: TimeBlock[]
): TimeBlock[] {
  if (appointmentBlocks.length === 0) {
    return unifiedBlocks;
  }
  
  const availabilityBlocksToProcess = unifiedBlocks.filter(block => block.type === 'availability');
  const otherBlocks = unifiedBlocks.filter(block => block.type !== 'availability');
  
  let processedBlocks: TimeBlock[] = [...otherBlocks];
  
  // Process each availability block
  for (const availBlock of availabilityBlocksToProcess) {
    const availStartMinutes = timeToMinutes(availBlock.start_time);
    const availEndMinutes = timeToMinutes(availBlock.end_time);
    
    // Find all overlapping appointment blocks
    const overlappingAppointments = appointmentBlocks.filter(apptBlock => {
      const apptStartMinutes = timeToMinutes(apptBlock.start_time);
      const apptEndMinutes = timeToMinutes(apptBlock.end_time);
      
      return (
        (apptStartMinutes >= availStartMinutes && apptStartMinutes < availEndMinutes) ||
        (apptEndMinutes > availStartMinutes && apptEndMinutes <= availEndMinutes) ||
        (apptStartMinutes <= availStartMinutes && apptEndMinutes >= availEndMinutes)
      );
    }).sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    
    // If no overlapping appointments, add the availability block as is
    if (overlappingAppointments.length === 0) {
      processedBlocks.push(availBlock);
      continue;
    }
    
    // Split the availability block around the appointment blocks
    const splitBlocks = splitTimeBlockAroundOverlaps(availBlock, overlappingAppointments);
    processedBlocks.push(...splitBlocks);
  }
  
  return processedBlocks;
}

/**
 * Ensures all appointments are included in the final blocks
 */
function ensureAllAppointmentsIncluded(
  unifiedBlocks: TimeBlock[],
  appointmentBlocks: TimeBlock[]
): TimeBlock[] {
  const existingAppointmentIds = unifiedBlocks
    .filter(block => block.type === 'appointment')
    .map(block => block.id);
  
  const missingAppointments = appointmentBlocks.filter(
    appt => !existingAppointmentIds.includes(appt.id)
  );
  
  if (missingAppointments.length > 0) {
    return [...unifiedBlocks, ...missingAppointments];
  }
  
  return unifiedBlocks;
}

/**
 * Creates unified time blocks from availability, exceptions, and appointments
 */
export function createUnifiedTimeBlocks(
  availabilitySlots: any[],
  exceptionSlots: any[],
  appointmentSlots: any[] = [],
  date?: Date
): TimeBlock[] {
  // Track processed exception IDs to avoid duplicates
  const processedExceptionIds = new Set<string>();
  
  // Step 1: Process all-day time off blocks for the specific date
  if (date) {
    const allDayTimeOffBlocks = processAllDayTimeOffBlocks(exceptionSlots, date, processedExceptionIds);
    
    // If there are any all-day time off blocks, they override everything else
    if (allDayTimeOffBlocks.length > 0) {
      // Process appointments that override time off
      const appointmentsOverridingTimeOff = processAppointmentsOverridingTimeOff(appointmentSlots);
      
      // Return all-day time off blocks and appointments that override time off
      return [...allDayTimeOffBlocks, ...appointmentsOverridingTimeOff];
    }
  }
  
  // Step 2: Process appointments
  const appointmentBlocks = appointmentSlots.map(appointmentToTimeBlock);
  
  // Step 3: Convert availability slots to TimeBlock format
  const availabilityBlocks = availabilityToTimeBlocks(availabilitySlots);
  
  // Step 4: Process time off exceptions, handling overlaps with appointments
  const exceptionBlocks = processTimeOffExceptions(exceptionSlots, appointmentBlocks, processedExceptionIds);
  
  // Step 5: Create a unified timeline by splitting availability blocks around time off blocks
  let unifiedBlocks = createUnifiedTimeline(availabilityBlocks, exceptionBlocks);
  
  // Step 6: Process availability blocks around appointments
  unifiedBlocks = processAvailabilityAroundAppointments(unifiedBlocks, appointmentBlocks);
  
  // Step 7: Ensure all appointments are included in the final blocks
  unifiedBlocks = ensureAllAppointmentsIncluded(unifiedBlocks, appointmentBlocks);
  
  // Step 8: Sort the unified blocks by start time
  return unifiedBlocks.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
} 