import { PrismaClient } from '@prisma/client';
import { AnalysisService } from '../src/services/analysisService';
import { ApplicationService } from '../src/services/applicationService';

const prisma = new PrismaClient();

interface SeedCellDef {
  cellId: string;
  manufacturer: string;
  model: string;
  chemistry: string;
  nominalVoltage: number;
  ratedCapacityMah: number;
  source: string;
  manufactureDate: string;
  profile: 'GOOD' | 'FURTHER_EVALUATION' | 'LOW_PERFORMANCE' | 'UNSUITABLE';
  nominalInitialV: number;
  sagDelta: number;
  initialTemp: number;
  tempRiseVal: number;
  stopReason?: string;
}

const seedCells: SeedCellDef[] = [
  {
    cellId: 'EV-CELL-001',
    manufacturer: 'LG Chem',
    model: 'INR18650-HG2',
    chemistry: 'Li-ion',
    nominalVoltage: 3.7,
    ratedCapacityMah: 3000,
    source: 'Recovered Nissan Leaf module',
    manufactureDate: '2021-04-12',
    profile: 'GOOD',
    nominalInitialV: 4.14,
    sagDelta: 0.14,
    initialTemp: 25.2,
    tempRiseVal: 2.8,
  },
  {
    cellId: 'EV-CELL-002',
    manufacturer: 'Samsung SDI',
    model: 'INR18650-25R',
    chemistry: 'Li-ion',
    nominalVoltage: 3.7,
    ratedCapacityMah: 2500,
    source: 'Recovered Tesla Model S pack',
    manufactureDate: '2020-09-18',
    profile: 'GOOD',
    nominalInitialV: 4.16,
    sagDelta: 0.11,
    initialTemp: 24.8,
    tempRiseVal: 2.3,
  },
  {
    cellId: 'EV-CELL-003',
    manufacturer: 'Panasonic',
    model: 'NCR18650B',
    chemistry: 'Li-ion',
    nominalVoltage: 3.7,
    ratedCapacityMah: 3400,
    source: 'Recovered EV scooter battery',
    manufactureDate: '2021-01-10',
    profile: 'GOOD',
    nominalInitialV: 4.12,
    sagDelta: 0.16,
    initialTemp: 25.6,
    tempRiseVal: 3.2,
  },
  {
    cellId: 'EV-CELL-004',
    manufacturer: 'Sony Murata',
    model: 'US18650VTC6',
    chemistry: 'Li-ion',
    nominalVoltage: 3.7,
    ratedCapacityMah: 3000,
    source: 'Recovered EV rickshaw pack',
    manufactureDate: '2021-06-25',
    profile: 'GOOD',
    nominalInitialV: 4.15,
    sagDelta: 0.13,
    initialTemp: 25.0,
    tempRiseVal: 2.7,
  },
  {
    cellId: 'EV-CELL-005',
    manufacturer: 'Sanyo',
    model: 'NCR18650GA',
    chemistry: 'Li-ion',
    nominalVoltage: 3.7,
    ratedCapacityMah: 3500,
    source: 'Retired commercial delivery van',
    manufactureDate: '2019-11-04',
    profile: 'FURTHER_EVALUATION',
    nominalInitialV: 4.10,
    sagDelta: 0.32,
    initialTemp: 26.0,
    tempRiseVal: 4.8,
  },
  {
    cellId: 'EV-CELL-006',
    manufacturer: 'Samsung SDI',
    model: 'INR18650-30Q',
    chemistry: 'Li-ion',
    nominalVoltage: 3.7,
    ratedCapacityMah: 3000,
    source: 'Recovered hybrid bus battery',
    manufactureDate: '2020-03-15',
    profile: 'FURTHER_EVALUATION',
    nominalInitialV: 4.08,
    sagDelta: 0.36,
    initialTemp: 25.8,
    tempRiseVal: 5.4,
  },
  {
    cellId: 'EV-CELL-007',
    manufacturer: 'Molicel',
    model: 'INR18650-P26A',
    chemistry: 'Li-ion',
    nominalVoltage: 3.7,
    ratedCapacityMah: 2600,
    source: 'Recovered e-bike battery',
    manufactureDate: '2021-08-30',
    profile: 'FURTHER_EVALUATION',
    nominalInitialV: 4.11,
    sagDelta: 0.30,
    initialTemp: 25.4,
    tempRiseVal: 4.5,
  },
  {
    cellId: 'EV-CELL-008',
    manufacturer: 'BAK Power',
    model: 'BAK-18650-2200',
    chemistry: 'Li-ion',
    nominalVoltage: 3.7,
    ratedCapacityMah: 2200,
    source: 'High mileage fleet vehicle',
    manufactureDate: '2018-05-19',
    profile: 'LOW_PERFORMANCE',
    nominalInitialV: 4.04,
    sagDelta: 0.54,
    initialTemp: 26.5,
    tempRiseVal: 7.8,
  },
  {
    cellId: 'EV-CELL-009',
    manufacturer: 'Lishen',
    model: 'LR1865SK',
    chemistry: 'Li-ion',
    nominalVoltage: 3.7,
    ratedCapacityMah: 2600,
    source: 'Retired stationary buffer unit',
    manufactureDate: '2019-02-14',
    profile: 'LOW_PERFORMANCE',
    nominalInitialV: 4.02,
    sagDelta: 0.59,
    initialTemp: 26.8,
    tempRiseVal: 8.5,
  },
  {
    cellId: 'EV-CELL-010',
    manufacturer: 'Unknown / Generic',
    model: '18650-Unbranded',
    chemistry: 'Li-ion',
    nominalVoltage: 3.7,
    ratedCapacityMah: 2000,
    source: 'Stored surplus salvaged module',
    manufactureDate: '2017-08-01',
    profile: 'UNSUITABLE',
    nominalInitialV: 4.00,
    sagDelta: 0.95,
    initialTemp: 27.2,
    tempRiseVal: 22.4,
    stopReason: 'OVER_TEMPERATURE',
  },
];

async function main() {
  console.log('Seeding ReVoltCell database...');

  // Clean existing data
  await prisma.testMeasurement.deleteMany();
  await prisma.analysis.deleteMany();
  await prisma.applicationRecommendation.deleteMany();
  await prisma.lifecycleEvent.deleteMany();
  await prisma.test.deleteMany();
  await prisma.cell.deleteMany();

  for (let i = 0; i < seedCells.length; i++) {
    const c = seedCells[i];
    const testId = `TEST-${String(i + 1).padStart(4, '0')}`;

    console.log(`Creating cell ${c.cellId} (${c.manufacturer} ${c.model})...`);

    // 1. Create Cell
    await prisma.cell.create({
      data: {
        cellId: c.cellId,
        manufacturer: c.manufacturer,
        model: c.model,
        chemistry: c.chemistry,
        nominalVoltage: c.nominalVoltage,
        ratedCapacityMah: c.ratedCapacityMah,
        source: c.source,
        manufactureDate: c.manufactureDate,
        status: 'TESTED',
      },
    });

    // 2. Lifecycle History
    await prisma.lifecycleEvent.createMany({
      data: [
        {
          cellId: c.cellId,
          event: 'EV_BATTERY',
          description: `Pack assembled by OEM. Integrated with vehicle management system. Source: ${c.source}`,
          timestamp: new Date(Date.now() - 400 * 24 * 3600 * 1000),
        },
        {
          cellId: c.cellId,
          event: 'RETIRED',
          description: 'Vehicle reached planned warranty cycle / fleet retirement.',
          timestamp: new Date(Date.now() - 45 * 24 * 3600 * 1000),
        },
        {
          cellId: c.cellId,
          event: 'RECOVERED',
          description: 'Disassembled under ESD protocol and cataloged into ReVoltCell staging.',
          timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000),
        },
      ],
    });

    // 3. Create Test & Measurements
    const duration = 120;
    const step = 5;
    const measurementsData = [];
    const stopReason = c.stopReason || 'COMPLETED';

    for (let t = 0; t <= duration; t += step) {
      const progress = t / duration;
      const vSag = t === 0 ? 0 : c.sagDelta * Math.pow(progress, 0.85);
      const v = Number((c.nominalInitialV - vSag).toFixed(3));
      const curr = Number((0.82 + (Math.random() - 0.5) * 0.02).toFixed(3));
      const temp = Number((c.initialTemp + progress * c.tempRiseVal).toFixed(2));

      measurementsData.push({
        testId,
        elapsedSeconds: t,
        voltage: Math.max(2.5, v),
        current: curr,
        temperature: temp,
        loadEnabled: true,
      });
    }

    const initV = measurementsData[0].voltage;
    const finalV = measurementsData[measurementsData.length - 1].voltage;
    const minV = Math.min(...measurementsData.map((m) => m.voltage));
    const avgC = Number(
      (measurementsData.reduce((acc, m) => acc + m.current, 0) / measurementsData.length).toFixed(3)
    );
    const maxC = Math.max(...measurementsData.map((m) => m.current));
    const maxT = Math.max(...measurementsData.map((m) => m.temperature));

    const test = await prisma.test.create({
      data: {
        testId,
        cellId: c.cellId,
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - 2 * 3600 * 1000),
        completedAt: new Date(Date.now() - 2 * 3600 * 1000 + duration * 1000),
        initialVoltage: initV,
        finalVoltage: finalV,
        minimumVoltage: minV,
        averageCurrent: avgC,
        maximumCurrent: maxC,
        initialTemperature: c.initialTemp,
        maximumTemperature: maxT,
        temperatureRise: Number((maxT - c.initialTemp).toFixed(2)),
        testDurationSeconds: duration,
        loadResistanceOhms: 5.0,
        loadPowerRatingWatts: 10.0,
        stopReason,
      },
    });

    await prisma.testMeasurement.createMany({ data: measurementsData });

    // 4. Calculate Analysis
    const analysisOutput = AnalysisService.calculateAnalysis({
      test,
      measurements: measurementsData,
      cell: {
        nominalVoltage: c.nominalVoltage,
        ratedCapacityMah: c.ratedCapacityMah,
        chemistry: c.chemistry,
      },
    });

    await prisma.analysis.create({
      data: {
        testId,
        cellId: c.cellId,
        score: analysisOutput.score,
        electricalScore: analysisOutput.electricalScore,
        thermalScore: analysisOutput.thermalScore,
        stabilityScore: analysisOutput.stabilityScore,
        classification: analysisOutput.classification,
        voltageSag: analysisOutput.voltageSag,
        temperatureRise: analysisOutput.temperatureRise,
        recommendation: analysisOutput.recommendation,
      },
    });

    // 5. Calculate Applications
    const appMatches = ApplicationService.evaluateApplications(
      analysisOutput.score,
      analysisOutput.classification,
      analysisOutput.voltageSag,
      analysisOutput.temperatureRise
    );

    await prisma.applicationRecommendation.createMany({
      data: appMatches.map((app) => ({
        cellId: c.cellId,
        testId,
        application: app.application,
        suitability: app.suitability,
        reason: app.reason,
      })),
    });

    // 6. Append Post-test Lifecycle events
    await prisma.lifecycleEvent.createMany({
      data: [
        {
          cellId: c.cellId,
          event: 'TESTED',
          description: `Discharge screening completed. Score: ${analysisOutput.score}/100. Stop reason: ${stopReason}.`,
          timestamp: new Date(Date.now() - 2 * 3600 * 1000 + duration * 1000),
        },
        {
          cellId: c.cellId,
          event: 'SECOND_LIFE_EVALUATION',
          description: `Triage evaluation: ${analysisOutput.classification}. ${analysisOutput.recommendation}`,
          timestamp: new Date(Date.now() - 1 * 3600 * 1000),
        },
        {
          cellId: c.cellId,
          event:
            analysisOutput.classification === 'UNSUITABLE'
              ? 'RECYCLE'
              : 'SECOND_LIFE_CANDIDATE',
          description:
            analysisOutput.classification === 'UNSUITABLE'
              ? 'Marked for hydrometallurgical recycling and raw material recovery.'
              : `Qualified as candidate for ${appMatches[0]?.application || 'secondary energy storage'}.`,
          timestamp: new Date(),
        },
      ],
    });
  }

  console.log('Seeding completed successfully with 10 detailed cells!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
