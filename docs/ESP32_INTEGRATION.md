# ReVoltCell — ESP32 Hardware Integration Contract & Firmware Specification

This document defines the interface specification between the physical ESP32 screening test jig (INA219 current/voltage sensor + DS18B20 digital temperature probe + IRLZ44N discharge MOSFET load) and the ReVoltCell backend API.

---

## 1. Architectural Overview & Workflow Lifecycle

```text
  ┌──────────────────┐               ┌────────────────────────┐              ┌───────────────────────┐
  │  Operator / UI   │               │   ReVoltCell Backend   │              │   ESP32 Test Rig      │
  └────────┬─────────┘               └───────────┬────────────┘              └───────────┬───────────┘
           │                                     │                                       │
           │ 1. Select Cell & Launch Live Test   │                                       │
           │────────────────────────────────────>│                                       │
           │    Status set to RUNNING            │                                       │
           │    testId generated (e.g. TEST-0001)│                                       │
           │                                     │                                       │
           │                                     │ 2. Operator inputs testId or auto-sync│
           │                                     │<······································│
           │                                     │                                       │
           │                                     │ 3. Periodic Telemetry (Every 1-5 sec) │
           │                                     │<──────────────────────────────────────│
           │                                     │    POST /api/device/test-data         │
           │                                     │    (Voltage, Current, Temp, Time)     │
           │                                     │                                       │
           │ 4. Live UI Polling (HUD & Curves)   │                                       │
           │<────────────────────────────────────│                                       │
           │                                     │ 5. Discharge Complete / Cutoff Stop   │
           │                                     │<──────────────────────────────────────│
           │                                     │    POST /api/device/test-complete     │
           │                                     │                                       │
           │                                     │ 6. Automated Pipeline Execution:      │
           │                                     │    - Analysis scoring (0-100)         │
           │                                     │    - SOH triage classification        │
           │                                     │    - Application matching             │
           │                                     │    - Immutable lifecycle event        │
           │                                     │                                       │
           │ 7. Displays final passport/results  │                                       │
           │<────────────────────────────────────│                                       │
```

---

## 2. Network & Addressing

- **Protocol**: HTTP/1.1 REST JSON over standard Wi-Fi (802.11 b/g/n 2.4 GHz).
- **Backend Host Binding**: The server binds to `0.0.0.0:3000`.
- **Target Base URL**: `http://<BACKEND_LAN_IP>:3000/api` (e.g. `http://192.168.1.50:3000/api`).
- **Headers**:
  ```http
  Content-Type: application/json
  X-Device-Id: REVOLTCELL-ESP32-001
  ```

---

## 3. Session Identification & Obtaining `testId`

1. **How `testId` is Created**:
   - The test session is initiated in the ReVoltCell dashboard at `/test/new`.
   - The backend creates the test record (`testId` format: `TEST-0001`, `TEST-0002`...) and immediately marks it as `RUNNING`.
   - The cell status transitions to `TESTING`.

2. **How the ESP32 Obtains `testId`**:
   - **Method A (Standard Demonstration)**: The operator views the `testId` on screen (e.g., `TEST-0001`) and enters it via Serial Monitor or a rotary dial on the hardware rig, or sets it in `config.h`.
   - **Method B (Future BLE/Serial Provisioning)**: The web UI sends the `testId` to the ESP32 over WebSerial / WebBluetooth.
   - **Persistence**: The ESP32 must retain `testId` in RAM or EEPROM throughout the test cycle until `POST /api/device/test-complete` succeeds.

---

## 4. Measurement Telemetry Ingestion Endpoint

### Endpoint
`POST /api/device/test-data`

### Frequency
Send readings every **1.0 to 5.0 seconds** during active resistive discharge.

### Required Request Payload
```json
{
  "deviceId": "REVOLTCELL-ESP32-001",
  "cellId": "EV-CELL-001",
  "testId": "TEST-0001",
  "elapsedSeconds": 15,
  "voltage": 4.085,
  "current": 0.812,
  "temperature": 26.4,
  "loadEnabled": true
}
```

### Field Definitions & Typing
| Field | Type | Required | Description / Constraints |
| :--- | :--- | :--- | :--- |
| `deviceId` | String | No | Identifier of the test fixture (default: `'REVOLTCELL-ESP32-001'`). |
| `cellId` | String | **Yes** | Battery ID being tested (must match the cell assigned to `testId`). |
| `testId` | String | **Yes** | Active test identifier (e.g. `'TEST-0001'`). |
| `elapsedSeconds` | Number | **Yes** | Integer or float seconds since discharge started (`>= 0`). |
| `voltage` | Number | **Yes** | INA219 bus voltage in Volts (`0.0 <= voltage <= 30.0`). |
| `current` | Number | **Yes** | INA219 load current in Amperes (`0.0 <= current <= 20.0`). |
| `temperature` | Number | **Yes** | DS18B20 cell skin temperature in °C (`-30.0 <= temp <= 150.0`). |
| `loadEnabled` | Boolean | No | MOSFET gate state (`true` if discharge load is active, default: `true`). |
| `timestamp` | String | No | Optional ISO 8601 timestamp (e.g., `"2026-10-13T17:15:00Z"`). |

### Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "received": true,
    "deviceId": "REVOLTCELL-ESP32-001",
    "testId": "TEST-0001",
    "cellId": "EV-CELL-001",
    "measurementId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "elapsedSeconds": 15,
    "voltage": 4.085,
    "current": 0.812,
    "temperature": 26.4
  }
}
```

### Error Responses
- `400 Bad Request` (`TEST_NOT_RUNNING`): The test is not in `RUNNING` status (already completed, stopped, or pending). The firmware must immediately disable the MOSFET load.
- `400 Bad Request` (`CELL_TEST_MISMATCH`): The `cellId` provided does not match the cell assigned to `testId`.
- `404 Not Found` (`TEST_NOT_FOUND`): The provided `testId` does not exist in the database.
- `422 Unprocessable Entity` (`VALIDATION_ERROR`): Missing required fields, negative values, or out-of-range sensor readings.

---

## 5. Device Completion Endpoint

When the discharge finishes (cutoff voltage reached, time limit elapsed, thermal alarm triggered, or aborted), the ESP32 must post to the completion endpoint.

### Endpoint
`POST /api/device/test-complete`

### Request Payload
```json
{
  "deviceId": "REVOLTCELL-ESP32-001",
  "testId": "TEST-0001",
  "cellId": "EV-CELL-001",
  "stopReason": "COMPLETED",
  "testDurationSeconds": 120
}
```

### Supported `stopReason` Values
| Outcome Reason | Firmware Trigger Condition | Resulting Test Status | Classification Impact |
| :--- | :--- | :--- | :--- |
| `COMPLETED` | Normal completion criteria met (cut-off reached or full duration finished safely). | `COMPLETED` | Evaluated based on actual performance (can achieve `GOOD`). |
| `LOW_VOLTAGE` | Premature drop below low cutoff limit (e.g., `< 2.8V` or `< 3.0V`). | `COMPLETED` | Electrical score penalized; cannot achieve `GOOD`. |
| `OVER_TEMPERATURE` | Skin temperature exceeded safe ceiling (`> 48°C` or rapid rise). | `FAILED` | Strictly marked `UNSUITABLE` / `RECYCLE`; thermal hazard flagged. |
| `USER_STOP` | Physical stop button pressed on fixture. | `STOPPED` | Marked incomplete; requires `RETEST`; cannot achieve `GOOD`. |
| `TIMEOUT` | Maximum session timer expired before test completed. | `STOPPED` | Marked incomplete; requires `RETEST`; cannot achieve `GOOD`. |
| `ERROR` | Hardware error, sensor communication failure, or load failure. | `FAILED` | Marked `UNSUITABLE` / `FAILED`; invalid data. |

### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "received": true,
    "deviceId": "REVOLTCELL-ESP32-001",
    "testId": "TEST-0001",
    "cellId": "EV-CELL-001",
    "status": "COMPLETED",
    "stopReason": "COMPLETED",
    "score": 88,
    "classification": "GOOD",
    "summary": {
      "initialVoltage": 4.15,
      "finalVoltage": 3.98,
      "minimumVoltage": 3.98,
      "averageCurrent": 0.81,
      "maximumCurrent": 0.82,
      "initialTemperature": 25.0,
      "maximumTemperature": 27.5,
      "temperatureRise": 2.5,
      "testDurationSeconds": 120
    },
    "analysis": {
      "id": "...",
      "score": 88,
      "electricalScore": 36,
      "thermalScore": 27,
      "stabilityScore": 25,
      "classification": "GOOD",
      "voltageSag": 0.17,
      "temperatureRise": 2.5,
      "recommendation": "Cell exhibited strong discharge stability, minimal voltage sag, and low thermal rise."
    },
    "applications": [
      {
        "application": "LOW_POWER_STORAGE",
        "suitability": "HIGH",
        "reason": "Stable voltage behavior and acceptable thermal response."
      }
    ],
    "idempotent": false
  }
}
```

---

## 6. Firmware Reliability, Retries & Edge Cases

1. **Zero Measurements Guard**:
   - The backend strictly rejects completion requests if zero measurements were logged (`400 NO_MEASUREMENTS`).
   - The firmware must ensure at least one valid measurement was successfully transmitted before requesting completion.

2. **Idempotency & Duplicate Requests**:
   - If Wi-Fi packets drop and the ESP32 re-transmits `POST /api/device/test-complete`, the backend handles it idempotently:
   - Returns HTTP 200 with `idempotent: true` and the existing final calculation.
   - It will **not** duplicate lifecycle events, recommendations, or database analyses.

3. **Network Disconnection & Retries**:
   - If an HTTP POST fails with a network timeout, store the current measurement in a local ring buffer (ESP32 RAM has capacity for hundreds of points).
   - Re-try connection with exponential backoff (e.g. 500ms, 1s, 2s).
   - Continue logging points locally so physical cell safety monitoring (cutoff & over-temperature) remains fully operational even if Wi-Fi is temporarily lost.

4. **Safety Hardware Interlock**:
   - The ESP32 firmware must always independently control the MOSFET gate:
   - If `temperature > 48.0°C`, the firmware MUST de-energize the MOSFET gate immediately in hardware, and then send `stopReason: "OVER_TEMPERATURE"`.
   - If `voltage < 2.8V`, the firmware MUST de-energize the MOSFET gate immediately to protect against cell reversal, and send `stopReason: "LOW_VOLTAGE"`.

---

## 7. Firmware Configuration & Confirmation Checklist

Please confirm with the hardware engineering team:
- [ ] Sensor calibration: INA219 calibration register set to match 5Ω / 10W load range (0–2A, 0–5V).
- [ ] Cutoff thresholds: Low-voltage cutoff default: `2.80V` (or cell manufacturer specification).
- [ ] Temperature threshold: Over-temp cutoff ceiling: `48.0°C` via DS18B20.
- [ ] Sampling cadence: `1000ms` default reporting period.
- [ ] Wi-Fi reconnect loop: Auto-reconnect enabled in background FreeRTOS task.
