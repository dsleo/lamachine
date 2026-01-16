import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';

// drizzle-kit runs outside Next.js, so it does NOT automatically load `.env.local`.
// Load it explicitly for local migrations.
dotenv.config({ path: '.env.local' });
dotenv.config();

export default {
    schema: './src/server/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        // drizzle-kit `generate` does not need a live connection, but `migrate` does.
        url: process.env.DATABASE_URL ?? '',
    },
} satisfies Config;
