# Lectio Schedule Types

This directory contains TypeScript type definitions for the Lectio schedule extraction system.

## Types Overview

### Core Data Structures

- **`LectioScheduleResponse`** - The main API response containing schedule data and metadata
- **`WeekSchedule`** - Complete week schedule with all related information
- **`DaySchedule`** - Schedule for a specific day
- **`ScheduleItem`** - Individual class, event, or deadline

### Supporting Types

- **`Teacher`** - Teacher information (name, initials, optional ID)
- **`Room`** - Room/location information
- **`Subject`** - Subject/course information (name, code, optional ID)
- **`Homework`** - Homework assignment description
- **`Module`** - Time module information (number, name, time range)
- **`Student`** - Student information (name, class)
- **`StudentGroups`** - Student group memberships
- **`ScheduleSummary`** - Weekly statistics summary

### Utility Types

- **`ScheduleStatus`** - Union type for schedule item statuses: `"normal" | "changed" | "cancelled"`
- **`ScheduleItemType`** - Union type for item types: `"class" | "event" | "deadline"`

## Type Guards

The module includes runtime type guards for validation:

- **`isScheduleItem(item)`** - Validates if an object is a valid ScheduleItem
- **`isWeekSchedule(schedule)`** - Validates if an object is a valid WeekSchedule
- **`isLectioScheduleResponse(response)`** - Validates if an object is a valid API response

## Usage Examples

### Basic Type Usage

```typescript
import { LectioScheduleResponse, ScheduleItem } from "./types/lectio";

// Fetching and typing API response
const response: LectioScheduleResponse = await fetch("/api/schedule").then(
  (r) => r.json()
);

// Working with schedule items
const todaysClasses = response.schedule.days[0].items.filter(
  (item: ScheduleItem) => item.type === "class"
);
```

### Using Type Guards

```typescript
import { isLectioScheduleResponse, isScheduleItem } from "./types/lectio";

// Validate API response
const data = await fetch("/api/schedule").then((r) => r.json());
if (isLectioScheduleResponse(data)) {
  // TypeScript now knows data is LectioScheduleResponse
  console.log(
    `Week ${data.schedule.weekNumber} for ${data.schedule.student.name}`
  );
}

// Validate individual items
const items = someUnknownArray.filter(isScheduleItem);
// items is now typed as ScheduleItem[]
```

### Component Props

```typescript
import { WeekSchedule, DaySchedule } from "./types/lectio";

interface ScheduleComponentProps {
  schedule: WeekSchedule;
  selectedDay?: DaySchedule;
  onDaySelect?: (day: DaySchedule) => void;
}
```

## JSON Structure

The types match this JSON structure from the Lectio API:

```json
{
  "schedule": {
    "weekNumber": 36,
    "year": 2025,
    "weekRange": "Uge 36 (2025)",
    "student": {
      "name": "Student Name",
      "class": "1g3"
    },
    "school": "School Name",
    "days": [
      {
        "date": "1/9",
        "dayName": "Mandag",
        "items": [
          {
            "id": "ABS73519234455",
            "subject": { "name": "Subject", "code": "SUB" },
            "teacher": { "name": "Teacher Name", "initials": "TN" },
            "room": { "name": "23" },
            "startTime": "08:10",
            "endTime": "09:50",
            "date": "1/9-2025",
            "module": 1,
            "status": "normal",
            "type": "class",
            "homework": [{ "description": "Assignment description" }]
          }
        ],
        "isWeekend": false
      }
    ],
    "modules": [
      {
        "number": 1,
        "name": "1. modul",
        "timeRange": "8:10 - 9:50"
      }
    ],
    "studentGroups": {
      "subjects": ["1g3 da", "1g3 en"],
      "involvedGroups": [],
      "ownGroups": []
    },
    "summary": {
      "totalClasses": 3,
      "totalHomework": 4,
      "changedClasses": 0,
      "cancelledClasses": 0,
      "specialEvents": 1,
      "deadlines": 0
    }
  },
  "nextHash": "42236d0b",
  "updatedAt": 1756881621581
}
```

## Import Paths

```typescript
// For files in the project root
import { LectioScheduleResponse } from "./types/lectio";

// For files in subdirectories
import { LectioScheduleResponse } from "../types/lectio";

// For the Next.js preview app
import { LectioScheduleResponse } from "../../../types/lectio";
```
