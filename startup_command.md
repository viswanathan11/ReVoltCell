# ReVoltCell — Startup Commands & Execution Guide

This document outlines all startup, setup, testing, and operational commands for running the ReVoltCell platform.

---

## 1. Quick Start (From Project Root)

If dependencies are already installed and the database initialized:

### Start Backend and Frontend
Open two terminals in the root `ReVoltCell` directory:

```bash
# Terminal 1 — Start Backend API (Port 3000)
npm run dev:backend

# Terminal 2 — Start Frontend Application (Port 5173)
npm run dev:frontend
```

---

## 2. Full Setup from Scratch (Initial Run)

Run these steps when setting up the project on a new machine or after a clean clone.

### Step 2.1: Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Push database schema & initialize SQLite database (dev.db)
npm run prisma:push

# Generate Prisma Client (if needed)
npm run prisma:generate

# Populate database with 10 seed cells & test sessions
npm run prisma:seed

# Start backend in development mode (with hot-reload via tsx)
npm run dev
```

> **Backend is running at:** [http://localhost:3000](http://localhost:3000)  
> **Health Check Endpoint:** [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

### Step 2.2: Frontend Setup
In a new terminal:
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start frontend development server (Vite)
npm run dev
```

> **Frontend is running at:** [http://localhost:5173](http://localhost:5173)

---

## 3. Database Management Commands

Run these inside `backend/` or use root scripts where indicated:

| Action | Root Command | Backend Directory Command |
| :--- | :--- | :--- |
| **Push Schema to SQLite** | — | `npm run prisma:push` |
| **Generate Prisma Client** | — | `npm run prisma:generate` |
| **Seed Test Cells** | `npm run seed` | `npm run prisma:seed` |
| **Open Prisma Studio (GUI)** | — | `npx prisma studio` |

---

## 4. Testing & Verification Commands

### Run Integration Test Suite (19 API Endpoints)
```bash
# From project root:
npm run test:backend

# Or from backend directory:
cd backend
npm test
```

### Quick Health Check Verification
```bash
# Using curl (Bash / PowerShell)
curl http://localhost:3000/api/health

# Or using PowerShell
Invoke-RestMethod -Uri http://localhost:3000/api/health
```

---

## 5. ESP32 Hardware Device Telemetry & Automated Completion

When testing with physical ESP32 or simulating device calls directly:

### 5.1 Send Telemetry Reading
```bash
curl -X POST http://localhost:3000/api/device/test-data \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "REVOLTCELL-ESP32-001",
    "cellId": "EV-CELL-001",
    "testId": "TEST-0001",
    "elapsedSeconds": 15,
    "voltage": 4.10,
    "current": 0.81,
    "temperature": 26.2,
    "loadEnabled": true
  }'
```

### 5.2 Send Completion Signal (Triggers Automated Analysis & Triage)
```bash
curl -X POST http://localhost:3000/api/device/test-complete \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "REVOLTCELL-ESP32-001",
    "cellId": "EV-CELL-001",
    "testId": "TEST-0001",
    "stopReason": "COMPLETED",
    "testDurationSeconds": 120
  }'
```

---

## 6. Mock Hardware Simulation

Simulate cell test sessions without physical ESP32 hardware connected.

### Via cURL
```bash
# Run simulation with 'GOOD' profile (profiles: GOOD, WEAK, HOT, UNSTABLE)
curl -X POST http://localhost:3000/api/mock/tests/TEST-0001/simulate \
  -H "Content-Type: application/json" \
  -d '{"profile": "GOOD"}'
```

### Via PowerShell
```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/mock/tests/TEST-0001/simulate" `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"profile": "GOOD"}'
```

---

## 6. Production Build & Execution

### Backend Production Build
```bash
# From backend directory
cd backend
npm run build
npm start
```

### Frontend Production Build
```bash
# From frontend directory
cd frontend
npm run build
npm run preview
```

---

## 7. Ports & URL Reference

| Service | Protocol / Port | Local URL |
| :--- | :--- | :--- |
| **Frontend UI** | HTTP / 5173 | [http://localhost:5173](http://localhost:5173) |
| **Backend REST API** | HTTP / 3000 | [http://localhost:3000/api](http://localhost:3000/api) |
| **Health Check** | HTTP / 3000 | [http://localhost:3000/api/health](http://localhost:3000/api/health) |
| **Prisma Studio (Optional)** | HTTP / 5555 | [http://localhost:5555](http://localhost:5555) |

---

## 8. Common Troubleshooting

- **Port 3000 or 5173 already in use:**
  - Check running processes:
    - Windows PowerShell: `Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess`
    - Terminate task: `Stop-Process -Id <PID> -Force`
- **Database schema out of sync:**
  - Run `npm run prisma:push` inside `backend/`.
- **Prisma Client not recognized:**
  - Run `npm run prisma:generate` inside `backend/`.
