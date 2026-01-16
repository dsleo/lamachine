import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Uses DATABASE_URL (Vercel Postgres provides it).
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool);

