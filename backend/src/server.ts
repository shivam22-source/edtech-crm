import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createPool } from './db.js';

const config = loadConfig();
const pool = createPool(config);
const app = createApp(config, pool);

const server = app.listen(config.PORT, () => {
  console.log(JSON.stringify({ level: 'info', msg: 'listening', port: config.PORT }));
});

function shutdown(signal: string): void {
  console.log(JSON.stringify({ level: 'info', msg: 'shutting down', signal }));
  server.close(() => {
    pool.end().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
