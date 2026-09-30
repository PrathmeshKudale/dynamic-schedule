# Adaptive Time OS

# 🚀 BUILD TIMEOS — AI-POWERED PERSONAL TIME OPERATING SYSTEM

You are a **senior full-stack engineer, AI architect, product designer, UX engineer, database architect, and hackathon-winning product builder**.

Your task is to **BUILD the complete working MVP**, not merely design mockups.

# TIMEOS

### Your AI Operating System for Time.

> **Traditional calendars store your time. TimeOS understands, plans, and continuously adapts it.**

Build a polished, responsive, production-style web application that demonstrates this concept convincingly in a **3–5 minute hackathon demo**.

The application should feel like a real startup product, not a student CRUD project.

---

# 0. MOST IMPORTANT REQUIREMENT

Prioritize:

**FUNCTIONALITY > VISUAL POLISH > EXTRA FEATURES**

Do not create fake buttons, fake AI responses, fake OAuth connections, or screens that do nothing.

Every visible primary action must either:

1. Work end-to-end, OR
2. Clearly operate in Demo Mode with realistic seeded data.

Never claim an external service is connected when it isn't.

If API credentials are unavailable, implement a proper service abstraction and Demo Mode.

---

# 1. THE CORE PRODUCT

TimeOS combines:

* Calendar events
* Timetable
* Tasks
* Deadlines
* Goals
* Learning profile
* Energy patterns
* Sleep schedule
* Personal commitments
* Protected time
* Attendance
* User preferences

and converts them into:

## A realistic adaptive schedule.

The central product loop is:

```text
INPUT LIFE DATA
      ↓
UNDERSTAND CONTEXT
      ↓
PRIORITIZE
      ↓
GENERATE SCHEDULE
      ↓
EXPLAIN WHY
      ↓
USER APPROVES
      ↓
SCHEDULE EXECUTES
      ↓
LIFE CHANGES
      ↓
AI RESCHEDULES
      ↓
LEARN FROM BEHAVIOR
```

The product must make this loop visually obvious.

---

# 2. THE "WOW MOMENT"

The entire application should be optimized around one core hackathon demonstration.

### Initial schedule

Alex has:

* College 9 AM–2 PM
* DBMS assignment
* DSA preparation
* React learning
* Gym
* Friends
* Sleep
* Weekend trip

Then the user enters:

> "I have a college festival Wednesday from 5 PM to 10 PM."

TimeOS identifies affected tasks.

Then user clicks:

## ✨ Optimize Schedule

TimeOS moves the appropriate tasks.

Then user enters:

> "I also have an extra lecture tomorrow at 4 PM."

Click:

## 🚨 Reschedule My Day

TimeOS rebuilds the remaining schedule.

Finally click:

## Why did you change this?

Show an AI explanation.

The judge should immediately understand:

> **TimeOS isn't a calendar. It is an adaptive decision engine for time.**

---

# 3. TECH STACK

Use:

### Frontend

* React
* Vite
* TypeScript
* Tailwind CSS
* shadcn/ui
* Lucide React

### Backend

* Node.js
* Express
* TypeScript

### Database

* PostgreSQL
* Prisma ORM

### Authentication

Implement:

* Email/password architecture
* Google OAuth architecture

Use secure password hashing.

### AI

Create a provider abstraction:

```text
AIProvider
 ├── OpenAIProvider
 ├── GeminiProvider (optional)
 └── DemoAIProvider
```

The application must work even without an AI API key by using `DemoAIProvider`.

Do NOT hard-code AI calls throughout the frontend.

---

# 4. AI PROVIDER ARCHITECTURE

Create:

```text
server/
  services/
    ai/
      AIProvider.ts
      OpenAIProvider.ts
      DemoAIProvider.ts
      aiScheduler.ts
      aiAssistant.ts
      aiParser.ts
      aiExplainer.ts
```

Environment variables:

```env
DATABASE_URL=
JWT_SECRET=
OPENAI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

Never expose server secrets to the browser.

Frontend may only access:

```env
VITE_API_URL=
```

Never use:

```text
VITE_OPENAI_API_KEY
VITE_GOOGLE_CLIENT_SECRET
```

---

# 5. DATABASE

Use Prisma.

Create a robust relational schema.

Required entities:

```text
User
StudentProfile
Task
CalendarEvent
TimetableEntry
Goal
GoalMilestone
LearningProfile
EnergyProfile
ProtectedTime
AttendanceRecord
Notification
AIRecommendation
ScheduleChange
ScheduleBlock
UserPreference
ConnectedAccount
```

Recommended relationships:

```text
User
 ├── StudentProfile
 ├── Tasks
 ├── CalendarEvents
 ├── TimetableEntries
 ├── Goals
 │    └── GoalMilestones
 ├── LearningProfile
 ├── EnergyProfile
 ├── ProtectedTimes
 ├── AttendanceRecords
 ├── Notifications
 ├── AIRecommendations
 ├── ScheduleChanges
 ├── ScheduleBlocks
 ├── UserPreference
 └── ConnectedAccounts
```

Use UUIDs.

Add:

* createdAt
* updatedAt

where appropriate.

Use indexes for frequently queried fields.

---

# 6. IMPORTANT DATA MODELS

## Task

Fields:

```text
id
userId
title
description
category
priority
estimatedMinutes
deadline
status
isFlexible
isCompleted
energyRequirement
createdAt
updatedAt
```

Categories:

```text
ACADEMIC
LEARNING
HEALTH
SOCIAL
PERSONAL
PROJECT
TRAVEL
OTHER
```

Priority:

```text
LOW
MEDIUM
HIGH
URGENT
```

---

# 7. CALENDAR EVENT

Fields:

```text
id
userId
title
description
startTime
endTime
category
source
isFixed
isProtected
recurrenceRule
color
```

Sources:

```text
TIMETABLE
GOOGLE
MANUAL
AI
SYSTEM
```

---

# 8. GOAL SYSTEM

Example:

```text
Goal:
Learn React in 30 days
```

Generate:

```text
Goal
 ↓
Milestones
 ↓
Tasks
 ↓
Schedule Blocks
```

Track:

```text
progress
targetDate
estimatedHours
completedHours
```

---

# 9. LEARNING PROFILE

Store:

```text
focusCapacity
preferredSessionMinutes
breakMinutes
preferredStudyStart
preferredStudyEnd
learningStyle
skillLevels
```

Example:

```text
Focus capacity: 42 min
Preferred session: 45 min
Break: 10 min
Best time: 8 AM–11 AM
```

These are preferences, NOT rigid rules.

---

# 10. ENERGY PROFILE

Store energy levels by time window.

Example:

```text
06:00–10:00 → HIGH
10:00–14:00 → HIGH
14:00–17:00 → MEDIUM
17:00–21:00 → HIGH
21:00–23:00 → LOW
```

Use this during scheduling.

---

# 11. PROTECTED TIME

Allow rules such as:

```text
Sleep
Dinner
Gym
Family
Friends
Travel
Personal time
```

Example:

```text
Sunday 18:00–21:00
Protected: Family
```

AI must respect these rules unless the user explicitly chooses to override them.

---

# 12. SCHEDULING ENGINE

This is the most important technical component.

Create:

```text
server/services/scheduler/
    scheduler.ts
    constraints.ts
    prioritizer.ts
    availability.ts
    conflictResolver.ts
    scheduleExplainer.ts
```

Input:

```typescript
{
  tasks,
  deadlines,
  calendarEvents,
  timetable,
  goals,
  energyProfile,
  learningProfile,
  protectedTime,
  sleepSchedule,
  preferences,
  currentTime
}
```

Algorithm:

### STEP 1

Identify fixed events.

Examples:

* lectures
* exams
* appointments
* travel

These cannot be overwritten.

### STEP 2

Identify deadlines.

Calculate urgency based on:

```text
deadline proximity
priority
estimated effort
```

### STEP 3

Calculate available time.

Exclude:

* fixed events
* sleep
* protected time
* existing commitments

### STEP 4

Estimate suitable cognitive periods.

High-energy periods:

* coding
* mathematics
* difficult assignments
* problem solving

Lower-energy periods:

* revision
* reading
* videos
* organization

### STEP 5

Schedule urgent/high-priority work.

### STEP 6

Respect preferred session duration.

Example:

```text
45 min work
10 min break
45 min work
```

### STEP 7

Preserve personal time.

Do NOT automatically sacrifice all social/recreation time.

### STEP 8

Detect overload.

Calculate:

```text
requiredWorkMinutes
availableMinutes
capacityGap
```

### STEP 9

Return:

```typescript
{
  schedule,
  conflicts,
  movedTasks,
  warnings,
  recommendations,
  explanations,
  workloadScore
}
```

---

# 13. AI SHOULD NOT CONTROL EVERYTHING

The AI recommends.

The user decides.

Every major AI action must have:

```text
Apply Changes
Review
Cancel
```

Do not silently modify important commitments.

---

# 14. AI EXPLANATION ENGINE

For every major scheduling decision generate:

```text
Why this time?

Why was this task moved?

What constraint caused this?

What was protected?
```

Example:

> DBMS was moved to 8:00 AM because:
>
> • Its deadline is tomorrow.
> • You have no fixed event during this period.
> • Your energy profile indicates high focus in the morning.
> • Your preferred session length is 45 minutes.
> • Your evening social time was protected.

Use structured explanation data rather than generating arbitrary UI text.

---

# 15. NATURAL LANGUAGE INPUT

Create a universal input:

## "Tell TimeOS what you need to do..."

Example:

> Tomorrow I have college from 9 to 2, need 2 hours for DBMS, want to go to the gym and meet friends at 7.

AI should convert this into structured data.

Example output:

```json
{
  "events": [
    {
      "title": "College",
      "start": "...",
      "end": "..."
    }
  ],
  "tasks": [
    {
      "title": "DBMS",
      "estimatedMinutes": 120
    }
  ],
  "preferences": [
    {
      "type": "social",
      "time": "19:00"
    }
  ]
}
```

Always validate AI output before inserting into the database.

---

# 16. AI DAILY BRIEF

Dashboard should contain:

## ✨ TimeOS Intelligence

Example:

> You have 7h 20m of usable time today.
>
> Your highest-priority item is DBMS, due tomorrow.
>
> I found a 90-minute morning window for it.
>
> Your evening social time remains protected.

Buttons:

```text
✨ Optimize Day
Ask TimeOS
```

---

# 17. DASHBOARD

Create an exceptional dashboard.

Header:

```text
TimeOS
Today | Week | Month
                       🔔  AI  Profile
```

Hero:

```text
Good morning, Alex 👋

Here's your optimized day.
```

Stats:

```text
Available Time
7h 20m

Focus Time
3h 45m

Tasks
3/7 completed

Schedule Health
Good
```

Then:

### Today's Focus

Show 3 priority items.

---

# 18. CURRENT / NEXT ACTION

Create a highly visible component:

## NOW

```text
DBMS Assignment
10:30–11:15
Academic

45 minutes
```

Button:

```text
Start Focus
```

Then:

## NEXT

```text
DSA Lecture
11:30–12:30
```

This makes the product feel like an operating system rather than a calendar.

---

# 19. CALENDAR

Implement a real interactive calendar.

Views:

```text
Day
3 Days
Week
Month
```

Features:

* create event
* edit
* delete
* drag/drop
* resize
* recurring events
* AI events
* category filtering
* conflict visualization

Use distinct but restrained category colors.

Do not create a rainbow interface.

---

# 20. AI SCHEDULE GENERATOR

Create:

# ✨ Generate My Schedule

Input:

```text
I have a DSA exam Monday.
I need to complete 5 chapters.
College is 9–2.
I want to gym 4 times.
Saturday is reserved for friends.
```

Output:

```text
Generated Schedule

Saturday
10:00–11:00 DSA Chapter 1
11:10–12:10 DSA Chapter 2
...

Sunday
...

Monday
Exam
```

Show:

```text
Why?
Constraints considered:
✓ College timetable
✓ Exam deadline
✓ Gym preference
✓ Protected social time
✓ Sleep
```

---

# 21. EMERGENCY RESCHEDULER

Button:

# 🚨 My Day Changed

Options:

```text
Unexpected lecture
Assignment added
Travel delay
Feeling tired
Event added
Missed task
Personal emergency
Custom
```

After selection:

Show:

```text
What changed?
```

Then recalculate remaining schedule.

---

# 22. WHAT-IF PLANNER

Create:

# What If?

Example:

> What if I attend the college festival Wednesday 5–10 PM?

Show BEFORE and AFTER.

Use visual diff:

```text
BEFORE
DBMS 5:00
React 6:00

AFTER
Festival 5:00–10:00
DBMS → Thursday 8:00
React → Saturday 10:00
```

Buttons:

```text
Apply Changes
Cancel
```

---

# 23. WORKLOAD INTELLIGENCE

Create:

## Workload Intelligence

Display:

```text
Required work
14h

Available time
10h

Gap
4h
```

Then:

```text
Options

Redistribute tasks
Reduce optional activities
Move flexible tasks
Create focused sessions
```

Do not automatically remove social/rest activities.

---

# 24. ATTENDANCE

Dashboard:

```text
DSA       82%
DBMS      68% ⚠️
Physics   91%
Math      76%
```

Allow minimum attendance setting.

Calculate projected attendance.

Example:

> At your current attendance, missing 2 more DBMS classes would bring projected attendance below your 75% target.

Use actual calculations.

---

# 25. LIFE BALANCE

Create:

## Life Overview

Categories:

```text
Academics
Skills
Health
Social
Hobbies
Travel
Rest
```

Show weekly time distribution.

Important:

This is an awareness tool.

Do NOT assign moral judgments such as "bad" or "lazy".

---

# 26. GOALS

Create:

## Goals

Example:

```text
Learn React
████████░░ 80%

Improve DSA
██████░░░░ 60%

Build Hackathon Project
████░░░░░░ 40%
```

Button:

```text
Create Goal
```

After creating a goal:

```text
Goal
 ↓
AI Roadmap
 ↓
Milestones
 ↓
Tasks
 ↓
Calendar
```

---

# 27. AI ASSISTANT

Create a conversational interface:

## Ask TimeOS

Examples:

```text
What should I do right now?

Can I fit gym today?

When should I study DSA?

Do I have enough time to finish my project?

Plan my weekend.

Move my tasks because I'm travelling tomorrow.
```

The assistant must use the user's actual stored schedule.

It should not answer from generic knowledge when schedule data is available.

---

# 28. ONBOARDING

Create a beautiful 4-step onboarding.

### Step 1

Who are you?

```text
School Student
College Student
Professional
```

### Step 2

Your routine

```text
Wake time
Sleep time
College/work hours
```

### Step 3

Your preferences

```text
Best study time
Focus duration
Break duration
```

### Step 4

Your goals

```text
Academic
Career
Health
Personal
```

Then generate the first schedule.

---

# 29. TIMETABLE IMPORT

Support:

```text
Image
PDF
CSV
Manual entry
```

For image/PDF:

Use an AI/OCR abstraction.

Extract:

```text
subject
day
startTime
endTime
professor
room
```

Show a verification screen:

# Review Imported Timetable

Never blindly insert OCR results.

User clicks:

```text
Confirm Timetable
```

Then recurring calendar events are created.

---

# 30. GOOGLE CALENDAR

Create real integration architecture.

Settings:

## Connected Accounts

```text
Google Calendar

🟢 Connected

Last synced:
2 minutes ago

[Sync Now]
[Disconnect]
```

Implement OAuth architecture.

Required scopes should be minimal.

Never expose tokens.

If credentials aren't available:

Display:

```text
Demo Mode

Google Calendar integration is configured for production
but unavailable in this demo environment.
```

Provide mock calendar data through the same service interface.

Never display "Connected" unless it actually is.

---

# 31. API ARCHITECTURE

Create REST APIs.

Example:

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/me

GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id

GET    /api/events
POST   /api/events
PATCH  /api/events/:id
DELETE /api/events/:id

GET    /api/goals
POST   /api/goals

GET    /api/timetable
POST   /api/timetable

GET    /api/profile
PATCH  /api/profile

GET    /api/attendance

POST   /api/ai/parse
POST   /api/ai/generate-schedule
POST   /api/ai/optimize
POST   /api/ai/reschedule
POST   /api/ai/what-if
POST   /api/ai/chat

GET    /api/recommendations
POST   /api/recommendations/:id/apply

GET    /api/notifications
```

Use consistent response format:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

For errors:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid task duration"
  }
}
```

---

# 32. SECURITY

Implement:

* password hashing
* JWT/session architecture
* protected routes
* authorization checks
* request validation
* rate limiting on AI endpoints
* CORS configuration
* environment variables
* safe Prisma queries
* sanitized user input

Never expose:

```text
API keys
OAuth secrets
JWT secrets
database credentials
```

in frontend code.

---

# 33. ERROR HANDLING

Every async operation needs:

```text
Loading
Success
Error
Empty
Retry
```

Examples:

AI unavailable:

> TimeOS AI is temporarily unavailable. Your existing schedule is safe.

Database unavailable:

> We couldn't save your change. Retry.

Calendar sync failure:

> Google Calendar sync failed. Your TimeOS schedule was not changed.

---

# 34. DEMO MODE

This is critical for hackathon reliability.

Create:

```text
DEMO_MODE=true
```

When enabled:

* seed Alex
* seed timetable
* seed calendar
* seed tasks
* seed goals
* seed attendance
* seed energy profile
* seed protected time

AI Demo Provider should produce deterministic but realistic scheduling results.

Demo mode must use the same interfaces as production services.

Example:

```text
SchedulerService
AIProvider
CalendarProvider
```

so production providers can later replace demo providers.

---

# 35. SEED DATA

Create Alex:

```text
Name:
Alex

Course:
B.Tech Computer Science

Year:
2nd Year
```

Subjects:

```text
DSA
DBMS
Web Development
Mathematics
Computer Networks
```

Goals:

```text
Learn React
Improve DSA
Build Hackathon Project
Exercise
```

Events:

```text
College
DSA lecture
DBMS lecture
Gym
Friends
College festival
Weekend trip
```

Tasks:

```text
DBMS Assignment
DSA Test Preparation
React Practice
Hackathon Development
```

Deadlines:

```text
DBMS Assignment — Friday
DSA Test — Monday
Hackathon — Thursday
```

Make dates relative to the current date so the demo never looks outdated.

---

# 36. VISUAL DESIGN

Design language:

### Premium AI productivity SaaS.

References:

* Linear
* Notion
* Apple
* Google Calendar
* modern AI products

Use:

* neutral background
* one primary accent
* subtle borders
* restrained shadows
* excellent typography
* generous spacing
* rounded cards
* subtle motion

Avoid:

* excessive gradients
* excessive glassmorphism
* childish illustrations
* neon overload
* huge text
* clutter
* unnecessary animations

---

# 37. RESPONSIVE DESIGN

Desktop:

Sidebar navigation.

Mobile:

Bottom navigation:

```text
Home
Calendar
Tasks
AI
Profile
```

Tablet:

Responsive sidebar/navigation.

Calendar must remain usable on mobile.

---

# 38. NAVIGATION

Desktop sidebar:

```text
⌂ Overview
◫ Calendar
✓ Tasks
🎯 Goals
📚 Learning
📊 Insights
🤖 Ask TimeOS
⚙ Settings
```

Highlight current section.

---

# 39. MICROINTERACTIONS

Add subtle animations:

* page transitions
* schedule changes
* AI thinking state
* task completion
* drag/drop
* notifications

Example AI state:

```text
✨ TimeOS is analyzing your schedule...
✓ Checking conflicts
✓ Protecting commitments
✓ Finding available time
✓ Optimizing tasks
```

Then show results.

Do not fake long delays.

---

# 40. SCHEDULE CHANGE VISUALIZATION

Whenever AI changes a schedule, show a diff.

Example:

```text
Schedule Updated

MOVED
React Learning
Today 4 PM
→ Saturday 10 AM

MOVED
DBMS Assignment
Tomorrow 7 PM
→ Tomorrow 8 AM

PROTECTED
Gym
Friends
Sleep
```

This is a major trust feature.

---

# 41. TRUST LAYER

AI decisions should never feel mysterious.

Include:

```text
Why?
Constraints
Changes
Protected time
Confidence
```

Example:

```text
Why?

Deadline: High
Energy fit: High
Availability: High
Preference match: Medium
```

Do not fabricate scientific claims about productivity.

---

# 42. ACCESSIBILITY

Implement:

* keyboard navigation
* accessible buttons
* proper labels
* sufficient contrast
* focus states
* semantic HTML
* screen-reader-friendly dialogs

---

# 43. PERFORMANCE

Optimize:

* lazy loading
* API caching where useful
* database indexes
* debounced search
* avoid unnecessary rerenders
* efficient calendar rendering

Do not over-engineer.

---

# 44. PROJECT STRUCTURE

Use a clean structure such as:

```text
timeos/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── types/
│   │   └── utils/
│   │
│   └── ...
│
├── server/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   ├── scheduler/
│   │   │   ├── calendar/
│   │   │   └── notifications/
│   │   ├── middleware/
│   │   ├── validators/
│   │   └── utils/
│   │
│   └── ...
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── .env.example
├── README.md
└── docker-compose.yml
```

---

# 45. DOCKER

Provide:

```text
docker-compose.yml
```

with PostgreSQL.

README must explain:

```text
1. Install dependencies
2. Configure .env
3. Start PostgreSQL
4. Run Prisma migrations
5. Seed database
6. Start server
7. Start client
```

---

# 46. ENVIRONMENT CONFIGURATION

Create `.env.example`.

Example:

```env
NODE_ENV=development

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/timeos"

JWT_SECRET="replace-me"

OPENAI_API_KEY=""

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI=""

DEMO_MODE=true

CLIENT_URL="http://localhost:5173"
SERVER_URL="http://localhost:3000"
```

Never commit real secrets.

---

# 47. TESTING

Add basic tests for:

### Scheduler

* fixed events cannot be overwritten
* protected time remains protected
* urgent tasks receive priority
* deadlines affect priority
* schedule does not overlap
* sleep is protected
* rescheduling preserves unaffected events

### API

Test:

* authentication
* task creation
* event creation
* schedule generation
* schedule optimization

---

# 48. CRITICAL SCHEDULING RULES

The scheduler must NEVER:

❌ schedule over a fixed lecture

❌ schedule over sleep

❌ schedule over protected time

❌ create overlapping events

❌ ignore deadlines

❌ remove personal activities without permission

❌ silently modify the user's schedule

Instead:

✓ identify conflicts

✓ propose changes

✓ explain changes

✓ let user apply them

---

# 49. AI OUTPUT VALIDATION

Never directly trust LLM output.

Use Zod schemas.

Example:

```text
AI response
 ↓
JSON parser
 ↓
Zod validation
 ↓
Business-rule validation
 ↓
Scheduler
 ↓
Database
```

If invalid:

```text
retry / fallback / DemoAIProvider
```

---

# 50. AI PROMPT ARCHITECTURE

Separate prompts from code.

Create:

```text
server/prompts/
    scheduleGeneration.ts
    rescheduling.ts
    whatIf.ts
    assistant.ts
    parsing.ts
    explanations.ts
```

AI should receive only the data necessary for the task.

Do not send secrets.

---

# 51. AI SCHEDULER RESPONSE FORMAT

Use structured JSON:

```json
{
  "blocks": [
    {
      "taskId": "task-id",
      "start": "2026-10-01T08:00:00",
      "end": "2026-10-01T08:45:00",
      "reason": [
        "deadline",
        "high-energy-period",
        "availability"
      ]
    }
  ],
  "movedTasks": [],
  "warnings": [],
  "protectedItems": [],
  "summary": "..."
}
```

The backend validates this before using it.

---

# 52. NOTIFICATION ENGINE

Create notifications for:

```text
Upcoming event
Deadline approaching
Schedule conflict
AI recommendation
Missed task
Schedule changed
Attendance risk
```

Do not overwhelm the user.

---

# 53. SETTINGS

Sections:

```text
Profile
Schedule Preferences
Energy Profile
Protected Time
Notifications
Connected Accounts
AI Preferences
Privacy
```

Include:

```text
Demo Mode
```

indicator when active.

---

# 54. EMPTY STATES

Every page needs a useful empty state.

Example:

### No Goals Yet

> What do you want to accomplish?

[Create Goal]

---

# 55. FIRST-LAUNCH EXPERIENCE

When opening the app for the first time:

```text
Welcome to TimeOS 👋

Let's build your first intelligent schedule.
```

Then onboarding.

After onboarding:

```text
✨ Your first optimized schedule is ready.
```

---

# 56. HACKATHON POLISH

Add small details judges notice:

* realistic timestamps
* believable seeded data
* no lorem ipsum
* no console errors
* no broken links
* no dead buttons
* loading skeletons
* keyboard-friendly dialogs
* responsive layout
* realistic AI responses
* smooth transitions
* useful error messages

---

# 57. JUDGE EXPERIENCE

A judge should understand the product within 10 seconds.

Dashboard must communicate:

```text
WHAT'S HAPPENING
WHAT MATTERS
WHAT SHOULD I DO NEXT
WHY
```

Do not force the judge to explore 10 pages.

The main dashboard should contain the core story.

---

# 58. DEMO CONTROLS

Add a small developer/demo control accessible from Settings:

## Demo Scenario

```text
Normal Day
Deadline Pressure
College Festival
Unexpected Lecture
Overloaded Week
```

Selecting a scenario updates the demo data.

This allows the hackathon presentation to reliably reproduce the WOW moment.

Do not expose this prominently to normal users.

---

# 59. DEMO SCENARIO: DEADLINE

Button:

```text
Simulate DBMS Deadline
```

System adds:

```text
DBMS Assignment
Due tomorrow
2 hours estimated
High priority
```

AI finds suitable blocks.

---

# 60. DEMO SCENARIO: EVENT

Button:

```text
Add College Festival
```

Adds:

```text
Wednesday
5 PM–10 PM
Fixed
Social/Event
```

Existing schedule is analyzed.

---

# 61. DEMO SCENARIO: EMERGENCY

Button:

```text
Add Unexpected Lecture
```

Adds:

```text
Tomorrow
4 PM–5 PM
Fixed
Academic
```

Then:

```text
🚨 Reschedule My Day
```

AI rebuilds remaining blocks.

---

# 62. DEMO SCRIPT

The UI should support this exact story:

### 1.

Open dashboard.

> "This is Alex's normal day."

### 2.

Add DBMS assignment.

> "Alex has an assignment due tomorrow."

### 3.

Click Optimize.

> "TimeOS doesn't simply add another task. It finds where it realistically fits."

### 4.

Add festival.

> "Now something changes."

### 5.

Click Optimize.

> "Instead of breaking the whole plan, TimeOS moves only the affected work."

### 6.

Add unexpected lecture.

### 7.

Click Reschedule.

> "This is where TimeOS becomes adaptive."

### 8.

Open Why.

> "And every AI decision is explainable."

### 9.

End:

# TimeOS

> **Your AI Operating System for Time.**

---

# 63. PRODUCT POSITIONING

Do not position TimeOS as:

"another calendar."

Position it as:

```text
Calendar
+
Tasks
+
Goals
+
Learning
+
Personal commitments
+
AI reasoning
+
Adaptive scheduling
```

Core statement:

> **TimeOS is an intelligent layer between everything you need to do and the limited time you actually have.**

---

# 64. DIFFERENTIATION

Traditional Calendar:

> Stores events.

Todo App:

> Stores tasks.

Study Planner:

> Creates study plans.

TimeOS:

> **Understands relationships between commitments and continuously adapts the plan when life changes.**

---

# 65. IMPORTANT PRODUCT PRINCIPLE

Optimize for:

## Sustainable productivity.

Not:

## Maximum productivity.

The system should protect:

* sleep
* health
* relationships
* personal time
* realistic workload

A full calendar is not necessarily a successful schedule.

---

# 66. FINAL IMPLEMENTATION RULE

Do not build every feature equally.

Prioritize this exact order:

### P0 — MUST WORK

1. Authentication/demo login
2. Dashboard
3. Calendar
4. Tasks
5. Natural language task input
6. AI schedule generation
7. AI optimization
8. Emergency rescheduling
9. Schedule diff
10. AI explanation
11. PostgreSQL persistence
12. Demo seed data

### P1 — SHOULD WORK

13. Goals
14. Learning profile
15. Energy profile
16. Protected time
17. Workload intelligence
18. Attendance
19. AI assistant

### P2 — ARCHITECTURE READY

20. Google Calendar OAuth
21. Timetable OCR
22. Notifications
23. Advanced learning behavior
24. Professional mode
25. School mode

If time is limited, NEVER sacrifice P0 for P2.

---

# 67. FINAL QUALITY CHECK

Before declaring the project complete, verify:

### UI

* [ ] Responsive
* [ ] Premium
* [ ] No broken layouts
* [ ] No dead buttons
* [ ] No placeholder text
* [ ] Loading states
* [ ] Empty states
* [ ] Error states

### Backend

* [ ] API routes functional
* [ ] Authentication protected
* [ ] Validation
* [ ] Error handling
* [ ] Database persistence

### AI

* [ ] Provider abstraction
* [ ] Structured output
* [ ] Validation
* [ ] Scheduler rules
* [ ] Explainable decisions
* [ ] Demo fallback

### Scheduler

* [ ] No overlaps
* [ ] Fixed events protected
* [ ] Sleep protected
* [ ] Protected time respected
* [ ] Deadlines prioritized
* [ ] Personal time preserved
* [ ] Changes shown as diff

### Security

* [ ] No API keys in frontend
* [ ] No OAuth secrets exposed
* [ ] Environment variables
* [ ] Auth middleware
* [ ] Authorization checks

### Demo

* [ ] Seed data works
* [ ] Demo scenario works
* [ ] 3-minute demo is reproducible
* [ ] AI WOW moment works without internet/API failure

---

# 68. BUILD IN THIS ORDER

Do NOT attempt to generate everything randomly.

Build sequentially:

### PHASE 1

Project setup + database + Prisma + authentication.

### PHASE 2

Dashboard + navigation + seeded Alex.

### PHASE 3

Tasks + calendar + CRUD.

### PHASE 4

Scheduling engine.

### PHASE 5

AI provider + structured scheduling.

### PHASE 6

Optimize + reschedule + What-If.

### PHASE 7

AI explanations + diff visualization.

### PHASE 8

Goals + learning + energy + workload intelligence.

### PHASE 9

Settings + Google Calendar architecture.

### PHASE 10

Responsive polish + animations + error handling + demo mode.

### PHASE 11

Test the complete judge demo from start to finish.

---

# 69. DO NOT STOP AT UI

The final result must be:

```text
Browser
   ↓
React UI
   ↓
REST API
   ↓
Business Services
   ↓
AI / Scheduler
   ↓
Prisma
   ↓
PostgreSQL
```

Do not create a frontend-only prototype disguised as a full-stack application.

---

# 70. FINAL SUCCESS CRITERIA

The project succeeds if a judge can:

1. Open TimeOS.
2. Understand the concept immediately.
3. See a realistic schedule.
4. Add a new deadline using natural language.
5. Generate an intelligent schedule.
6. Add an unexpected event.
7. Watch TimeOS adapt.
8. See exactly what changed.
9. Understand why it changed.
10. Accept or reject the recommendation.

The emotional reaction we want is:

> **"This isn't just another AI wrapper. It actually understands constraints and makes the schedule adapt."**

---

# FINAL TAGLINE

# TimeOS

## Your AI Operating System for Time.

### **Plan less. Adapt faster. Live more.**

Build it as a **real, polished, functional full-stack MVP**, with the architecture ready to scale into a production product.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://dynamic-schedule.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1d68d13d-6a63-4af1-9018-f1e3367fb905).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
