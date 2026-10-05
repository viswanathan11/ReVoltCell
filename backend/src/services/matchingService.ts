import { prisma } from '../config/prisma';

export class MatchingService {
  public static async findMatches(cellId: string, limit = 5) {
    // Get target cell and its latest analysis
    const targetCell = await prisma.cell.findUnique({
      where: { cellId },
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!targetCell) {
      return null;
    }

    const targetAnalysis = targetCell.analyses[0];
    if (!targetAnalysis) {
      return {
        cellId: targetCell.cellId,
        score: null,
        classification: null,
        matches: [],
        disclaimer: 'Similarity does not guarantee pack compatibility or safety.',
      };
    }

    // Find all other cells with analysis and matching chemistry/nominalVoltage
    const otherCells = await prisma.cell.findMany({
      where: {
        cellId: { not: cellId },
        status: { in: ['TESTED', 'REGISTERED'] },
        analyses: { some: {} },
      },
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const candidates = otherCells
      .map((c) => {
        const a = c.analyses[0];
        if (!a) return null;

        const scoreDiff = Math.abs(a.score - targetAnalysis.score);
        const sagDiff = Math.abs(a.voltageSag - targetAnalysis.voltageSag);
        const tempDiff = Math.abs(a.temperatureRise - targetAnalysis.temperatureRise);
        const chemistryMatch = c.chemistry.toLowerCase() === targetCell.chemistry.toLowerCase();
        const voltageMatch = Math.abs(c.nominalVoltage - targetCell.nominalVoltage) < 0.2;

        // Weighted distance metric
        const distance = scoreDiff * 1.0 + sagDiff * 20.0 + tempDiff * 2.0 + (chemistryMatch ? 0 : 50) + (voltageMatch ? 0 : 30);

        return {
          cellId: c.cellId,
          score: a.score,
          scoreDifference: scoreDiff,
          classification: a.classification,
          chemistry: c.chemistry,
          nominalVoltage: c.nominalVoltage,
          voltageSag: a.voltageSag,
          temperatureRise: a.temperatureRise,
          distance,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    // Sort by distance (most similar first)
    candidates.sort((a, b) => a.distance - b.distance);

    const matches = candidates.slice(0, limit).map(({ distance, ...rest }) => rest);

    return {
      cellId: targetCell.cellId,
      score: targetAnalysis.score,
      classification: targetAnalysis.classification,
      chemistry: targetCell.chemistry,
      nominalVoltage: targetCell.nominalVoltage,
      voltageSag: targetAnalysis.voltageSag,
      temperatureRise: targetAnalysis.temperatureRise,
      matches,
      disclaimer: 'Similarity does not guarantee pack compatibility or safety. Certified capacity and impedance matching must be performed before assembling cells into packs.',
    };
  }
}
