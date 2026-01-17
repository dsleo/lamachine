import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Uses DATABASE_URL (Vercel Postgres provides it).
// Supabase commonly requires SSL from serverless providers.
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
        process.env.NODE_ENV === 'production'
            ? {
                // Supabase uses a public CA; but serverless environments can have issues.
                // This is the pragmatic setting recommended for many serverless+Supabase setups.
                rejectUnauthorized: false,
            }
            : undefined,
});

export const db = drizzle(pool);
