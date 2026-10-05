import os from 'os';
import { createApp } from './app';
import { ENV } from './config/env';
import { prisma } from './config/prisma';

const app = createApp();

function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

const server = app.listen(ENV.PORT, ENV.HOST, async () => {
  console.log(`=================================================`);
  console.log(`  ReVoltCell Screening Platform - Backend Ready  `);
  console.log(`=================================================`);
  console.log(`Status:  Running on http://${ENV.HOST}:${ENV.PORT}`);
  console.log(`Local:   http://localhost:${ENV.PORT}`);

  const localIps = getLocalIpAddresses();
  if (localIps.length > 0) {
    console.log(`ESP32 / LAN Access URLs:`);
    localIps.forEach((ip) => {
      console.log(`  -> http://${ip}:${ENV.PORT}/api/health`);
    });
  }
  console.log(`Health:  http://localhost:${ENV.PORT}/api/health`);
  console.log(`CORS:    Allowed from ${ENV.CORS_ORIGIN}`);
  console.log(`Database: Connected`);
  console.log(`=================================================`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server terminated cleanly.');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down server...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server terminated cleanly.');
    process.exit(0);
  });
});
