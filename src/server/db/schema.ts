import { pgTable, text, timestamp, integer, uuid, index } from 'drizzle-orm/pg-core';

export const runs = pgTable(
    'runs',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

        // Campaign identity
        campaignId: text('campaign_id').notNull(), // e.g. 'v1'
        lang: text('lang').notNull(), // 'fr' | 'en'
        mode: text('mode').notNull(), // 'arena' | 'versus'

        // Versus-only at the moment (stored for auditing + scoring).
        difficulty: text('difficulty').notNull().default('easy'),

        nickname: text('nickname').notNull(),

        // Progress
        levelIndex: integer('level_index').notNull(),
        levelsCleared: integer('levels_cleared').notNull(),
        // Score inside the current level (chars for survival levels, or time-based score for timed levels)
        levelScore: integer('level_score').notNull(),
        totalScore: integer('total_score').notNull(),
        totalChars: integer('total_chars').notNull(),
    },
    (t) => ({
        campaignIdx: index('runs_campaign_idx').on(t.campaignId),
        modeIdx: index('runs_mode_idx').on(t.mode),
        langIdx: index('runs_lang_idx').on(t.lang),
        scoreIdx: index('runs_score_idx').on(t.totalScore),
        createdAtIdx: index('runs_created_at_idx').on(t.createdAt),
    })
);

export const dailySubmissions = pgTable(
    'daily_submissions',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

        // Daily identity
        dayKey: text('day_key').notNull(), // YYYY-MM-DD (Europe/Paris)
        lang: text('lang').notNull(), // 'fr' | 'en'
        mode: text('mode').notNull(), // 'coach' | 'versus'

        // Versus-only: difficulty tier used to compute points.
        // Stored for auditing + leaderboard display.
        difficulty: text('difficulty').notNull().default('easy'),

        // Snapshot of daily rule (makes later auditing easier)
        constraintId: text('constraint_id').notNull(),
        param: text('param').notNull(),

        nickname: text('nickname').notNull(),
        text: text('text').notNull(),
        // For backward compatibility this column is still called `chars`,
        // but it now represents the leaderboard SCORE (aka points).
        chars: integer('chars').notNull(),

        // Raw character count (letters-only) before difficulty multiplier.
        rawChars: integer('raw_chars').notNull().default(0),

        semanticApproved: integer('semantic_approved').notNull(), // 0/1 (sqlite-like); pg boolean is fine but keep int for simplicity
        semanticReason: text('semantic_reason').notNull(),
    },
    (t) => ({
        dayIdx: index('daily_day_idx').on(t.dayKey),
        dayLangModeIdx: index('daily_day_lang_mode_idx').on(t.dayKey, t.lang, t.mode),
        approvedIdx: index('daily_approved_idx').on(t.semanticApproved),
        charsIdx: index('daily_chars_idx').on(t.chars),
        createdAtIdx: index('daily_created_at_idx').on(t.createdAt),
    })
);
