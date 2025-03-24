# Availability Management

## Overview

The Availability Management feature allows therapists to set and manage their working hours, ensuring clients can only book sessions during available time slots. This includes setting **recurring availability**, **one-time availability**, and **blocking time off** for vacations or breaks.

## Database Schema

### **availability** (Stores therapist availability slots)

| Column         | Type      | Description                                                 |
| -------------- | --------- | ----------------------------------------------------------- |
| `id`           | UUID (PK) | Unique identifier                                           |
| `therapist_id` | UUID (FK) | Therapist who owns the availability                         |
| `start_time`   | TIMESTAMP | Start time of available slot                                |
| `end_time`     | TIMESTAMP | End time of available slot                                  |
| `recurrence`   | STRING    | Recurrence rule (e.g., daily, weekly) or `null` if one-time |
| `created_at`   | TIMESTAMP | Auto-generated creation timestamp                           |
| `updated_at`   | TIMESTAMP | Auto-generated update timestamp                             |

### **time_off** (Stores blocked-off time for therapists)

| Column         | Type      | Description                                |
| -------------- | --------- | ------------------------------------------ |
| `id`           | UUID (PK) | Unique identifier                          |
| `therapist_id` | UUID (FK) | Therapist who owns the time-off block      |
| `start_time`   | TIMESTAMP | Start time of blocked time                 |
| `end_time`     | TIMESTAMP | End time of blocked time                   |
| `reason`       | STRING    | Optional reason (e.g., vacation, personal) |
| `recurrence`   | STRING    | Recurrence rule or `null` if one-time      |
| `created_at`   | TIMESTAMP | Auto-generated creation timestamp          |
| `updated_at`   | TIMESTAMP | Auto-generated update timestamp            |

## API Endpoints

### **Create Availability**

**`POST /api/availability`**

- Request: `{ therapist_id, start_time, end_time, recurrence }`
- Response: `{ success: true, availability_id }`

### **Update Availability**

**`PUT /api/availability/:id`**

- Request: `{ start_time, end_time, recurrence }`
- Response: `{ success: true }`

### **Delete Availability**

**`DELETE /api/availability/:id`**

- Request: None
- Response: `{ success: true }`

### **Get Therapist Availability**

**`GET /api/availability?therapist_id={id}`**

- Response: `{ availability: [{ id, start_time, end_time, recurrence }] }`

### **Create Time Off**

**`POST /api/time-off`**

- Request: `{ therapist_id, start_time, end_time, reason, recurrence }`
- Response: `{ success: true, time_off_id }`

### **Delete Time Off**

**`DELETE /api/time-off/:id`**

- Request: None
- Response: `{ success: true }`

## UI/UX Breakdown

### **Therapist Dashboard - Availability Management**

- **Calendar View**: Shows weekly/monthly availability, time-off blocks, and scheduled appointments.
- **Add Availability (via Modal)**:

  - Therapist clicks a day or time slot.
  - Modal appears to enter:
    - Start time
    - End time
    - Recurrence (none, daily, weekly)
  - Only one day can be edited at a time to maintain control and prevent overlapping errors.

- **Block Time Off (via Modal)**:

  - Therapist selects a date range or time slot.
  - Modal appears to input:
    - Start time
    - End time
    - Reason (optional)
    - Recurrence (optional)
  - Supports single-day and multi-day ranges.
  - If a therapist wants to block the same hour (e.g., lunch 12-1 PM) every weekday, they:
    - Select one day (e.g., Monday)
    - In the modal, set recurrence to "Weekly" and select multiple days (Mon–Fri)
    - One API call is made with recurrence rule: `weekly` on `Mon, Tue, Wed, Thu, Fri`
    - The application will interpret the recurrence rule dynamically instead of storing multiple records.

- **Edit/Delete Existing Entries**:

  - Clicking an availability or time-off block opens the edit modal.
  - Options to edit one instance or all recurring instances.

- **Conflict Warnings**:
  - System alerts therapist when trying to create or edit a time block that overlaps with:
    - Existing availability
    - Existing time-off
    - Existing appointments
  - These checks are performed both client-side (in the UI) and server-side (in the API):
    - The UI will prevent most invalid submissions and show immediate feedback.
    - The API will perform final validation and return an error if a conflict is detected, ensuring data integrity.

---

## Reusable Components & Logic

### 🧩 UI Components

#### 1. Time Picker

- Used in availability, time-off, and appointment modals.
- Selectable in 30-minute increments.
- Prevents end time from being earlier than start time.
- Disables past times.

#### 2. Date Picker

- Used for selecting single or multiple dates.
- Prevents selection of past dates.
- Prevents end date from being before start date in range mode.

#### 3. Recurrence Selector

- Dropdown or toggle group to choose recurrence pattern: none, daily, weekly.
- Weekly option allows selecting specific days (e.g., Mon, Wed, Fri).
- Outputs recurrence rule string (e.g., `weekly:Mon,Wed,Fri`).

#### 4. Shared Modal Component

- Reused for both availability and time-off entry.
- Dynamically adjusts title and fields based on context.
- Includes form validation and submits to the appropriate API.

#### 5. Block Renderer

- Renders availability, time-off, and appointments on the calendar.
- Visual priority: **Appointments > Time Off > Availability**.
- If a time-off block overlaps an availability block, the availability is split into two blocks in the UI.
- Displays tooltips or popovers with details on hover/click.

#### 6. Confirmation Dialog

- Used before deleting blocks or overriding conflicts.
- Prompts for confirmation when editing/deleting recurring entries.

#### 7. Notification System

- Toast-based alerts for success, error, and warnings.
- Reused across all features.

### ⚙️ Logic Utilities

#### 1. Conflict Checker

- Determines if a new block overlaps existing availability, time-off, or appointments.
- Used in both the frontend and backend.
- Returns boolean and reason for conflict.

#### 2. Recurrence Engine

- Parses recurrence rules.
- Projects recurring entries over a given date range for rendering.
- Respects overrides and exceptions (if added later).

#### 3. Availability/Time-Off Merger

- Combines availability and time-off.
- Splits blocks in the UI if time-off cuts into availability.
- Returns clean list of available slots for rendering and validation.
