ALTER TABLE "daily_submissions" ADD COLUMN "difficulty" text DEFAULT 'easy' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_submissions" ADD COLUMN "raw_chars" integer DEFAULT 0 NOT NULL;