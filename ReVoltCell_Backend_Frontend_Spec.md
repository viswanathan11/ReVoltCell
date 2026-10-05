# ReVoltCell — Final Software Auto-Completion Specification

## 1. Purpose

ReVoltCell is a hardware + software prototype for screening lithium-ion cells recovered from retired EV batteries and preparing them for potential second-life use.

The hardware team owns the ESP32/TFT/sensors/load/safety firmware. The software receives measurements from the ESP32, stores the complete test history, calculates a prototype screening score, creates a digital battery passport and QR code, recommends potential second-life applications, compares cells, and tracks lifecycle history.

The authoritative hardware proposal defines five core features:

1. Automated Cell Testing
2. Second-Life Score
3. Thermal Monitoring / Protection
4. QR Digital Battery Passport
5. Second-Life Application Matching

It also defines Live Web Dashboard and ML Prediction as stretch/future features. The web dashboard should be implemented; ML must remain optional/future until enough validated data exists.

The hardware team's documented flow is:

```text
ESP32 test data
    -> Wi-Fi / Serial
    -> Backend / API
    -> Database
    -> Score Engine
    -> Digital Passport / QR
    -> Application Matching
    -> Cell Matching
    -> Lifecycle History
```

The prototype is NOT a certified battery-health, SOH, capacity, internal-resistance, safety, or second-life approval system.

---

# 2. Technology Stack

## Backend

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- SQLite
- Zod
- CORS
- Helmet
- dotenv

## Frontend

- React
- Vite
- TypeScript
- React Router
- Axios
- Recharts
- QR-code generation library

## Development

- VS Code
- Git
- GitHub

Use SQLite + Prisma because every team member should be able to clone and run the project without installing a database server.

---

# 3. Architecture

```text
                 ┌──────────────────────┐
                 │        ESP32         │
                 │ INA219 + DS18B20     │
                 │ Test controller      │
                 └──────────┬───────────┘
                            │ Wi-Fi
                            ▼
                 ┌──────────────────────┐
                 │ Node.js + Express API│
                 │       :3000          │
                 └──────────┬───────────┘
                            │
                         Prisma
                            │
                            ▼
                       SQLite DB
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        Score Engine   App Matching   Lifecycle
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                    React Frontend
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
          Dashboard      Analysis      Passport
                                            │
                                            ▼
                                            QR
```

---

# 4. Environment Configuration

## Backend `.env`

```env
PORT=3000
HOST=0.0.0.0
DATABASE_URL="file:./dev.db"
CORS_ORIGIN="http://localhost:5173"
API_BASE_URL="http://localhost:3000"
PASSPORT_BASE_URL="http://localhost:5173/passport"
```

## Frontend `.env`

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_PASSPORT_BASE_URL=http://localhost:5173/passport
```

Never hardcode backend URLs inside React components.

---

# 5. LAN / ESP32 Networking

`HOST=0.0.0.0` means the Node server listens on the laptop's available network interfaces.

It does NOT mean the ESP32 should request `0.0.0.0`.

If the laptop running the backend is:

```text
192.168.1.20
```

the ESP32 sends:

```text
http://192.168.1.20:3000/api/...
```

If another teammate runs the backend:

```text
192.168.1.45
```

the ESP32 uses:

```text
http://192.168.1.45:3000/api/...
```

The ESP32's own IP should normally come from DHCP and does not need to be hardcoded.

The ESP32 firmware should keep only the backend address configurable:

```cpp
const char* BACKEND_URL = "http://192.168.1.20:3000";
```

Later this can be changed through an ESP32 setup/configuration page.

The OS firewall must allow TCP port 3000 when LAN access is required.

---

# 6. Database Model

Relationships:

```text
Cell
 ├── Tests
 │    ├── Measurements
 │    └── Analysis
 ├── Application Recommendations
 ├── Cell Matches
 └── Lifecycle Events
```

A cell can have many tests.
A test has many measurements.
Historical measurements and lifecycle events are immutable.

---

# 7. Cell Model

```text
id
cellId                  unique
cellType
manufacturer            optional
model                   optional
chemistry               optional
nominalVoltage          optional
ratedCapacityMah        optional
source                  optional
manufactureDate         optional
status
createdAt
updatedAt
```

Statuses:

```text
REGISTERED
TESTING
TESTED
ARCHIVED
```

Example:

```json
{
  "cellId": "EV-CELL-001",
  "cellType": "18650",
  "manufacturer": "Unknown",
  "model": "18650",
  "chemistry": "Li-ion",
  "nominalVoltage": 3.7,
  "ratedCapacityMah": 2500,
  "source": "Recovered EV battery",
  "status": "REGISTERED"
}
```

---

# 8. Test Model

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

Statuses:

```text
PENDING
RUNNING
COMPLETED
STOPPED
FAILED
```

Stop reasons:

```text
COMPLETED
USER_STOP
LOW_VOLTAGE
OVER_TEMPERATURE
TIMEOUT
ERROR
```

---

# 9. Measurement Model

Store time-series measurements, not just the final result.

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
  "elapsedSeconds": 30,
  "voltage": 3.91,
  "current": 0.82,
  "temperature": 31.4,
  "loadEnabled": true
}
```

This powers:

- Voltage vs Time
- Current vs Time
- Temperature vs Time

---

# 10. Analysis Model

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

Initial prototype categories from the hardware proposal:

```text
80–100  -> Recommended for Further Evaluation
60–79   -> Needs Additional Testing
<60     -> Recycling / Do Not Reuse
```

These are prototype decision rules only.

Never call the result certified SOH, certified safety, or guaranteed reuse.

---

# 11. Derived Indicators

The backend may calculate:

- Voltage sag
- Temperature rise
- Average current
- Maximum current
- Minimum voltage
- Test duration

The source documents mention capacity/derived and internal-resistance/derived indicators, but also explicitly state that:

- voltage alone is not capacity
- capacity requires controlled charge/discharge measurement
- internal resistance requires an appropriate measurement method

Therefore, DO NOT invent these values.

If the hardware does not provide a valid measurement:

```text
Capacity: Not measured
Internal resistance: Not measured
```

---

# 12. Application Recommendation Model

```text
id
cellId
testId
application
suitability
reason
createdAt
```

Potential applications:

```text
BACKUP_LIGHTING
LOW_POWER_IOT
SMALL_BACKUP_SYSTEM
LOW_POWER_STORAGE
SOLAR_STORAGE
```

Suitability:

```text
HIGH
MEDIUM
LOW
NOT_RECOMMENDED
```

Use wording:

```text
Potential second-life application
Potential pathway for further engineering evaluation
```

Never say:

```text
Approved for use
Guaranteed safe
Guaranteed suitable
```

Use transparent rule-based matching for the prototype.

---

# 13. Cell Matching Model

```text
id
sourceCellId
matchedCellId
scoreDifference
similarityScore
reason
createdAt
```

Compare:

- prototype score
- chemistry
- nominal voltage
- voltage behavior
- current behavior
- temperature rise
- classification

Example:

```text
CELL-001 = 88
CELL-002 = 86
CELL-003 = 87

=> Potential matching group
```

Matching does NOT guarantee electrical compatibility or safety for a real battery pack.

---

# 14. Lifecycle Model

```text
id
cellId
event
timestamp
description
```

Events:

```text
ORIGINAL_EV
RETIRED
RECOVERED
REVOLTCELL_TESTED
SCORED
SECOND_LIFE_EVALUATION
SECOND_LIFE_APPLICATION
RETEST
RECYCLE
```

Expected lifecycle:

```text
Original EV
  -> Retired
  -> Recovered
  -> ReVoltCell Tested
  -> Scored
  -> Second-Life Evaluation
  -> Second-Life Application
  -> Re-test
  -> Recycle
```

Lifecycle history is append-only.

---

# 15. API Response Standard

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

Use:

```text
200 OK
201 Created
400 Bad Request
404 Not Found
409 Conflict
422 Unprocessable Entity
500 Internal Server Error
```

---

# 16. Complete REST API

## System

```text
GET /api/health
```

## Cells

```text
POST   /api/cells
GET    /api/cells
GET    /api/cells/:cellId
PATCH  /api/cells/:cellId
DELETE /api/cells/:cellId
```

## Tests

```text
POST /api/tests
POST /api/tests/:testId/start
POST /api/tests/:testId/measurements
POST /api/tests/:testId/measurements/batch
POST /api/tests/:testId/complete
POST /api/tests/:testId/stop
GET  /api/tests/:testId
GET  /api/cells/:cellId/tests
```

## Analysis

```text
POST /api/analysis/:testId/generate
GET  /api/tests/:testId/analysis
GET  /api/cells/:cellId/analysis
```

## Applications

```text
GET /api/cells/:cellId/applications
```

## Matching

```text
GET /api/cells/:cellId/matches
```

## Lifecycle

```text
GET  /api/cells/:cellId/lifecycle
POST /api/cells/:cellId/lifecycle
```

## Passport / QR

```text
GET /api/cells/:cellId/passport
GET /api/cells/:cellId/qr
```

## Dashboard

```text
GET /api/dashboard/summary
GET /api/dashboard/recent-tests
GET /api/dashboard/score-distribution
```

## Mock Hardware

```text
POST /api/mock/tests/:testId/simulate
```

## Future ESP32

```text
POST /api/device/test-data
```

---

# 17. API Contracts

## GET `/api/health`

```json
{
  "success": true,
  "status": "OK",
  "service": "ReVoltCell Backend",
  "database": "CONNECTED"
}
```

## POST `/api/cells`

Request:

```json
{
  "cellId": "EV-CELL-001",
  "cellType": "18650",
  "manufacturer": "Unknown",
  "model": "18650",
  "chemistry": "Li-ion",
  "nominalVoltage": 3.7,
  "ratedCapacityMah": 2500,
  "source": "Recovered EV battery"
}
```

Return `201`.

## GET `/api/cells`

Query:

```text
?page=1&limit=20&status=TESTED&search=EV-CELL
```

Return paginated results.

## GET `/api/cells/:cellId`

Return:

```text
cell metadata
current status
latest test
latest analysis
latest score
```

## PATCH `/api/cells/:cellId`

Update editable metadata only.

Never edit historical measurements here.

## DELETE `/api/cells/:cellId`

Soft archive the cell:

```text
status = ARCHIVED
```

Do not physically delete a cell with test history.

---

# 18. Test APIs

## POST `/api/tests`

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

## POST `/api/tests/:testId/start`

Transition:

```text
PENDING -> RUNNING
```

Set `startedAt`.

## POST `/api/tests/:testId/measurements`

```json
{
  "elapsedSeconds": 30,
  "voltage": 3.91,
  "current": 0.82,
  "temperature": 31.4,
  "loadEnabled": true
}
```

## POST `/api/tests/:testId/measurements/batch`

Preferred ESP32 upload endpoint.

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

## POST `/api/tests/:testId/complete`

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

Backend transaction:

```text
Validate
 -> calculate derived values
 -> mark completed
 -> generate analysis
 -> generate applications
 -> update cell status
 -> add lifecycle event
 -> return complete result
```

## POST `/api/tests/:testId/stop`

```json
{
  "stopReason": "USER_STOP"
}
```

## GET `/api/tests/:testId`

Return test metadata, measurements, analysis, status and timestamps.

## GET `/api/cells/:cellId/tests`

Return complete test history with pagination.

---

# 19. Analysis APIs

## POST `/api/analysis/:testId/generate`

Generate/recalculate analysis from stored test data.

Put scoring logic in:

```text
src/services/scoreService.ts
```

## GET `/api/tests/:testId/analysis`

Return analysis for a test.

## GET `/api/cells/:cellId/analysis`

Return latest analysis for a cell.

---

# 20. Application API

## GET `/api/cells/:cellId/applications`

Example:

```json
{
  "success": true,
  "data": {
    "primary": {
      "application": "BACKUP_LIGHTING",
      "suitability": "HIGH",
      "reason": "Prototype test characteristics support further evaluation for this low-demand pathway."
    },
    "alternatives": [
      {
        "application": "LOW_POWER_IOT",
        "suitability": "MEDIUM",
        "reason": "Potential low-demand pathway requiring engineering validation."
      }
    ]
  }
}
```

---

# 21. Matching API

## GET `/api/cells/:cellId/matches`

Query:

```text
?limit=5
```

Example:

```json
{
  "success": true,
  "data": [
    {
      "cellId": "EV-CELL-004",
      "similarityScore": 94,
      "scoreDifference": 3,
      "classification": "RECOMMENDED_FOR_FURTHER_EVALUATION"
    }
  ]
}
```

---

# 22. Lifecycle APIs

## GET `/api/cells/:cellId/lifecycle`

Return chronological lifecycle history.

## POST `/api/cells/:cellId/lifecycle`

```json
{
  "event": "RECOVERED",
  "description": "Cell recovered from retired battery pack."
}
```

Automatically create:

```text
REVOLTCELL_TESTED
SCORED
```

when the relevant workflow completes.

---

# 23. Passport API

## GET `/api/cells/:cellId/passport`

This is the main endpoint for the React passport page.

Return:

```json
{
  "success": true,
  "data": {
    "cell": {},
    "latestTest": {},
    "latestAnalysis": {},
    "applications": [],
    "matches": [],
    "lifecycle": [],
    "testHistory": []
  }
}
```

The frontend should not need multiple separate requests just to render the passport.

Passport fields:

```text
Battery ID
Cell type
Chemistry
Manufacturer/model when available
Source
Test date
Measured values
Test conditions
Derived indicators
Prototype score
Screening category
Potential applications
Lifecycle history
Test history
```

---

# 24. QR API

## GET `/api/cells/:cellId/qr`

QR target:

```text
http://localhost:5173/passport/EV-CELL-001
```

Use `PASSPORT_BASE_URL`.

The QR should contain only the passport URL.

In deployment, change the base URL through environment configuration.

---

# 25. Dashboard APIs

## GET `/api/dashboard/summary`

Example:

```json
{
  "success": true,
  "data": {
    "totalCells": 24,
    "testedCells": 18,
    "testingCells": 2,
    "recommendedForFurtherEvaluation": 8,
    "needsAdditionalTesting": 6,
    "recyclingDoNotReuse": 4
  }
}
```

## GET `/api/dashboard/recent-tests`

Query:

```text
?limit=10
```

## GET `/api/dashboard/score-distribution`

Return chart-friendly score buckets.

---

# 26. Mock Hardware — REQUIRED

The software must work before physical hardware exists.

## POST `/api/mock/tests/:testId/simulate`

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

The mock generator must produce time-series measurements and send them through the SAME storage and analysis services used by real ESP32 data.

Frontend must include:

```text
Mock Hardware Mode
```

Demo flow:

```text
Register Cell
 -> Create Test
 -> Simulate Test
 -> Measurements
 -> Complete
 -> Score
 -> Applications
 -> Lifecycle
 -> Passport
 -> QR
```

Do not intentionally damage real cells to demonstrate bad behavior.

---

# 27. ESP32 Integration Contract

The current hardware architecture uses:

```text
INA219 -> voltage/current measurement
DS18B20 -> cell surface temperature
ESP32 -> controller
IRLZ44N -> electronic load switching
Arduino UNO + TFT -> display
```

Current planned ESP32 pins:

```text
GPIO4  = DS18B20 DATA
GPIO21 = INA219 SDA
GPIO22 = INA219 SCL
GPIO23 = MOSFET Gate
GPIO18 = START
GPIO19 = STOP
GPIO25 = BLUE LED
GPIO26 = GREEN LED
GPIO27 = RED LED
GPIO17 = UART TX -> UNO A5 RX
```

The backend must NOT depend on GPIO numbers.

The ESP32 firmware converts hardware data into:

```json
{
  "cellId": "EV-CELL-001",
  "testId": "TEST-0001",
  "elapsedSeconds": 120,
  "voltage": 3.91,
  "current": 0.82,
  "temperature": 31.4,
  "loadEnabled": true
}
```

## Future endpoint

`POST /api/device/test-data`

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

This endpoint must reuse the same internal measurement service as:

```text
POST /api/tests/:testId/measurements
```

Do not duplicate measurement-storage logic.

---

# 28. React Routes

```text
/
/dashboard

/cells
/cells/:cellId
/cells/:cellId/tests

/test/new
/test/:testId

/analysis/:cellId
/applications/:cellId
/matching/:cellId
/lifecycle/:cellId

/passport/:cellId
```

---

# 29. React Pages

## Dashboard

Show:

```text
Total Cells
Tested
Testing
Recommended for Further Evaluation
Needs Additional Testing
Recycling / Do Not Reuse
```

Charts:

```text
Score distribution
Recent scores
Voltage vs time
Current vs time
Temperature vs time
```

## Cells

Show:

```text
Battery ID
Cell Type
Status
Latest Score
Latest Test
Classification
```

Support search, filters and pagination.

## Cell Details

Show:

```text
Metadata
Current status
Latest score
Latest test
Applications
Lifecycle
Test history
```

Actions:

```text
Start Test
Analysis
Passport
QR
```

## New Test

```text
Select/register cell
 -> create test
 -> start
```

Must work in mock mode.

## Test Details

Show:

```text
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

## Analysis

Show:

```text
Prototype Second-Life Score
Electrical Score
Thermal Score
Stability Score
Classification
Recommendation
```

## Applications

Show:

```text
Primary potential application
Suitability
Reason
Alternative applications
```

## Matching

Show:

```text
Current cell
Score
Similar cells
Similarity
Score difference
Classification
Reason
```

Include:

```text
Similarity does not guarantee pack compatibility or safety.
```

## Lifecycle

Timeline:

```text
Original EV
 -> Retired
 -> Recovered
 -> ReVoltCell Tested
 -> Scored
 -> Second-Life Evaluation
 -> Second-Life Application
 -> Re-test
 -> Recycle
```

## Passport

Show:

```text
REVOLTCELL DIGITAL BATTERY PASSPORT
Battery ID
Cell metadata
Test data
Test conditions
Prototype score
Screening category
Potential applications
Lifecycle
Test history
QR
```

---

# 30. Frontend API Client

Create:

```text
src/api/client.ts
src/api/cellsApi.ts
src/api/testsApi.ts
src/api/analysisApi.ts
src/api/applicationsApi.ts
src/api/matchingApi.ts
src/api/lifecycleApi.ts
src/api/passportApi.ts
src/api/dashboardApi.ts
```

Central client:

```ts
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
```

Do not hardcode API URLs in components.

---

# 31. Backend Folder Structure

```text
backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── config/
│   │   └── env.ts
│   ├── controllers/
│   │   ├── cellController.ts
│   │   ├── testController.ts
│   │   ├── analysisController.ts
│   │   ├── applicationController.ts
│   │   ├── matchingController.ts
│   │   ├── lifecycleController.ts
│   │   ├── passportController.ts
│   │   ├── dashboardController.ts
│   │   └── mockController.ts
│   ├── routes/
│   ├── services/
│   │   ├── scoreService.ts
│   │   ├── applicationMatchingService.ts
│   │   ├── cellMatchingService.ts
│   │   ├── lifecycleService.ts
│   │   ├── passportService.ts
│   │   └── mockHardwareService.ts
│   ├── validators/
│   ├── middleware/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
├── tests/
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

---

# 32. Frontend Folder Structure

```text
frontend/
├── src/
│   ├── api/
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatCard.tsx
│   │   ├── CellStatusBadge.tsx
│   │   ├── ScoreGauge.tsx
│   │   ├── MeasurementChart.tsx
│   │   ├── LifecycleTimeline.tsx
│   │   ├── ApplicationCard.tsx
│   │   ├── CellMatchTable.tsx
│   │   └── QRCodeDisplay.tsx
│   ├── pages/
│   ├── hooks/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
├── .env
├── package.json
└── vite.config.ts
```

---

# 33. Validation

Use Zod for all incoming API bodies.

Reject:

```text
missing cellId
missing testId
negative voltage
negative current
invalid temperature
invalid enum
invalid state transition
duplicate cellId
invalid measurement array
```

---

# 34. Error Handling

Use centralized Express error middleware.

Never expose stack traces.

All errors:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

---

# 35. CORS

Development:

```text
http://localhost:5173
```

Use:

```env
CORS_ORIGIN=http://localhost:5173
```

CORS is a browser policy; it does not replace firewall/network configuration for ESP32.

Do not use unrestricted CORS in production.

---

# 36. Seed Data

Create at least 10 demo cells:

```text
EV-CELL-001
EV-CELL-002
EV-CELL-003
EV-CELL-004
EV-CELL-005
EV-CELL-006
EV-CELL-007
EV-CELL-008
EV-CELL-009
EV-CELL-010
```

Include multiple prototype categories:

```text
Recommended for Further Evaluation
Needs Additional Testing
Recycling / Do Not Reuse
```

Every seeded tested cell should have:

```text
cell metadata
test
measurements
analysis
application recommendation
lifecycle history
```

Seed data must be clearly treated as demo/simulated data.

---

# 37. Test State Machine

Valid:

```text
PENDING
   ↓
RUNNING
   ├── COMPLETED
   ├── STOPPED
   └── FAILED
```

Do not allow invalid transitions such as:

```text
COMPLETED -> RUNNING
COMPLETED -> PENDING
FAILED -> RUNNING
```

A new physical evaluation should create a new test.

---

# 38. Data Integrity Rules

1. Cell IDs are unique.
2. A cell can have many tests.
3. A test belongs to one cell.
4. Measurements belong to one test.
5. Historical measurements are immutable.
6. Completed tests are not silently edited.
7. Analysis must be reproducible from stored data.
8. Lifecycle history is append-only.
9. Passport is generated from database data.
10. QR references the passport URL.
11. No fake capacity/internal-resistance values.
12. No fake safety certification.

---

# 39. Score Service

Create:

```text
src/services/scoreService.ts
```

Input:

```text
Cell
Test
Measurements
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

Initial conceptual weighting may be:

```text
Electrical performance: 0–40
Thermal behavior:       0–30
Stability:              0–30
Total:                  0–100
```

Keep all thresholds in one place so the scoring model can be changed without rewriting controllers or React.

---

# 40. Application Matching Service

Create:

```text
src/services/applicationMatchingService.ts
```

Use transparent rules.

Conceptually:

```text
High score
+ stable electrical behavior
+ acceptable thermal behavior
    -> potential low-demand application

Moderate score
    -> additional testing

Low score
    -> recycling / do-not-reuse pathway
```

Return reasons with recommendations.

---

# 41. Cell Matching Service

Create:

```text
src/services/cellMatchingService.ts
```

Return:

```text
matched cell
similarity score
score difference
reason
```

Do not imply guaranteed pack compatibility.

---

# 42. Lifecycle Service

Create:

```text
src/services/lifecycleService.ts
```

Use append-only lifecycle events.

Automatically add:

```text
REVOLTCELL_TESTED
SCORED
```

when appropriate.

---

# 43. Passport Service

Create:

```text
src/services/passportService.ts
```

Combine:

```text
cell
latest test
latest analysis
applications
matches
lifecycle
test history
```

Passport endpoint should be the single read endpoint for the passport page.

---

# 44. Mock Hardware Service

Create:

```text
src/services/mockHardwareService.ts
```

Profiles:

```text
GOOD
WEAK
HOT
UNSTABLE
```

Generate realistic demo time-series data.

Feed the generated data through the exact same measurement storage and scoring services used by real ESP32 data.

---

# 45. API Documentation

Create:

```text
docs/API.md
```

For every endpoint document:

```text
Method
URL
Purpose
Request body
Query parameters
Success response
Error response
```

Include ESP32 integration examples.

---

# 46. README

Root README must explain:

```text
Project overview
Architecture
Prerequisites
Installation
Environment variables
Prisma setup
Migration
Seed
Backend start
Frontend start
Mock hardware
ESP32 LAN integration
API overview
```

Example:

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

---

# 47. Testing Requirements

Add tests for:

```text
GET /api/health
POST /api/cells
GET /api/cells/:cellId
POST /api/tests
POST /api/tests/:testId/measurements
POST /api/tests/:testId/measurements/batch
POST /api/tests/:testId/complete
GET /api/cells/:cellId/passport
GET /api/cells/:cellId/applications
GET /api/cells/:cellId/matches
GET /api/cells/:cellId/lifecycle
```

Integration test:

```text
Create cell
 -> Create test
 -> Start
 -> Add measurements
 -> Complete
 -> Score
 -> Applications
 -> Lifecycle
 -> Passport
 -> QR
```

---

# 48. Development Order

## Phase 1 — Backend Foundation

- Node.js + Express + TypeScript
- dotenv
- SQLite
- Prisma
- schema
- migration
- seed
- `/api/health`

## Phase 2 — Cell APIs

Implement all Cell endpoints.

## Phase 3 — Test APIs

Implement creation, start, stop, complete, history.

## Phase 4 — Measurements

Implement single and batch measurement endpoints.

## Phase 5 — Score Engine

Implement scoring and analysis.

## Phase 6 — Application Matching

Implement transparent rule-based recommendations.

## Phase 7 — Cell Matching

Implement multi-cell similarity.

## Phase 8 — Lifecycle

Implement history and automatic events.

## Phase 9 — Passport + QR

Implement combined passport and QR.

## Phase 10 — Dashboard APIs

Implement summary, recent tests and score distribution.

## Phase 11 — Mock Hardware

Implement simulator and profiles.

## Phase 12 — React

Build all pages and API clients.

## Phase 13 — Hardware Integration

Connect the real ESP32 to the already-stable API contract.

---

# 49. Definition of Done

Software is ready when:

- Backend starts
- React starts
- SQLite works
- Prisma migrations work
- Seed works
- Health endpoint works
- Cell CRUD works
- Test workflow works
- Measurements work
- Batch measurements work
- Score is generated
- Application matching works
- Cell matching works
- Lifecycle works
- Passport works
- QR works
- Dashboard works
- Charts work
- Mock hardware works
- Frontend works without physical hardware
- Historical data is preserved
- ESP32 API contract is documented
- LAN access is documented
- API docs exist
- README exists
- Integration tests pass

---

# 50. Final Demonstration

```text
Open ReVoltCell Dashboard
        ↓
Register/select cell
        ↓
Create test
        ↓
Mock Hardware OR real ESP32
        ↓
Measurements appear
        ↓
Test completes
        ↓
Second-Life Score
        ↓
Screening Category
        ↓
Potential Application
        ↓
Lifecycle Updated
        ↓
Digital Battery Passport
        ↓
QR Generated
        ↓
Scan QR
        ↓
Passport Opens
        ↓
Compare Cells
        ↓
Matching Candidates
```

---

# 51. Safety and Technical Boundaries

The software must not instruct users to:

- short cells
- puncture cells
- crush cells
- intentionally overcharge cells
- dismantle high-voltage EV packs

The proposal specifically states that appropriate low-voltage cells and a protected test holder should be used.

The software must accurately represent measurement limitations:

```text
Voltage alone != capacity
```

Capacity requires controlled charge/discharge measurement.

Internal resistance requires an appropriate measurement method.

All scores and application matches are prototype decision-support outputs, not certified engineering decisions.

---

# 52. What Software Does NOT Handle

Do not implement hardware-control logic in the backend for:

```text
TFT
INA219 hardware
DS18B20 hardware
battery holder
load circuit
MOSFET safety
physical buttons
LED hardware
buzzer hardware
physical thermal shutdown
```

The ESP32 firmware owns these.

The backend only receives the resulting data and stores/analyzes it.

---

# 53. AI Coding Agent Rules

The coding agent MUST:

1. Use Node.js + Express + TypeScript.
2. Use React + Vite + TypeScript.
3. Use SQLite + Prisma.
4. Implement every required API in this document.
5. Keep controllers thin.
6. Keep business logic in services.
7. Validate requests with Zod.
8. Use environment variables.
9. Never hardcode backend URLs in React components.
10. Keep ESP32 backend URL configurable.
11. Make software work without hardware.
12. Implement mock hardware mode.
13. Use the same analysis pipeline for mock and real data.
14. Preserve historical measurements.
15. Preserve lifecycle history.
16. Never fabricate capacity or internal resistance.
17. Clearly label prototype scores.
18. Clearly label potential applications.
19. Generate passport from database records.
20. Generate QR from passport URL.
21. Add seed data.
22. Add API documentation.
23. Add README.
24. Add integration tests.
25. Do not introduce unrelated frameworks.
26. Do not replace Node/React with Python/FastAPI.
27. Do not make ML a required dependency.
28. Do not implement TFT/sensor control in the backend.
29. Do not duplicate mock scoring logic.
30. Keep the public API stable for future ESP32 integration.

---

# 54. Required API Checklist

```text
SYSTEM
[ ] GET    /api/health

CELLS
[ ] POST   /api/cells
[ ] GET    /api/cells
[ ] GET    /api/cells/:cellId
[ ] PATCH  /api/cells/:cellId
[ ] DELETE /api/cells/:cellId

TESTS
[ ] POST   /api/tests
[ ] POST   /api/tests/:testId/start
[ ] POST   /api/tests/:testId/measurements
[ ] POST   /api/tests/:testId/measurements/batch
[ ] POST   /api/tests/:testId/complete
[ ] POST   /api/tests/:testId/stop
[ ] GET    /api/tests/:testId
[ ] GET    /api/cells/:cellId/tests

ANALYSIS
[ ] POST   /api/analysis/:testId/generate
[ ] GET    /api/tests/:testId/analysis
[ ] GET    /api/cells/:cellId/analysis

APPLICATIONS
[ ] GET    /api/cells/:cellId/applications

MATCHING
[ ] GET    /api/cells/:cellId/matches

LIFECYCLE
[ ] GET    /api/cells/:cellId/lifecycle
[ ] POST   /api/cells/:cellId/lifecycle

PASSPORT
[ ] GET    /api/cells/:cellId/passport
[ ] GET    /api/cells/:cellId/qr

DASHBOARD
[ ] GET    /api/dashboard/summary
[ ] GET    /api/dashboard/recent-tests
[ ] GET    /api/dashboard/score-distribution

MOCK HARDWARE
[ ] POST   /api/mock/tests/:testId/simulate

FUTURE ESP32
[ ] POST   /api/device/test-data
```

---

# 55. Final Architecture Principle

The frontend and database must be hardware-independent.

Both mock hardware and real ESP32 data must produce the same measurement object:

```json
{
  "cellId": "EV-CELL-001",
  "testId": "TEST-0001",
  "elapsedSeconds": 120,
  "voltage": 3.91,
  "current": 0.82,
  "temperature": 31.4,
  "loadEnabled": true
}
```

That object enters the same backend pipeline:

```text
Measurement
    ↓
Database
    ↓
Analysis
    ↓
Score
    ↓
Application Matching
    ↓
Lifecycle
    ↓
Passport
    ↓
QR
```

This allows the software to be completed before the physical hardware is finished.

---

# 56. Final Pitch

> **“ReVoltCell doesn't simply test retired EV batteries. It measures remaining value, protects the testing process, gives each cell a traceable digital identity, and helps guide suitable cells toward a potential second-life pathway.”**

Prototype positioning:

> **Hackathon proof-of-concept for EV battery circularity, screening and traceability.**

Production use would require validated instrumentation, battery-specific procedures, engineering controls and applicable standards.

## END OF SPECIFICATION
