import http from 'http';
import { createApp } from '../app';
import { prisma } from '../config/prisma';

async function runTests() {
  console.log('--- Running ReVoltCell Backend API Tests ---');
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  const request = async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const json: any = await res.json();
    return { status: res.status, body: json };
  };

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, name: string, details?: any) => {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`, details || '');
      failed++;
    }
  };

  try {
    // 1. Health check
    const health = await request('/api/health');
    assert(health.status === 200 && health.body.database === 'CONNECTED', 'GET /api/health returns 200 and CONNECTED');

    // 2. Dashboard summary
    const dashboard = await request('/api/dashboard/summary');
    assert(dashboard.status === 200 && dashboard.body.data.totalCells >= 10, 'GET /api/dashboard/summary has >= 10 cells');

    // 3. Score distribution
    const scoreDist = await request('/api/dashboard/score-distribution');
    assert(scoreDist.status === 200 && Array.isArray(scoreDist.body.data.distribution), 'GET /api/dashboard/score-distribution returns distribution');

    // 4. List cells
    const cellList = await request('/api/cells?limit=5');
    assert(cellList.status === 200 && cellList.body.data.length === 5, 'GET /api/cells returns paginated cells');

    // 5. Create new cell
    const testCellId = `TEST-CELL-${Date.now()}`;
    const createCell = await request('/api/cells', {
      method: 'POST',
      body: JSON.stringify({
        cellId: testCellId,
        manufacturer: 'TestMfr',
        model: '18650-T',
        chemistry: 'Li-ion',
        nominalVoltage: 3.7,
        ratedCapacityMah: 2500,
        source: 'Lab Test Sample',
      }),
    });
    assert(createCell.status === 201 && createCell.body.data.cellId === testCellId, 'POST /api/cells creates cell');

    // 6. Get cell details
    const cellDetails = await request(`/api/cells/${testCellId}`);
    assert(cellDetails.status === 200 && cellDetails.body.data.cell.cellId === testCellId, 'GET /api/cells/:cellId returns details');

    // 7. Create test
    const createTest = await request('/api/tests', {
      method: 'POST',
      body: JSON.stringify({
        cellId: testCellId,
        loadResistanceOhms: 5.0,
        loadPowerRatingWatts: 10.0,
      }),
    });
    assert(createTest.status === 201 && createTest.body.data.testId, 'POST /api/tests creates test session');
    const newTestId = createTest.body.data.testId;

    // 8. Start test
    const startTest = await request(`/api/tests/${newTestId}/start`, { method: 'POST' });
    assert(startTest.status === 200 && startTest.body.data.status === 'RUNNING', 'POST /api/tests/:testId/start marks test RUNNING');

    // 9. Upload single measurement
    const singleM = await request(`/api/tests/${newTestId}/measurements`, {
      method: 'POST',
      body: JSON.stringify({
        elapsedSeconds: 0,
        voltage: 4.15,
        current: 0.82,
        temperature: 25.0,
        loadEnabled: true,
      }),
    });
    assert(singleM.status === 201 && singleM.body.data.voltage === 4.15, 'POST /api/tests/:testId/measurements saves point');

    // 10. Upload batch measurements
    const batchM = await request(`/api/tests/${newTestId}/measurements/batch`, {
      method: 'POST',
      body: JSON.stringify({
        measurements: [
          { elapsedSeconds: 10, voltage: 4.05, current: 0.81, temperature: 25.4, loadEnabled: true },
          { elapsedSeconds: 20, voltage: 4.02, current: 0.81, temperature: 25.8, loadEnabled: true },
          { elapsedSeconds: 30, voltage: 3.98, current: 0.80, temperature: 26.1, loadEnabled: true },
        ],
      }),
    });
    assert(batchM.status === 201 && batchM.body.data.insertedCount === 3, 'POST /api/tests/:testId/measurements/batch saves array');

    // 11. Complete test
    const completeTest = await request(`/api/tests/${newTestId}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        finalVoltage: 3.98,
        minimumVoltage: 3.98,
        averageCurrent: 0.81,
        maximumCurrent: 0.82,
        initialTemperature: 25.0,
        maximumTemperature: 26.1,
        testDurationSeconds: 30,
        stopReason: 'COMPLETED',
      }),
    });
    assert(completeTest.status === 200 && completeTest.body.data.score > 0, 'POST /api/tests/:testId/complete calculates score & analysis');

    // 12. Get cell analysis
    const analysis = await request(`/api/cells/${testCellId}/analysis`);
    assert(analysis.status === 200 && analysis.body.data.score > 0, 'GET /api/cells/:cellId/analysis returns analysis');

    // 13. Get cell applications
    const apps = await request(`/api/cells/${testCellId}/applications`);
    assert(apps.status === 200 && apps.body.data.primary !== null, 'GET /api/cells/:cellId/applications returns primary app');

    // 14. Get cell matches
    const matches = await request(`/api/cells/${testCellId}/matches`);
    assert(matches.status === 200 && Array.isArray(matches.body.data.matches), 'GET /api/cells/:cellId/matches returns similar cells');

    // 15. Get cell lifecycle
    const lifecycle = await request(`/api/cells/${testCellId}/lifecycle`);
    assert(lifecycle.status === 200 && lifecycle.body.data.length >= 3, 'GET /api/cells/:cellId/lifecycle returns timeline');

    // 16. Get passport
    const passport = await request(`/api/cells/${testCellId}/passport`);
    assert(passport.status === 200 && passport.body.data.batteryId === testCellId && passport.body.data.passportUrl, 'GET /api/cells/:cellId/passport returns unified passport');

    // 17. Mock simulation test
    const simTestRes = await request('/api/tests', {
      method: 'POST',
      body: JSON.stringify({ cellId: testCellId }),
    });
    const simTestId = simTestRes.body.data.testId;
    const simRes = await request(`/api/mock/tests/${simTestId}/simulate`, {
      method: 'POST',
      body: JSON.stringify({ profile: 'GOOD' }),
    });
    assert(simRes.status === 200 && simRes.body.data.measurementsCount > 20, 'POST /api/mock/tests/:testId/simulate generates curve');

    // 18. Server QR endpoint tests
    const qrRes = await request(`/api/cells/${testCellId}/qr`);
    assert(qrRes.status === 200 && qrRes.body.data.qrSvg && qrRes.body.data.qrDataUrl, 'GET /api/cells/:cellId/qr returns SVG and DataURL');

    const qrSvgRes = await fetch(`${baseUrl}/api/cells/${testCellId}/qr?format=svg`);
    const svgText = await qrSvgRes.text();
    assert(qrSvgRes.status === 200 && svgText.includes('<svg'), 'GET /api/cells/:cellId/qr?format=svg returns raw SVG');

    // 19. Clean up test cell
    await prisma.testMeasurement.deleteMany({ where: { test: { cellId: testCellId } } });
    await prisma.analysis.deleteMany({ where: { cellId: testCellId } });
    await prisma.applicationRecommendation.deleteMany({ where: { cellId: testCellId } });
    await prisma.lifecycleEvent.deleteMany({ where: { cellId: testCellId } });
    await prisma.test.deleteMany({ where: { cellId: testCellId } });
    await prisma.cell.delete({ where: { cellId: testCellId } });

    console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  } finally {
    server.close();
    await prisma.$disconnect();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
