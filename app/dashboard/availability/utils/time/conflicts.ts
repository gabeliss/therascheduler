import { format } from 'date-fns';
import { TimeBlock } from './types';
import { timeToMinutes, minutesToTimeString } from './calculations';

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
 * Creates a unified timeline of availability, time off, and appointment blocks
 * with all conflicts properly resolved.
 * 
 * @param availabilitySlots Array of availability slots
 * @param exceptionSlots Array of time off exceptions
 * @param appointmentSlots Array of appointments
 * @param date The date for which to create the timeline
 * @returns Array of time blocks with all conflicts resolved
 */
export function createUnifiedTimeBlocks(
  availabilitySlots: any[],
  exceptionSlots: any[],
  appointmentSlots: any[] = [],
  date?: Date
): TimeBlock[] {
  // First, check if there are any all-day time off blocks for this date
  // If so, they should override all availability blocks
  const allDayTimeOffBlocks: TimeBlock[] = [];
  const processedExceptionIds = new Set<string>();
  
  if (date) {
    const currentDateStr = format(date, 'yyyy-MM-dd');
    
    // Find all all-day time off blocks for this date
    const allDayExceptions = exceptionSlots.filter(ex => 
      ex.is_all_day && 
      ((ex.start_date && ex.end_date && 
        currentDateStr >= ex.start_date && 
        currentDateStr <= ex.end_date) ||
       ((ex as any).specific_date === currentDateStr))
    );
    
    // If there are any all-day time off blocks, they override everything else
    if (allDayExceptions.length > 0) {
      // Add them to our special array
      allDayTimeOffBlocks.push(...allDayExceptions.map(ex => {
        // Mark this exception as processed
        processedExceptionIds.add(ex.id);
        
        return {
          id: `${ex.id}-${currentDateStr}`, // Make ID unique for each day
          start_time: ex.start_time || '00:00:00',
          end_time: ex.end_time || '23:59:59',
          is_recurring: false, // Treat as non-recurring for this day
          type: 'time-off' as const,
          reason: ex.reason,
          original: ex,
          is_all_day: true,
          start_date: ex.start_date,
          end_date: ex.end_date
        };
      }));
      
      // If there are any all-day time off blocks, only process appointments
      // Skip processing availability blocks
      if (allDayTimeOffBlocks.length > 0) {
        // Process appointments that override time off
        let appointmentBlocks: TimeBlock[] = [];
        if (appointmentSlots.length > 0) {
          // Only include appointments that explicitly override time off
          appointmentBlocks = appointmentSlots
            .filter(appt => appt.overrides_time_off === true)
            .map(appointment => {
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
                is_recurring: false,
                type: 'appointment' as const,
                reason: appointment.notes,
                original: appointment,
                start_date: format(new Date(appointment.start_time), 'yyyy-MM-dd'),
                end_date: format(new Date(appointment.end_time), 'yyyy-MM-dd'),
                client_name: clientName,
                status: appointment.status,
                overrides_time_off: true
              };
            });
        }
        
        // Return all-day time off blocks and appointments that override time off
        // Sort appointments by start time
        const sortedAppointments = appointmentBlocks.sort((a, b) => 
          timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
        );
        
        return [...allDayTimeOffBlocks, ...sortedAppointments];
      }
    }
  }
  
  // First, handle multi-day all-day events separately
  // These should always appear regardless of other conflicts
  const multiDayAllDayEvents: TimeBlock[] = [];
  
  // If there are no all-day time off blocks, or we're not processing a specific date,
  // continue with the normal processing
  
  // Process appointments first - they take highest priority
  let appointmentBlocks: TimeBlock[] = [];
  if (appointmentSlots.length > 0) {
    // Convert appointments to TimeBlock format
    appointmentBlocks = appointmentSlots.map(appointment => {
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
        is_recurring: false,
        type: 'appointment' as const,
        reason: appointment.notes,
        original: appointment,
        start_date: format(new Date(appointment.start_time), 'yyyy-MM-dd'),
        end_date: format(new Date(appointment.end_time), 'yyyy-MM-dd'),
        client_name: clientName,
        status: appointment.status,
        // All appointments now override time-off by default
        overrides_time_off: true
      };
    });
  }

  // Convert availability slots to TimeBlock format
  const availabilityBlocks: TimeBlock[] = availabilitySlots.map(slot => ({
    id: slot.id,
    start_time: slot.start_time,
    end_time: slot.end_time,
    is_recurring: slot.is_recurring,
    type: 'availability' as const,
    original: slot,
    is_all_day: slot.is_all_day
  }));

  // Process time off exceptions, but exclude any that overlap with appointments
  const processedExceptionBlocks: TimeBlock[] = [];
  
  // Sort exceptions by priority (non-recurring first, then by start time)
  const sortedExceptions = [...exceptionSlots].sort((a, b) => {
    // Non-recurring exceptions take precedence
    if (a.is_recurring !== b.is_recurring) {
      return a.is_recurring ? 1 : -1;
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
    const overlapsWithAppointment = appointmentBlocks.some(appt => {
      const apptStartMinutes = timeToMinutes(appt.start_time);
      const apptEndMinutes = timeToMinutes(appt.end_time);
      
      return (
        (exStartMinutes < apptEndMinutes && exEndMinutes > apptStartMinutes) ||
        (apptStartMinutes < exEndMinutes && apptEndMinutes > exStartMinutes)
      );
    });
    
    // If this exception overlaps with an appointment, split it or skip it
    if (overlapsWithAppointment) {
      // Find all overlapping appointments
      const overlappingAppointments = appointmentBlocks
        .filter(appt => {
          const apptStartMinutes = timeToMinutes(appt.start_time);
          const apptEndMinutes = timeToMinutes(appt.end_time);
          
          return (
            (exStartMinutes < apptEndMinutes && exEndMinutes > apptStartMinutes) ||
            (apptStartMinutes < exEndMinutes && apptEndMinutes > exStartMinutes)
          );
        })
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
      
      // Split the exception around appointments
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
            is_recurring: ex.is_recurring,
            type: 'time-off' as const,
            reason: ex.reason,
            original: ex,
            is_all_day: ex.is_all_day,
            start_date: ex.start_date,
            end_date: ex.end_date
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
          is_recurring: ex.is_recurring,
          type: 'time-off' as const,
          reason: ex.reason,
          original: ex,
          is_all_day: ex.is_all_day,
          start_date: ex.start_date,
          end_date: ex.end_date
        });
      }
    } else {
      // No overlaps with appointments, check for overlaps with other exceptions
      const overlappingBlocks = processedExceptionBlocks.filter(block => {
        const blockStartMinutes = timeToMinutes(block.start_time);
        const blockEndMinutes = timeToMinutes(block.end_time);
        
        return (
          (exStartMinutes < blockEndMinutes && exEndMinutes > blockStartMinutes) ||
          (blockStartMinutes < exEndMinutes && blockEndMinutes > exStartMinutes)
        );
      });
      
      if (overlappingBlocks.length === 0) {
        // No overlaps, add the exception as is
        processedExceptionBlocks.push({
          id: ex.id,
          start_time: ex.start_time,
          end_time: ex.end_time,
          is_recurring: ex.is_recurring,
          type: 'time-off' as const,
          reason: ex.reason,
          original: ex,
          is_all_day: ex.is_all_day,
          start_date: ex.start_date,
          end_date: ex.end_date
        });
        continue;
      }
      
      // Handle overlaps for recurring exceptions
      if (ex.is_recurring) {
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
            is_recurring: true,
            type: 'time-off' as const,
            reason: ex.reason,
            original: ex,
            is_all_day: ex.is_all_day,
            start_date: ex.start_date,
            end_date: ex.end_date
          });
        });
      } else {
        // For one-time exceptions, they take precedence over recurring ones
        // Just add them as is
        processedExceptionBlocks.push({
          id: ex.id,
          start_time: ex.start_time,
          end_time: ex.end_time,
          is_recurring: ex.is_recurring,
          type: 'time-off' as const,
          reason: ex.reason,
          original: ex,
          is_all_day: ex.is_all_day,
          start_date: ex.start_date,
          end_date: ex.end_date
        });
      }
    }
  }
  
  const exceptionBlocks = processedExceptionBlocks;

  // Create a unified timeline by splitting availability blocks around time off blocks
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
    let currentStartMinutes = availStartMinutes;
    
    for (const exBlock of overlappingExceptions) {
      const exStartMinutes = timeToMinutes(exBlock.start_time);
      const exEndMinutes = timeToMinutes(exBlock.end_time);
      
      // Add availability block before the time off if there's a gap
      if (currentStartMinutes < exStartMinutes) {
        unifiedBlocks.push({
          ...availBlock,
          id: `${availBlock.id}-split-${currentStartMinutes}-${exStartMinutes}`,
          start_time: minutesToTimeString(currentStartMinutes),
          end_time: minutesToTimeString(exStartMinutes),
          original_time: `${availBlock.start_time} - ${availBlock.end_time}`
        });
      }
      
      // Add the time off block
      unifiedBlocks.push(exBlock);
      
      // Update the current start time to after this time off block
      currentStartMinutes = Math.max(currentStartMinutes, exEndMinutes);
    }
    
    // Add the final availability block after all time off blocks if needed
    if (currentStartMinutes < availEndMinutes) {
      unifiedBlocks.push({
        ...availBlock,
        id: `${availBlock.id}-split-${currentStartMinutes}-${availEndMinutes}`,
        start_time: minutesToTimeString(currentStartMinutes),
        end_time: minutesToTimeString(availEndMinutes),
        original_time: `${availBlock.start_time} - ${availBlock.end_time}`
      });
    }
  }
  
  // Process availability blocks around appointments
  if (appointmentBlocks.length > 0) {
    const availabilityBlocksToProcess = [...unifiedBlocks].filter(block => block.type === 'availability');
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
      let currentStartMinutes = availStartMinutes;
      
      for (const apptBlock of overlappingAppointments) {
        const apptStartMinutes = timeToMinutes(apptBlock.start_time);
        const apptEndMinutes = timeToMinutes(apptBlock.end_time);
        
        // Add availability block before the appointment if there's a gap
        if (currentStartMinutes < apptStartMinutes) {
          processedBlocks.push({
            ...availBlock,
            id: `${availBlock.id}-split-${currentStartMinutes}-${apptStartMinutes}`,
            start_time: minutesToTimeString(currentStartMinutes),
            end_time: minutesToTimeString(apptStartMinutes),
            original_time: `${availBlock.start_time} - ${availBlock.end_time}`
          });
        }
        
        // Add the appointment block
        processedBlocks.push(apptBlock);
        
        // Update the current start time to after this appointment block
        currentStartMinutes = Math.max(currentStartMinutes, apptEndMinutes);
      }
      
      // Add the final availability block after all appointment blocks if needed
      if (currentStartMinutes < availEndMinutes) {
        processedBlocks.push({
          ...availBlock,
          id: `${availBlock.id}-split-${currentStartMinutes}-${availEndMinutes}`,
          start_time: minutesToTimeString(currentStartMinutes),
          end_time: minutesToTimeString(availEndMinutes),
          original_time: `${availBlock.start_time} - ${availBlock.end_time}`
        });
      }
    }
    
    unifiedBlocks = processedBlocks;
  }
  
  // Make sure all appointments are included in the final blocks
  // This ensures appointments are always shown, even if they don't overlap with availability
  const existingAppointmentIds = unifiedBlocks
    .filter(block => block.type === 'appointment')
    .map(block => block.id);
  
  const missingAppointments = appointmentBlocks.filter(
    appt => !existingAppointmentIds.includes(appt.id)
  );
  
  if (missingAppointments.length > 0) {
    unifiedBlocks = [...unifiedBlocks, ...missingAppointments];
  }
  
  // Sort the unified blocks by start time
  const sortedBlocks = unifiedBlocks.sort((a, b) => 
    timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );

  // Make sure to include our multi-day all-day events in the final result
  let finalBlocks = [...sortedBlocks];
  
  if (allDayTimeOffBlocks.length > 0) {
    // Add all-day time off blocks at the beginning
    finalBlocks = [...allDayTimeOffBlocks, ...finalBlocks];
  }

  return finalBlocks;
} 