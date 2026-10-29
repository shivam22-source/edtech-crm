import pg from 'pg';
import type { Config } from './config.js';

export function createPool(config: Pick<Config, 'DATABASE_URL' | 'DB_POOL_MAX'>): pg.Pool {
  return new pg.Pool({
    connectionString: config.DATABASE_URL,
    max: config.DB_POOL_MAX,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}
