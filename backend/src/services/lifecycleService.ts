import { prisma } from '../config/prisma';

export class LifecycleService {
  public static async addEvent(cellId: string, event: string, description: string) {
    return prisma.lifecycleEvent.create({
      data: {
        cellId,
        event,
        description,
      },
    });
  }

  public static async getLifecycle(cellId: string) {
    return prisma.lifecycleEvent.findMany({
      where: { cellId },
      orderBy: { timestamp: 'asc' },
    });
  }

  public static async initializeCellLifecycle(cellId: string, source: string) {
    await prisma.lifecycleEvent.createMany({
      data: [
        {
          cellId,
          event: 'EV_BATTERY',
          description: `Cell manufactured and deployed in original application pack. Source: ${source}`,
          timestamp: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // ~1 year ago
        },
        {
          cellId,
          event: 'RETIRED',
          description: 'Module retired at end of initial vehicle operational service life.',
          timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // ~30 days ago
        },
        {
          cellId,
          event: 'RECOVERED',
          description: 'De-packaged and registered into ReVoltCell screening system.',
          timestamp: new Date(),
        },
      ],
    });
  }
}
