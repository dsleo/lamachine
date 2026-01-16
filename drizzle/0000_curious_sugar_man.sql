CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"campaign_id" text NOT NULL,
	"lang" text NOT NULL,
	"mode" text NOT NULL,
	"nickname" text NOT NULL,
	"levels_cleared" integer NOT NULL,
	"level_score" integer NOT NULL,
	"total_score" integer NOT NULL,
	"total_chars" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX "runs_campaign_idx" ON "runs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "runs_mode_idx" ON "runs" USING btree ("mode");--> statement-breakpoint
CREATE INDEX "runs_lang_idx" ON "runs" USING btree ("lang");--> statement-breakpoint
CREATE INDEX "runs_score_idx" ON "runs" USING btree ("total_score");--> statement-breakpoint
CREATE INDEX "runs_created_at_idx" ON "runs" USING btree ("created_at");