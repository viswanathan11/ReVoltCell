# ReVoltCell — Backend & Frontend Implementation Specification

## 1. Project Goal

ReVoltCell is a prototype platform for screening second-life suitability of Li-ion cells.

The system has three major parts:

1. ESP32 hardware controller
2. Backend API + database
3. React.js frontend dashboard

The backend must be fully usable before the hardware is connected. Therefore, the backend must support both:

- real ESP32 test submissions later
- mock/manual test submissions now for frontend development

The platform is a **prototype screening system**, not a certified battery safety, capacity, SOH, or BMS system.

---

# 2. Recommended Technology Stack

## Backend

- Node.js
- Express.js
- TypeScript preferred
- PostgreSQL
- Prisma ORM
- Zod for request validation
- CORS
- dotenv
- Helmet
- Morgan or Pino logging

## Frontend

- React.js
- Vite
- TypeScript preferred
- React Router
- Axios or fetch
- Recharts for charts
- QR code generation library

## Development

Backend:
- `http://localhost:3000`

Frontend:
- `http://localhost:5173`

Later, ESP32 will access the backend through the laptop's LAN IP, NOT `localhost`.

Example:

```text
ESP32
  |
  | Wi-Fi
  v
http://192.168.1.10:3000/api/...
  |
  v
Node/Express Backend
  |
  v
PostgreSQL
```

The backend must listen on:

```text
0.0.0.0
```

so that the ESP32 can access it over the local network.

---

# 3. Environment Variables

Create `.env`:

```env
PORT=3000
HOST=0.0.0.0

DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/revoltcell"

CORS_ORIGIN="http://localhost:5173"

API_BASE_URL="http://localhost:3000"

PASSPORT_BASE_URL="http://localhost:5173/passport"
```

Never hardcode database credentials.

---

# 4. Core Data Model

The system should store the following entities.

## 4.1 Cell

Represents a physical battery/cell.

Fields:

```text
id
cellId
manufacturer
model
chemistry
nominalVoltage
ratedCapacityMah
source
manufactureDate
createdAt
updatedAt
status
```

Example:

```json
{
  "cellId": "EV-CELL-001",
  "manufacturer": "Unknown",
  "model": "18650",
  "chemistry": "Li-ion",
  "nominalVoltage": 3.7,
  "ratedCapacityMah": 2500,
  "source": "Recovered EV battery",
  "status": "REGISTERED"
}
```

Possible status values:

```text
REGISTERED
TESTING
TESTED
FAILED
ARCHIVED
```

---

# 5. Test Data Model

A test represents one controlled discharge/evaluation session.

Fields:

```text
id
testId
cellId
startedAt
completedAt

initialVoltage
finalVoltage
minimumVoltage

averageCurrent
maximumCurrent

initialTemperature
maximumTemperature
temperatureRise

testDurationSeconds

loadResistanceOhms
loadPowerRatingWatts

status
stopReason

createdAt
```

Possible test status:

```text
PENDING
RUNNING
COMPLETED
STOPPED
FAILED
```

Possible stop reasons:

```text
COMPLETED
USER_STOP
LOW_VOLTAGE
OVER_TEMPERATURE
TIMEOUT
ERROR
```

---

# 6. Test Measurement Model

Do NOT store only the final test result.

Store periodic measurements so the frontend can draw graphs and the backend can analyze behavior.

Fields:

```text
id
testId
timestamp
elapsedSeconds
voltage
current
temperature
loadEnabled
```

Example:

```json
{
  "timestamp": "2026-10-05T10:20:30Z",
  "elapsedSeconds": 30,
  "voltage": 3.91,
  "current": 0.82,
  "temperature": 31.4,
  "loadEnabled": true
}
```

The ESP32 can eventually send batches of measurements.

---

# 7. Analysis Model

Analysis is generated from test data.

Fields:

```text
id
testId
cellId

score
electricalScore
thermalScore
stabilityScore

classification

voltageSag
temperatureRise

recommendation
createdAt
```

Classification values:

```text
GOOD
FURTHER_EVALUATION
LOW_PERFORMANCE
UNSUITABLE
```

IMPORTANT:

The score is a **prototype/demo score**, not a certified battery SOH percentage.

---

# 8. Application Recommendation Model

The system should map the test result to possible second-life applications.

Fields:

```text
id
cellId
testId
application
suitability
reason
createdAt
```

Example applications:

```text
LOW_POWER_STORAGE
SOLAR_STORAGE
BACKUP_POWER
LED_LIGHTING
LOW_POWER_ELECTRONICS
OTHER
```

Suitability:

```text
HIGH
MEDIUM
LOW
NOT_RECOMMENDED
```

Example:

```json
{
  "application": "LOW_POWER_STORAGE",
  "suitability": "HIGH",
  "reason": "Stable voltage behavior and acceptable thermal response."
}
```

Do not claim that the system has certified the cell for a real application.

Use wording such as:

```text
Potential second-life application
```

rather than:

```text
Approved for application
```

---

# 9. Cell Matching Model

The frontend needs a Cell Matching feature.

The backend should provide similar tested cells.

Matching can initially be based on:

- prototype score
- chemistry
- nominal voltage
- voltage sag
- temperature rise
- classification

Example response:

```json
{
  "cellId": "EV-CELL-001",
  "matches": [
    {
      "cellId": "EV-CELL-004",
      "scoreDifference": 3,
      "classification": "GOOD"
    }
  ]
}
```

This is a similarity feature, not a guarantee that cells are electrically safe to connect in a pack.

---

# 10. Lifecycle Model

Track the cell lifecycle:

```text
EV_BATTERY
    ↓
RETIRED
    ↓
RECOVERED
    ↓
TESTED
    ↓
SECOND_LIFE_EVALUATION
    ↓
SECOND_LIFE_CANDIDATE
    ↓
RECYCLE
```

Lifecycle event fields:

```text
id
cellId
event
timestamp
description
```

Events:

```text
EV_BATTERY
RETIRED
RECOVERED
TESTED
SECOND_LIFE_EVALUATION
SECOND_LIFE_CANDIDATE
RECYCLE
```

---

# 11. Digital Battery Passport

Every cell should have a digital passport.

Endpoint:

```text
GET /api/cells/:cellId/passport
```

Passport should contain:

```text
Battery ID
Basic cell information
Test history
Latest measurements
Latest analysis
Prototype score
Classification
Potential applications
Lifecycle history
Created date
Updated date
```

QR code should point to:

```text
http://localhost:5173/passport/EV-CELL-001
```

In deployment this becomes the real frontend/public URL.

The QR should NOT contain the entire battery data.

It should contain the passport URL.

---

# 12. API Structure

All API routes must be prefixed with:

```text
/api
```

Use consistent JSON responses.

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "CELL_NOT_FOUND",
    "message": "Cell EV-CELL-001 was not found."
  }
}
```

---

# 13. Cell APIs

## POST /api/cells

Register a cell.

Request:

```json
{
  "cellId": "EV-CELL-001",
  "manufacturer": "Unknown",
  "model": "18650",
  "chemistry": "Li-ion",
  "nominalVoltage": 3.7,
  "ratedCapacityMah": 2500,
  "source": "Recovered EV battery"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "cellId": "EV-CELL-001",
    "status": "REGISTERED"
  }
}
```

Validation:

- cellId required
- cellId unique
- nominalVoltage > 0
- ratedCapacityMah >= 0

---

## GET /api/cells

Return all cells.

Support:

```text
?page=1
&limit=20
&status=TESTED
&search=EV-CELL
```

Response:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## GET /api/cells/:cellId

Return complete cell summary.

Include:

- cell information
- current status
- latest test
- latest analysis
- latest score

---

## PATCH /api/cells/:cellId

Update editable metadata.

Do not allow changing historical test measurements through this endpoint.

---

## DELETE /api/cells/:cellId

Prefer soft deletion/archive.

Do not physically delete a cell that has test history.

Set:

```text
status = ARCHIVED
```

---

# 14. Test APIs

## POST /api/tests

Create a test.

Request:

```json
{
  "cellId": "EV-CELL-001",
  "loadResistanceOhms": 5,
  "loadPowerRatingWatts": 10
}
```

Response:

```json
{
  "success": true,
  "data": {
    "testId": "TEST-0001",
    "status": "PENDING"
  }
}
```

---

## POST /api/tests/:testId/start

Mark test as running.

Used by:

- frontend mock mode
- future hardware workflow if needed

---

## POST /api/tests/:testId/measurements

Upload one measurement.

Request:

```json
{
  "elapsedSeconds": 30,
  "voltage": 3.91,
  "current": 0.82,
  "temperature": 31.4,
  "loadEnabled": true
}
```

---

## POST /api/tests/:testId/measurements/batch

Preferred endpoint for ESP32.

Request:

```json
{
  "measurements": [
    {
      "elapsedSeconds": 1,
      "voltage": 4.08,
      "current": 0.81,
      "temperature": 30.2,
      "loadEnabled": true
    },
    {
      "elapsedSeconds": 2,
      "voltage": 4.07,
      "current": 0.82,
      "temperature": 30.3,
      "loadEnabled": true
    }
  ]
}
```

This allows ESP32 to buffer measurements and upload them in batches.

---

## POST /api/tests/:testId/complete

Complete the test.

Request:

```json
{
  "finalVoltage": 3.72,
  "minimumVoltage": 3.72,
  "averageCurrent": 0.81,
  "maximumCurrent": 0.84,
  "initialTemperature": 30.1,
  "maximumTemperature": 34.8,
  "testDurationSeconds": 300,
  "stopReason": "COMPLETED"
}
```

Backend should:

1. Validate test
2. Calculate derived values
3. Mark test completed
4. Generate analysis
5. Generate application recommendations
6. Update cell status to TESTED
7. Add lifecycle event
8. Return complete result

Response:

```json
{
  "success": true,
  "data": {
    "testId": "TEST-0001",
    "status": "COMPLETED",
    "score": 84,
    "classification": "FURTHER_EVALUATION"
  }
}
```

---

## POST /api/tests/:testId/stop

Stop a running test.

Request:

```json
{
  "stopReason": "USER_STOP"
}
```

---

## GET /api/tests/:testId

Return complete test.

Include:

- test metadata
- measurements
- analysis
- status
- timestamps

---

## GET /api/cells/:cellId/tests

Return all tests for a cell.

Support:

```text
?page=1
&limit=20
```

---

# 15. ESP32 Hardware API

The ESP32 should NOT need to know about the database schema.

The hardware workflow should be:

```text
ESP32
  ↓
POST /api/device/tests
  ↓
Backend
  ↓
Create/store test
  ↓
Analysis
```

However, for the MVP, use the normal test endpoints first.

Recommended future hardware endpoint:

```text
POST /api/device/test-data
```

Request:

```json
{
  "deviceId": "REVOLTCELL-ESP32-001",
  "cellId": "EV-CELL-001",
  "testId": "TEST-0001",
  "elapsedSeconds": 120,
  "voltage": 3.91,
  "current": 0.82,
  "temperature": 31.4,
  "loadEnabled": true
}
```

This endpoint should be optional until the hardware firmware is ready.

Do not build hardware authentication complexity for the initial hackathon prototype unless needed.

---

# 16. Analysis APIs

## POST /api/analysis/:testId/generate

Generate/recalculate analysis for a completed test.

This is useful during development.

---

## GET /api/cells/:cellId/analysis

Return latest analysis.

---

## GET /api/tests/:testId/analysis

Return analysis for a specific test.

---

# 17. Analysis Logic

Implement analysis as a separate backend service:

```text
services/
  analysisService.ts
```

Input:

```text
test
measurements
cell metadata
```

Output:

```text
score
electricalScore
thermalScore
stabilityScore
classification
recommendation
```

Example prototype scoring:

```text
Electrical performance: 0–40
Thermal behavior:       0–30
Stability:              0–30

Total:                  0–100
```

Clearly label the score:

```text
Prototype Second-Life Screening Score
```

Do not call it:

```text
Certified SOH
```

---

# 18. Application Matching API

## GET /api/cells/:cellId/applications

Return possible applications.

Example:

```json
{
  "success": true,
  "data": {
    "primary": {
      "application": "LOW_POWER_STORAGE",
      "suitability": "HIGH"
    },
    "alternatives": [
      {
        "application": "BACKUP_POWER",
        "suitability": "MEDIUM"
      }
    ]
  }
}
```

---

# 19. Cell Matching API

## GET /api/cells/:cellId/matches

Return similar cells.

Query:

```text
?limit=5
```

Match based on stored test/analysis characteristics.

---

# 20. Lifecycle APIs

## GET /api/cells/:cellId/lifecycle

Return lifecycle history.

---

## POST /api/cells/:cellId/lifecycle

Add lifecycle event.

Request:

```json
{
  "event": "RECOVERED",
  "description": "Cell recovered from retired battery pack."
}
```

---

# 21. Passport API

## GET /api/cells/:cellId/passport

Return all information needed by the passport page.

This should be the primary endpoint used by:

```text
React /passport/:cellId
```

Response should combine:

```text
cell
latestTest
latestAnalysis
applications
matches
lifecycle
testHistory
```

Do not make the frontend call 7 endpoints just to render the passport.

---

# 22. Dashboard APIs

## GET /api/dashboard/summary

Return:

```json
{
  "success": true,
  "data": {
    "totalCells": 24,
    "testedCells": 18,
    "testingCells": 2,
    "goodCells": 8,
    "furtherEvaluation": 6,
    "lowPerformance": 4,
    "unsuitable": 0
  }
}
```

---

## GET /api/dashboard/recent-tests

Return recent tests.

Support:

```text
?limit=10
```

---

## GET /api/dashboard/score-distribution

Return score distribution for charts.

---

# 23. Health API

## GET /api/health

Response:

```json
{
  "success": true,
  "status": "OK",
  "service": "ReVoltCell Backend",
  "database": "CONNECTED"
}
```

This is required for frontend/backend connection testing.

---

# 24. Frontend Pages

React application should contain:

```text
/
  Dashboard

/cells
  Cell list

/cells/:cellId
  Cell details

/cells/:cellId/tests
  Test history

/test/new
  Create test

/test/:testId
  Live/replay test dashboard

/analysis/:cellId
  Battery analysis

/applications/:cellId
  Application matching

/matching/:cellId
  Cell matching

/lifecycle/:cellId
  Lifecycle tracking

/passport/:cellId
  Digital battery passport
```

---

# 25. Dashboard

Display:

```text
Total Cells
Tested
Currently Testing
Good
Further Evaluation
Low Performance
```

Charts:

- score distribution
- recent test scores
- voltage vs time
- temperature vs time

---

# 26. Live Test Screen

The frontend must support mock/live modes.

Display:

```text
CELL ID
Voltage
Current
Temperature
Elapsed time
Load status
Test status
```

Graphs:

```text
Voltage vs Time
Current vs Time
Temperature vs Time
```

Buttons:

```text
Start
Stop
Complete
```

For now, generate mock measurements.

Later replace mock source with ESP32 data.

---

# 27. Battery Analysis Screen

Display:

```text
Prototype Score
Electrical
Thermal
Stability
Classification
Recommendation
```

Example:

```text
84 / 100

Electrical       GOOD
Thermal          GOOD
Stability        GOOD

FURTHER EVALUATION
```

---

# 28. Application Matching Screen

Display:

```text
Primary potential application
Suitability
Reason

Alternative applications
```

Use cautious wording:

```text
Potential second-life use
```

---

# 29. Cell Matching Screen

Display:

```text
Current Cell
Score

Similar Cells
Score difference
Classification
```

Include warning:

```text
Similarity does not guarantee pack compatibility or safety.
```

---

# 30. Lifecycle Screen

Use a timeline:

```text
EV Battery
    ↓
Retired
    ↓
Recovered
    ↓
Tested
    ↓
Second-Life Evaluation
    ↓
Candidate
```

---

# 31. Digital Passport Screen

Display:

```text
REVOLTCELL DIGITAL BATTERY PASSPORT

Cell ID
Chemistry
Model
Source

Prototype Score
Classification

Latest Test
Voltage
Current
Temperature

Potential Applications

Lifecycle

QR CODE
```

QR should point to:

```text
/passport/:cellId
```

---

# 32. Frontend API Client

Create:

```text
src/api/
  client.ts
  cellsApi.ts
  testsApi.ts
  analysisApi.ts
  dashboardApi.ts
  passportApi.ts
```

Use a central API client.

Example:

```ts
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
```

Do not hardcode API URLs throughout components.

---

# 33. Backend Folder Structure

Recommended:

```text
backend/
├── src/
│   ├── config/
│   │   └── env.ts
│   │
│   ├── controllers/
│   │   ├── cellController.ts
│   │   ├── testController.ts
│   │   ├── analysisController.ts
│   │   ├── applicationController.ts
│   │   ├── lifecycleController.ts
│   │   ├── dashboardController.ts
│   │   └── passportController.ts
│   │
│   ├── routes/
│   │   ├── cellRoutes.ts
│   │   ├── testRoutes.ts
│   │   ├── analysisRoutes.ts
│   │   ├── dashboardRoutes.ts
│   │   └── passportRoutes.ts
│   │
│   ├── services/
│   │   ├── analysisService.ts
│   │   ├── applicationService.ts
│   │   ├── matchingService.ts
│   │   ├── lifecycleService.ts
│   │   └── passportService.ts
│   │
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   └── validation.ts
│   │
│   ├── validators/
│   │   ├── cellValidator.ts
│   │   └── testValidator.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── prisma/
│   └── schema.prisma
│
├── .env
├── package.json
└── tsconfig.json
```

---

# 34. Frontend Folder Structure

```text
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   ├── cellsApi.ts
│   │   ├── testsApi.ts
│   │   ├── analysisApi.ts
│   │   ├── dashboardApi.ts
│   │   └── passportApi.ts
│   │
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── StatCard.tsx
│   │   ├── CellStatusBadge.tsx
│   │   ├── ScoreGauge.tsx
│   │   ├── TestChart.tsx
│   │   ├── LifecycleTimeline.tsx
│   │   └── QRCode.tsx
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Cells.tsx
│   │   ├── CellDetails.tsx
│   │   ├── NewTest.tsx
│   │   ├── TestDetails.tsx
│   │   ├── Analysis.tsx
│   │   ├── Applications.tsx
│   │   ├── Matching.tsx
│   │   ├── Lifecycle.tsx
│   │   └── Passport.tsx
│   │
│   ├── types/
│   │   ├── cell.ts
│   │   ├── test.ts
│   │   └── analysis.ts
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── .env
├── package.json
└── vite.config.ts
```

---

# 35. Mock Hardware Mode

This is REQUIRED.

Before real hardware exists, frontend must work with simulated test data.

Create:

```text
POST /api/mock/tests/:testId/simulate
```

Request:

```json
{
  "profile": "GOOD"
}
```

Profiles:

```text
GOOD
WEAK
HOT
UNSTABLE
```

The backend can generate realistic-looking measurement sequences for development.

The frontend should also have a:

```text
Mock Hardware
```

toggle.

This allows the entire project to be demonstrated without the ESP32.

Do NOT intentionally damage real cells to create a bad-cell demonstration.

---

# 36. Seed Data

Create database seed data with at least:

```text
10 cells
```

Include examples of:

```text
GOOD
FURTHER_EVALUATION
LOW_PERFORMANCE
```

Each should have:

- cell information
- at least one completed test
- measurements
- analysis
- application recommendation
- lifecycle history

This makes the frontend immediately useful after setup.

---

# 37. CORS

During development allow:

```text
http://localhost:5173
```

Later allow the deployed frontend domain.

Do not use unrestricted CORS in production.

---

# 38. Validation

Every POST/PATCH endpoint must validate input.

Reject:

```text
missing cellId
negative voltage
negative current
invalid temperature
invalid test status
invalid enum values
duplicate cellId
```

Return HTTP status codes appropriately:

```text
200 OK
201 Created
400 Bad Request
404 Not Found
409 Conflict
422 Validation Error
500 Internal Server Error
```

---

# 39. Error Handling

Use one centralized error middleware.

All errors should follow:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

Do not expose stack traces to the frontend.

---

# 40. Database Rules

Important relationships:

```text
Cell
 ├── Tests
 │    ├── Measurements
 │    └── Analysis
 │
 ├── Applications
 ├── Lifecycle Events
 └── Matching
```

A cell can have many tests.

A test can have many measurements.

A test has at most one current analysis result.

Historical measurements must never be overwritten.

---

# 41. API Summary

Minimum required endpoints:

```text
GET    /api/health

POST   /api/cells
GET    /api/cells
GET    /api/cells/:cellId
PATCH  /api/cells/:cellId
DELETE /api/cells/:cellId

POST   /api/tests
POST   /api/tests/:testId/start
POST   /api/tests/:testId/measurements
POST   /api/tests/:testId/measurements/batch
POST   /api/tests/:testId/complete
POST   /api/tests/:testId/stop
GET    /api/tests/:testId
GET    /api/cells/:cellId/tests

POST   /api/analysis/:testId/generate
GET    /api/cells/:cellId/analysis
GET    /api/tests/:testId/analysis

GET    /api/cells/:cellId/applications

GET    /api/cells/:cellId/matches

GET    /api/cells/:cellId/lifecycle
POST   /api/cells/:cellId/lifecycle

GET    /api/cells/:cellId/passport

GET    /api/dashboard/summary
GET    /api/dashboard/recent-tests
GET    /api/dashboard/score-distribution

POST   /api/mock/tests/:testId/simulate
```

---

# 42. ESP32 Integration Contract

When hardware is ready, the ESP32 will provide:

```text
cellId
testId
elapsedSeconds
voltage
current
temperature
loadEnabled
```

The backend must accept these values without requiring frontend changes.

Expected future flow:

```text
1. Frontend creates cell
       ↓
2. Frontend creates test
       ↓
3. ESP32 performs physical test
       ↓
4. ESP32 sends measurements
       ↓
5. Backend stores measurements
       ↓
6. ESP32 completes test
       ↓
7. Backend calculates analysis
       ↓
8. Frontend displays result
       ↓
9. Passport is updated
       ↓
10. QR opens passport
```

---

# 43. Important Hardware Compatibility Requirements

Current hardware architecture:

```text
Li-ion Cell
   │
   ├── INA219 → ESP32
   │
   └── DS18B20 → ESP32

ESP32
   ├── controls IRLZ44N
   ├── START button
   ├── STOP button
   ├── LEDs
   ├── buzzer
   └── UART → Arduino UNO

Arduino UNO
   └── 2.4" TFT
```

ESP32 sensor/controller pins currently planned:

```text
GPIO4  = DS18B20 DATA
GPIO21 = INA219 SDA
GPIO22 = INA219 SCL
GPIO23 = MOSFET gate
GPIO18 = START
GPIO19 = STOP
GPIO25 = BLUE LED
GPIO26 = GREEN LED
GPIO27 = RED LED
GPIO17 = UART TX → UNO A5 RX
```

Backend must not depend on these pins.

The hardware firmware is responsible for translating hardware readings into the API measurement format.

---

# 44. Local Network Requirements for ESP32

The ESP32 cannot call:

```text
http://localhost:3000
```

because `localhost` means the ESP32 itself.

If the laptop running the backend has IP:

```text
192.168.1.10
```

the ESP32 should call:

```text
http://192.168.1.10:3000/api/...
```

Both laptop and ESP32 must be on the same network.

Backend must bind to:

```text
0.0.0.0
```

and the firewall must permit TCP port:

```text
3000
```

For a phone hotspot, both laptop and ESP32 can join the hotspot and the ESP32 can use the laptop's hotspot/LAN IP.

---

# 45. Development Order

The AI coding agent MUST implement in this order:

## Phase 1 — Backend foundation

1. Create Node/Express TypeScript project
2. Configure PostgreSQL
3. Configure Prisma
4. Create schema
5. Create migrations
6. Create seed data
7. Create `/api/health`

## Phase 2 — Cell APIs

Implement:

```text
POST /api/cells
GET /api/cells
GET /api/cells/:cellId
PATCH /api/cells/:cellId
DELETE /api/cells/:cellId
```

## Phase 3 — Test APIs

Implement all test endpoints.

## Phase 4 — Measurement storage

Implement single and batch measurement endpoints.

## Phase 5 — Analysis

Implement scoring and classification service.

## Phase 6 — Applications

Implement application matching.

## Phase 7 — Lifecycle

Implement lifecycle APIs.

## Phase 8 — Passport

Implement combined passport API.

## Phase 9 — Dashboard APIs

Implement dashboard summary and charts.

## Phase 10 — Mock hardware

Implement simulation endpoints.

## Phase 11 — React frontend

Build pages and API client.

## Phase 12 — Integration testing

Verify:

```text
Create cell
  ↓
Create test
  ↓
Add measurements
  ↓
Complete test
  ↓
Generate analysis
  ↓
Application matching
  ↓
Lifecycle
  ↓
Passport
  ↓
QR
```

---

# 46. Definition of Done

The project is considered backend/frontend ready when:

- Backend starts successfully
- PostgreSQL connects
- Prisma migrations work
- Seed data loads
- `/api/health` works
- Cell CRUD works
- Test creation works
- Measurement upload works
- Batch measurement upload works
- Test completion works
- Analysis is generated automatically
- Application recommendations work
- Cell matching works
- Lifecycle works
- Passport endpoint returns combined data
- Dashboard loads
- React frontend communicates with backend
- Mock test mode works
- Charts display measurement data
- QR opens passport page
- No frontend component contains hardcoded backend URLs
- ESP32 integration contract is documented
- Backend can later be accessed from ESP32 over LAN
- Historical measurements are preserved

---

# 47. Coding Agent Rules

The AI coding agent MUST follow these rules:

1. Do not invent additional hardware components.
2. Do not create APIs that are unrelated to ReVoltCell.
3. Keep business logic in services, not React components.
4. Keep database access inside backend.
5. Validate all incoming API data.
6. Use TypeScript types/interfaces consistently.
7. Use environment variables for configuration.
8. Never use `localhost` as the ESP32 backend address.
9. Keep mock hardware mode separate from real hardware integration.
10. Do not overwrite historical test measurements.
11. Do not describe prototype score as certified SOH.
12. Do not claim a cell is safe for a real second-life application.
13. Use "potential second-life application" and "prototype screening score".
14. Keep API responses consistent.
15. Add useful error messages.
16. Add seed data so the frontend works immediately.
17. Add README setup instructions.
18. Add API documentation in the project.
19. Add basic backend tests for critical endpoints.
20. Make the backend usable without any physical hardware connected.

---

# 48. Final System

The finished software should provide:

```text
                 ┌───────────────────────┐
                 │      React UI         │
                 │                       │
                 │ Dashboard             │
                 │ Cells                 │
                 │ Testing               │
                 │ Analysis              │
                 │ Applications          │
                 │ Matching              │
                 │ Lifecycle             │
                 │ Digital Passport      │
                 └───────────┬───────────┘
                             │
                          REST API
                             │
                 ┌───────────▼───────────┐
                 │    Node/Express       │
                 │       Backend         │
                 │                       │
                 │ Controllers           │
                 │ Services              │
                 │ Validation            │
                 │ Analysis              │
                 │ Passport              │
                 └───────────┬───────────┘
                             │
                          Prisma
                             │
                 ┌───────────▼───────────┐
                 │      PostgreSQL       │
                 └───────────────────────┘


Later:

                 ┌───────────────────────┐
                 │       ESP32           │
                 │ INA219 + DS18B20      │
                 │ MOSFET + Load         │
                 └───────────┬───────────┘
                             │ Wi-Fi
                             ▼
                      REST API Backend
```

The software must be complete enough that the physical hardware can be added later without redesigning the database, API, or React application.
