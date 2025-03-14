/**
 * This file is maintained for backward compatibility.
 * It re-exports all utilities from the new modular structure.
 * 
 * For new code, please import directly from the appropriate module:
 * - import { TimeBlock } from '@/app/dashboard/availability/utils/time/types';
 * - import { formatTime } from '@/app/dashboard/availability/utils/time/format';
 * - import { getWeekDates } from '@/app/dashboard/availability/utils/time/dates';
 * - import { timeToMinutes } from '@/app/dashboard/availability/utils/time/calculations';
 * - import { createUnifiedTimeBlocks } from '@/app/dashboard/availability/utils/time/conflicts';
 * 
 * Or import everything from the index:
 * - import { TimeBlock, formatTime, getWeekDates } from '@/app/dashboard/availability/utils/time';
 */

export * from './time';
