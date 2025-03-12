"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { cn } from "@/lib/utils"

// Omit the value and onChange from the select props since we're handling them separately
interface TimePickerInputProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  value?: Date
  onChange?: (date: Date) => void
  minuteIncrement?: number
}

export function TimePickerInput({
  className,
  value,
  onChange,
  minuteIncrement = 15,
  ...props
}: TimePickerInputProps) {
  const [timeValue, setTimeValue] = React.useState<string>(
    value ? format(value, "HH:mm") : ""
  )

  // Update internal state when value prop changes
  React.useEffect(() => {
    if (value) {
      setTimeValue(format(value, "HH:mm"))
    }
  }, [value])

  // Generate time options in 15-minute increments
  const timeOptions = React.useMemo(() => {
    const options: string[] = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += minuteIncrement) {
        const formattedHour = hour.toString().padStart(2, "0")
        const formattedMinute = minute.toString().padStart(2, "0")
        options.push(`${formattedHour}:${formattedMinute}`)
      }
    }
    return options
  }, [minuteIncrement])

  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTimeValue = e.target.value
    setTimeValue(newTimeValue)
    
    if (newTimeValue && onChange) {
      try {
        // Create a date object from the selected time
        const timeDate = parse(newTimeValue, "HH:mm", new Date())
        
        // If we have an existing value, preserve the date part
        if (value) {
          const newDate = new Date(value)
          newDate.setHours(timeDate.getHours())
          newDate.setMinutes(timeDate.getMinutes())
          newDate.setSeconds(0)
          newDate.setMilliseconds(0)
          onChange(newDate)
        } else {
          // Otherwise use today's date
          const today = new Date()
          today.setHours(timeDate.getHours())
          today.setMinutes(timeDate.getMinutes())
          today.setSeconds(0)
          today.setMilliseconds(0)
          onChange(today)
        }
      } catch (error) {
        console.error("Error parsing time:", error)
      }
    }
  }

  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      value={timeValue}
      onChange={handleTimeChange}
      {...props}
    >
      <option value="" disabled>
        Select time
      </option>
      {timeOptions.map((time) => (
        <option key={time} value={time}>
          {format(parse(time, "HH:mm", new Date()), "h:mm a")}
        </option>
      ))}
    </select>
  )
} 