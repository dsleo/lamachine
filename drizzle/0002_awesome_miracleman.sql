CREATE TABLE "daily_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"day_key" text NOT NULL,
	"lang" text NOT NULL,
	"mode" text NOT NULL,
	"constraint_id" text NOT NULL,
	"param" text NOT NULL,
	"nickname" text NOT NULL,
	"text" text NOT NULL,
	"chars" integer NOT NULL,
	"semantic_approved" integer NOT NULL,
	"semantic_reason" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "daily_day_idx" ON "daily_submissions" USING btree ("day_key");--> statement-breakpoint
CREATE INDEX "daily_day_lang_mode_idx" ON "daily_submissions" USING btree ("day_key","lang","mode");--> statement-breakpoint
CREATE INDEX "daily_approved_idx" ON "daily_submissions" USING btree ("semantic_approved");--> statement-breakpoint
CREATE INDEX "daily_chars_idx" ON "daily_submissions" USING btree ("chars");--> statement-breakpoint
CREATE INDEX "daily_created_at_idx" ON "daily_submissions" USING btree ("created_at");