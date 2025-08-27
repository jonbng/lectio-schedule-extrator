# Lectio Schedule Extractor

TypeScript script that extracts schedule information from Lectio HTML files (Danish school management system).

## Features

- ✅ **Complete Schedule Extraction**: Classes, times, teachers, rooms, modules
- ✅ **Homework Detection**: Automatically extracts homework assignments
- ✅ **Status Recognition**: Normal, changed, and cancelled classes
- ✅ **Special Events**: Events like "Idrætsdag" (Sports Day)
- ✅ **Deadlines**: Academic deadlines and important dates
- ✅ **Student Groups**: All subjects and group memberships
- ✅ **Activity IDs**: Lectio activity identifiers
- ✅ **Class Topics**: Individual lesson topics
- ✅ **Summary Statistics**: Complete overview with counts

## Usage

### With Bun (recommended)

```bash
bun run schedule-extractor.ts
bun run run-extractor.ts
```

### With Node.js

```bash
npx tsc schedule-extractor.ts --target es2020 --module esnext
node schedule-extractor.js
```

### In Code

```typescript
import {
  extractScheduleFromFile,
  prettyPrintSchedule,
} from "./schedule-extractor";

const schedule = extractScheduleFromFile("./response-formatted.html");
console.log(JSON.stringify(schedule, null, 2));
console.log(prettyPrintSchedule(schedule));
```

### API Integration

The parser is also integrated into `api/index.ts` as a lightweight edge-compatible scraper:

```bash
# Deploy to Vercel or other edge platform
# The API accepts Lectio session cookies and returns parsed schedule data
GET /api?gymId=94&week=362025
Headers:
  Authorization: Bearer <base64(cookie)>
  # or
  x-lectio-cookie: <raw-cookie>
  x-lectio-session: <session-id>
```

**Response format (identical to dedicated scraper):**

```json
{
  "schedule": {
    "weekNumber": 36,
    "year": 2025,
    "weekRange": "Uge 36 (1/9-7/9) 2025",
    "student": {
      "name": "Eleven Jonathan Arthur Hojer Bangert",
      "class": "1g3"
    },
    "school": "Sorø Akademis Skole",
    "days": [
      {
        "date": "1/9",
        "dayName": "Mandag",
        "items": [
          {
            "activityId": "ABS73519234455",
            "subject": { "name": "1g3 ap spr", "code": "1g3 ap spr" },
            "teacher": { "name": "Jørgen Grønlund", "initials": "JG" },
            "room": { "name": "23" },
            "startTime": "08:10",
            "endTime": "09:50",
            "date": "1/9-2025",
            "module": 1,
            "status": "normal",
            "type": "class"
          }
        ],
        "isWeekend": false
      }
    ],
    "modules": [
      /* module data */
    ],
    "studentGroups": {
      /* subjects & groups */
    },
    "summary": {
      /* statistics */
    }
  },
  "nextHash": "abc123def",
  "updatedAt": 1640995200000
}
```

## Output Example

The script provides both JSON and pretty-formatted output:

### JSON Output

```json
{
  "weekNumber": 36,
  "year": 2025,
  "student": {
    "name": "Eleven Jonathan Arthur Hojer Bangert",
    "class": "1g3"
  },
  "school": "Sorø Akademis Skole",
  "summary": {
    "totalClasses": 12,
    "totalHomework": 2,
    "changedClasses": 2,
    "cancelledClasses": 1,
    "specialEvents": 4
  }
}
```

### Pretty Output

```
📅 LECTIO SCHEDULE EXTRACTION RESULTS
════════════════════════════════════

👤 Student: Jonathan Arthur Hojer Bangert
🏫 Class: 1g3
🎓 School: Sorø Akademis Skole

📊 SUMMARY
────────────────────────────────────
📚 Total Classes: 12
📝 Homework Assignments: 2
🔄 Changed Classes: 2
❌ Cancelled Classes: 1
🎉 Special Events: 4
```

## Data Structure

The extracted data includes:

- **Week Information**: Week number, year, date range
- **Student Info**: Name and class
- **Daily Schedules**: For each day with:
  - Subject details
  - Teacher names and initials
  - Room locations
  - Time slots and modules
  - Status (normal/changed/cancelled)
  - Homework assignments
  - Notes
- **Module Times**: Complete schedule of 5 daily modules
- **Student Groups**: All subjects and group memberships
- **Summary Statistics**: Comprehensive overview

## Dependencies

- `jsdom`: For HTML parsing
- `typescript`: For compilation
- `@types/node`: Node.js type definitions
- `@types/jsdom`: JSDOM type definitions

## Installation

```bash
pnpm install jsdom @types/jsdom @types/node typescript
```

## Files

- `schedule-extractor.ts`: Main extraction script
- `run-extractor.ts`: Usage example with file output
- `api/index.ts`: **Integrated API scraper** with lightweight parser for edge runtime
- `response-formatted.html`: Sample Lectio HTML file
- `package.json`: Project dependencies

## Extracted Data

✅ **Schedule Items**: Subject names, teacher details, rooms, times, modules, status
✅ **Special Information**: Homework, notes, topics, special events, deadlines  
✅ **Student Data**: All subjects, groups, memberships
✅ **Statistics**: Complete counts and summaries

The script extracts ALL important information from Lectio HTML files in a clean, structured format.
