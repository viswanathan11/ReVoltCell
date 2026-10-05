import { prisma } from '../config/prisma';
import { ENV } from '../config/env';
import { MatchingService } from './matchingService';

export class PassportService {
  public static async getPassportData(cellId: string) {
    const cell = await prisma.cell.findUnique({
      where: { cellId },
      include: {
        tests: {
          orderBy: { createdAt: 'desc' },
          include: {
            analysis: true,
            applications: true,
            measurements: {
              orderBy: { elapsedSeconds: 'asc' },
            },
          },
        },
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        applications: {
          orderBy: { createdAt: 'desc' },
        },
        lifecycleEvents: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!cell) {
      return null;
    }

    const latestTest = cell.tests[0] || null;
    const latestAnalysis = cell.analyses[0] || latestTest?.analysis || null;
    const applications = cell.applications.length > 0 ? cell.applications : latestTest?.applications || [];
    const latestMeasurements = latestTest?.measurements || [];

    const matchesResult = await MatchingService.findMatches(cellId, 4);

    const passportUrl = `${ENV.PASSPORT_BASE_URL}/${cell.cellId}`;

    return {
      batteryId: cell.cellId,
      cell: {
        id: cell.id,
        cellId: cell.cellId,
        manufacturer: cell.manufacturer,
        model: cell.model,
        chemistry: cell.chemistry,
        nominalVoltage: cell.nominalVoltage,
        ratedCapacityMah: cell.ratedCapacityMah,
        source: cell.source,
        manufactureDate: cell.manufactureDate,
        status: cell.status,
        createdAt: cell.createdAt,
        updatedAt: cell.updatedAt,
      },
      latestTest: latestTest
        ? {
            testId: latestTest.testId,
            status: latestTest.status,
            startedAt: latestTest.startedAt,
            completedAt: latestTest.completedAt,
            initialVoltage: latestTest.initialVoltage,
            finalVoltage: latestTest.finalVoltage,
            minimumVoltage: latestTest.minimumVoltage,
            averageCurrent: latestTest.averageCurrent,
            maximumCurrent: latestTest.maximumCurrent,
            initialTemperature: latestTest.initialTemperature,
            maximumTemperature: latestTest.maximumTemperature,
            temperatureRise: latestTest.temperatureRise,
            testDurationSeconds: latestTest.testDurationSeconds,
            stopReason: latestTest.stopReason,
            loadResistanceOhms: latestTest.loadResistanceOhms,
            loadPowerRatingWatts: latestTest.loadPowerRatingWatts,
          }
        : null,
      latestMeasurements,
      latestAnalysis: latestAnalysis
        ? {
            score: latestAnalysis.score,
            electricalScore: latestAnalysis.electricalScore,
            thermalScore: latestAnalysis.thermalScore,
            stabilityScore: latestAnalysis.stabilityScore,
            classification: latestAnalysis.classification,
            voltageSag: latestAnalysis.voltageSag,
            temperatureRise: latestAnalysis.temperatureRise,
            recommendation: latestAnalysis.recommendation,
            createdAt: latestAnalysis.createdAt,
          }
        : null,
      prototypeScore: latestAnalysis?.score ?? null,
      classification: latestAnalysis?.classification ?? 'UNTESTED',
      potentialApplications: applications.map((app) => ({
        application: app.application,
        suitability: app.suitability,
        reason: app.reason,
      })),
      matches: matchesResult?.matches || [],
      lifecycle: cell.lifecycleEvents.map((evt) => ({
        id: evt.id,
        event: evt.event,
        timestamp: evt.timestamp,
        description: evt.description,
      })),
      testHistory: cell.tests.map((t) => ({
        testId: t.testId,
        status: t.status,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
        score: t.analysis?.score ?? null,
        classification: t.analysis?.classification ?? null,
        stopReason: t.stopReason,
      })),
      passportUrl,
      createdDate: cell.createdAt,
      updatedDate: cell.updatedAt,
      disclaimer:
        'ReVoltCell provides rapid preliminary screening scores for research and prototype repurposing triage. This does not replace manufacturer testing or certified BMS state-of-health diagnostics.',
    };
  }
}
