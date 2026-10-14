import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('Clearing all stored dummy data from database...');

  const deletedMeasurements = await prisma.testMeasurement.deleteMany({});
  console.log(`Deleted ${deletedMeasurements.count} test measurements.`);

  const deletedAnalyses = await prisma.analysis.deleteMany({});
  console.log(`Deleted ${deletedAnalyses.count} analyses.`);

  const deletedApps = await prisma.applicationRecommendation.deleteMany({});
  console.log(`Deleted ${deletedApps.count} application recommendations.`);

  const deletedEvents = await prisma.lifecycleEvent.deleteMany({});
  console.log(`Deleted ${deletedEvents.count} lifecycle events.`);

  const deletedTests = await prisma.test.deleteMany({});
  console.log(`Deleted ${deletedTests.count} tests.`);

  const deletedCells = await prisma.cell.deleteMany({});
  console.log(`Deleted ${deletedCells.count} cells.`);

  console.log('Database successfully cleaned! Ready for hardware testing.');
}

clearDatabase()
  .catch((e) => {
    console.error('Error clearing database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
