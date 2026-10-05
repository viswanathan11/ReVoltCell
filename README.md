# ReVoltCell — Second-Life Battery Screening Platform

> **Disclaimer:** ReVoltCell is a prototype screening triage system designed to identify high-potential candidates for secondary utilization. Calculated prototype scores and classifications are exploratory estimates and do not constitute certified State-of-Health (SOH), impedance spectroscopy (EIS), or commercial pack safety compliance certifications.

---

## 1. System Overview

ReVoltCell bridges physical battery recycling and circular economy triage:
1. **Physical / Mock Test Session**: Discharges cells across a controlled resistive load (5Ω / 10W) via MOSFET (IRLZ44N) and logs continuous voltage (INA219), load current, and thermal drift (DS18B20).
2. **Backend Screening Engine**: Ingests high-resolution measurement points, calculates electrical sag, thermal rise, and curve stability, and generates a prototype screening score (0–100) and readiness classification.
3. **Second-Life Application Mapping**: Maps tested cells to suitable duty cycles (e.g. low-power energy storage, buffered solar storage, LED lighting, or material recycling).
4. **Cell Similarity Matching**: Identifies candidate pairs for module grouping based on capacity, sag, and thermal signature.
5. **Digital Battery Passport & QR Verification**: Provides an immutable verification passport with printable certificate and scannable QR code linking directly to the cell's history.

---

## 2. Architecture

```text
                 ┌─────────────────────────────────────────┐
                 │       React + Vite Frontend (5173)      │
                 │ Dashboard • Inventory • Live / Mock Test│
                 │ Analysis • Applications • Passport • QR │
                 └───────────────────┬─────────────────────┘
                                     │ REST JSON
                                     ▼
                 ┌─────────────────────────────────────────┐
                 │       Node.js / Express Backend (3000)  │
                 │ Controllers • Services • Zod Validation │
                 │ Analysis Algorithm • Application Engine │
                 └───────────────────┬─────────────────────┘
                                     │ Prisma ORM
                                     ▼
                 ┌─────────────────────────────────────────┐
                 │  SQLite (dev.db) / PostgreSQL (Docker)  │
                 └─────────────────────────────────────────┘
                                     ▲
                                     │ Wi-Fi REST (0.0.0.0:3000)
                 ┌───────────────────┴─────────────────────┐
                 │          ESP32 Hardware Controller      │
                 │   INA219 (V/I) + DS18B20 (Temp) + Load  │
                 └─────────────────────────────────────────┘
```

---

## 3. Quick Start & Execution

### Prerequisites
- Node.js (v18+) & npm

### Step 1: Start the Backend
```bash
cd backend
npm install             # already installed
npm run prisma:push     # generates Prisma client & initializes dev.db
npm run prisma:seed     # loads 10 comprehensive seed cells
npm run dev             # starts server on http://localhost:3000 (binds to 0.0.0.0)
```

The backend health check is accessible at:
- `http://localhost:3000/api/health`

### Step 2: Start the Frontend
```bash
cd frontend
npm install             # already installed
npm run dev             # starts Vite on http://localhost:5173
```
Open `http://localhost:5173` in your browser.

---

## 4. Testing & Verification

A comprehensive integration test suite verifies all 17 critical endpoints:
```bash
cd backend
npm test
```
Outputs:
```text
GET /api/health ............................. PASS
GET /api/dashboard/summary .................. PASS
GET /api/dashboard/score-distribution ....... PASS
GET /api/cells?limit=5 ...................... PASS
POST /api/cells ............................. PASS
GET /api/cells/:cellId ...................... PASS
POST /api/tests ............................. PASS
POST /api/tests/:testId/start ............... PASS
POST /api/tests/:testId/measurements ........ PASS
POST /api/tests/:testId/measurements/batch .. PASS
POST /api/tests/:testId/complete ............ PASS
GET /api/cells/:cellId/analysis ............. PASS
GET /api/cells/:cellId/applications ......... PASS
GET /api/cells/:cellId/matches .............. PASS
GET /api/cells/:cellId/lifecycle ............ PASS
GET /api/cells/:cellId/passport ............. PASS
POST /api/mock/tests/:testId/simulate ....... PASS
GET /api/cells/:cellId/qr ................... PASS
GET /api/cells/:cellId/qr?format=svg ........ PASS

Results: 19 passed, 0 failed.
```

---

## 5. Mock Hardware Simulation

ReVoltCell can be demonstrated 100% without hardware connected:
- **In UI**: When creating a new test at `/test/new`, toggle **Mock Hardware Mode** and select one of 4 simulation profiles:
  - `GOOD`: Nominal 4.15V, minimal sag, low thermal rise (+2.5°C). Yields ~88/100 (GOOD).
  - `WEAK`: High internal impedance, heavy voltage sag to 3.25V, moderate temp rise (+6.0°C). Yields ~55/100 (LOW_PERFORMANCE).
  - `HOT`: Rapid temperature rise exceeding 48°C. Stops on OVER_TEMPERATURE. Yields ~35/100 (UNSUITABLE).
  - `UNSTABLE`: Erratic voltage jumps and noise. Penalized for curve volatility.
- **Via API**:
  ```bash
  curl -X POST http://localhost:3000/api/mock/tests/TEST-0001/simulate \
    -H "Content-Type: application/json" \
    -d '{"profile": "GOOD"}'
  ```

---

## 6. Seed Data Inventory

The database is pre-seeded with 10 real-world cell models:
1. `EV-CELL-001`: LG Chem INR18650-HG2 (3000mAh) — **GOOD** (Recovered Nissan Leaf module)
2. `EV-CELL-002`: Samsung SDI INR18650-25R (2500mAh) — **GOOD** (Recovered Tesla Model S pack)
3. `EV-CELL-003`: Panasonic NCR18650B (3400mAh) — **GOOD** (Recovered EV scooter battery)
4. `EV-CELL-004`: Sony Murata US18650VTC6 (3000mAh) — **GOOD** (Recovered EV rickshaw pack)
5. `EV-CELL-005`: Sanyo NCR18650GA (3500mAh) — **FURTHER EVALUATION** (Retired commercial van)
6. `EV-CELL-006`: Samsung SDI INR18650-30Q (3000mAh) — **FURTHER EVALUATION** (Recovered hybrid bus)
7. `EV-CELL-007`: Molicel INR18650-P26A (2600mAh) — **FURTHER EVALUATION** (Recovered e-bike)
8. `EV-CELL-008`: BAK Power 18650-2200 (2200mAh) — **LOW PERFORMANCE** (High-mileage fleet)
9. `EV-CELL-009`: Lishen LR1865SK (2600mAh) — **LOW PERFORMANCE** (Retired buffer unit)
10. `EV-CELL-010`: Unknown Brand 18650 (2000mAh) — **UNSUITABLE** (Thermal run-up / Over-temp stop)

---

## 7. ESP32 Hardware Integration Contract

When the ESP32 hardware is ready, the device connects to the backend over Wi-Fi on your local LAN.

### Local Network Addressing
The backend binds to `0.0.0.0:3000`. Identify your laptop's local LAN IP (e.g. `192.168.1.50`).
The ESP32 firmware should make HTTP POST requests to:
`http://<YOUR_LAN_IP>:3000/api/...`

### Planned Pin Configuration
```text
GPIO4  = DS18B20 OneWire Temperature Data
GPIO21 = INA219 SDA (Voltage / Current)
GPIO22 = INA219 SCL
GPIO23 = IRLZ44N MOSFET Gate (Load Enable)
GPIO18 = Pushbutton START
GPIO19 = Pushbutton STOP
GPIO25 = Blue LED (Testing)
GPIO26 = Green LED (Good Result)
GPIO27 = Red LED (Fault / Unsuitable)
GPIO17 = UART TX → Arduino UNO RX (TFT Display)
```

### ESP32 API Endpoints

#### Batch Measurement Upload (Recommended)
`POST /api/tests/:testId/measurements/batch`
```json
{
  "measurements": [
    { "elapsedSeconds": 1, "voltage": 4.08, "current": 0.81, "temperature": 27.2, "loadEnabled": true },
    { "elapsedSeconds": 2, "voltage": 4.07, "current": 0.82, "temperature": 27.3, "loadEnabled": true }
  ]
}
```

#### Real-Time Hardware Telemetry Endpoint
`POST /api/device/test-data`
```json
{
  "deviceId": "REVOLTCELL-ESP32-001",
  "cellId": "EV-CELL-001",
  "testId": "TEST-0001",
  "elapsedSeconds": 12,
  "voltage": 3.95,
  "current": 0.82,
  "temperature": 28.4,
  "loadEnabled": true
}
```

#### Final Test Completion
`POST /api/tests/:testId/complete`
```json
{
  "finalVoltage": 3.75,
  "minimumVoltage": 3.74,
  "averageCurrent": 0.81,
  "maximumCurrent": 0.83,
  "initialTemperature": 26.0,
  "maximumTemperature": 29.2,
  "testDurationSeconds": 120,
  "stopReason": "COMPLETED"
}
```

---

## 8. Complete REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service and database connectivity status |
| `GET` | `/api/dashboard/summary` | Aggregate counts (tested, good, eval, weak) |
| `GET` | `/api/dashboard/recent-tests` | Recent discharge sessions |
| `GET` | `/api/dashboard/score-distribution`| Triage score distribution buckets |
| `POST`| `/api/cells` | Register new cell |
| `GET` | `/api/cells` | Paginated cell list with search & filter |
| `GET` | `/api/cells/:cellId` | Full cell profile & latest score |
| `PATCH`| `/api/cells/:cellId` | Update metadata |
| `DELETE`| `/api/cells/:cellId` | Soft archive cell |
| `POST`| `/api/tests` | Create new discharge test session |
| `POST`| `/api/tests/:testId/start` | Mark test as running |
| `POST`| `/api/tests/:testId/measurements` | Upload single measurement point |
| `POST`| `/api/tests/:testId/measurements/batch` | Upload batch measurements from ESP32 |
| `POST`| `/api/tests/:testId/complete` | Complete test, compute score & recommendations |
| `POST`| `/api/tests/:testId/stop` | Stop test with reason |
| `GET` | `/api/tests/:testId` | Get test session data & curve |
| `GET` | `/api/cells/:cellId/tests` | Test history for a cell |
| `POST`| `/api/analysis/:testId/generate` | Recalculate analysis for test |
| `GET` | `/api/cells/:cellId/analysis` | Latest analysis for cell |
| `GET` | `/api/cells/:cellId/applications` | Potential second-life applications |
| `GET` | `/api/cells/:cellId/matches` | Similar tested cells in staging pool |
| `GET` | `/api/cells/:cellId/lifecycle` | Chronological chain of custody |
| `POST`| `/api/cells/:cellId/lifecycle` | Add lifecycle milestone |
| `GET` | `/api/cells/:cellId/passport` | Unified Digital Battery Passport data |
| `POST`| `/api/mock/tests/:testId/simulate` | Run mock hardware simulation |
| `POST`| `/api/device/test-data` | Telemetry endpoint for ESP32 |

---

## 9. Switching to PostgreSQL (Production)

The platform defaults to SQLite for zero-config local development. To switch to PostgreSQL:
1. Start the included Docker container:
   ```bash
   cd backend
   docker compose up -d
   ```
2. Update `DATABASE_URL` in `backend/.env`:
   ```env
   DATABASE_URL="postgresql://revoltcell:revoltcell_secret@localhost:5432/revoltcell?schema=public"
   ```
3. Update `provider` in `backend/prisma/schema.prisma` to `"postgresql"` (or copy `backend/prisma/schema.postgresql.prisma`).
4. Run:
   ```bash
   npm run prisma:push
   npm run prisma:seed
   ```
