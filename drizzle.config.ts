import type { Config } from 'drizzle-kit';

export default {
    schema: './src/server/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        // drizzle-kit `generate` does not need a live connection, but `migrate` does.
        url: process.env.DATABASE_URL ?? '',
    },
} satisfies Config;
