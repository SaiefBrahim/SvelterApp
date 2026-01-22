// Prisma 7 client with Driver Adapter
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { env } from '$env/dynamic/private';

const DATABASE_URL = env.DATABASE_URL || '';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    pool: pg.Pool | undefined;
};

// Create a pool if it doesn't exist
let poolConfig: any;

if (!DATABASE_URL) {
    poolConfig = { connectionString: '' };
} else {
    try {
        const url = new URL(DATABASE_URL);
        const decodedPassword = decodeURIComponent(url.password);

        poolConfig = {
            user: url.username ? decodeURIComponent(url.username) : undefined,
            password: String(decodedPassword),
            host: url.hostname,
            port: url.port ? parseInt(url.port) : 5432,
            database: url.pathname.split('/')[1]
        };

        if (url.searchParams.get('sslmode') === 'require') {
            poolConfig.ssl = { rejectUnauthorized: false };
        }
    } catch (e) {
        poolConfig = { connectionString: DATABASE_URL };
    }
}

const pool = globalForPrisma.pool ?? new pg.Pool(poolConfig);

// Re-enable cache for future requests after this one
if (env.ENVIRONMENT !== 'production') {
    globalForPrisma.pool = pool;
}

const adapter = new PrismaPg(pool);

export const db =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: ['error', 'warn']
    });

if (env.ENVIRONMENT !== 'production') {
    globalForPrisma.prisma = db;
}

// Re-export types from Prisma client
export type { PrismaClient };
