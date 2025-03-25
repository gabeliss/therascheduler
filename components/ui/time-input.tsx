"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { cn } from "@/lib/utils"

// Omit the value and onChange from the select props since we're handling them separately
interface TimeInputProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  value?: string;
  onChange?: (time: string) => void;
  minuteIncrement?: number;
}

const TimeInput: React.FC<TimeInputProps> = ({
  className,
  value = "",
  onChange,
  minuteIncrement = 15,
  ...props
}) => {
  // Generate time options in specified minute increments
  const timeOptions = React.useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += minuteIncrement) {
        const formattedHour = hour.toString().padStart(2, "0");
        const formattedMinute = minute.toString().padStart(2, "0");
        const timeValue = `${formattedHour}:${formattedMinute}`;
        
        // Create a date object to format the display label
        const timeDate = parse(timeValue, "HH:mm", new Date());
        const displayLabel = format(timeDate, "h:mm a");
        
        options.push({
          value: timeValue,
          label: displayLabel
        });
      }
    }
    return options;
  }, [minuteIncrement]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      value={value}
      onChange={handleChange}
      {...props}
    >
      <option value="" disabled>
        Select time
      </option>
      {timeOptions.map((time) => (
        <option key={time.value} value={time.value}>
          {time.label}
        </option>
      ))}
    </select>
  );
};

export default TimeInput; 