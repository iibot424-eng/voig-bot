CREATE TABLE "bans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"chat_id" bigint NOT NULL,
	"reason" text,
	"issued_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"name" text NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"employees" integer[] DEFAULT '{}',
	"level" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" bigint NOT NULL,
	"title" text,
	"type" text,
	"antispam_enabled" boolean DEFAULT false NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chats_chat_id_unique" UNIQUE("chat_id")
);
--> statement-breakpoint
CREATE TABLE "currency_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"telegram_payment_charge_id" text NOT NULL,
	"stars_amount" integer NOT NULL,
	"currency_amount" integer NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "currency_purchases_telegram_payment_charge_id_unique" UNIQUE("telegram_payment_charge_id")
);
--> statement-breakpoint
CREATE TABLE "duels" (
	"id" serial PRIMARY KEY NOT NULL,
	"challenger_id" integer NOT NULL,
	"opponent_id" integer NOT NULL,
	"chat_id" bigint NOT NULL,
	"bet" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"winner_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"item_type" text NOT NULL,
	"item_data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marriages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user1_id" integer NOT NULL,
	"user2_id" integer NOT NULL,
	"chat_id" bigint,
	"married_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mutes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"chat_id" bigint NOT NULL,
	"muted_until" timestamp NOT NULL,
	"reason" text,
	"issued_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"from_user_id" integer NOT NULL,
	"to_user_id" integer NOT NULL,
	"chat_id" bigint NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"telegram_payment_charge_id" text NOT NULL,
	"stars_amount" integer NOT NULL,
	"premium_months" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "premium_purchases_telegram_payment_charge_id_unique" UNIQUE("telegram_payment_charge_id")
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"user1_id" integer NOT NULL,
	"user2_id" integer NOT NULL,
	"chat_id" bigint,
	"started_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"telegram_id" bigint NOT NULL,
	"username" text,
	"first_name" text,
	"last_name" text,
	"balance" integer DEFAULT 1000 NOT NULL,
	"reputation" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"premium_until" timestamp,
	"transform_animal" text,
	"transform_until" timestamp,
	"last_transform_at" timestamp,
	"daily_bonus_at" timestamp,
	"last_weekly_bonus_at" timestamp,
	"is_invisible" boolean DEFAULT false NOT NULL,
	"invisibility_until" timestamp,
	"last_animal_sound_at" timestamp,
	"job" text,
	"business_id" integer,
	"muted_until" timestamp,
	"is_banned" boolean DEFAULT false NOT NULL,
	"bio" text,
	"is_afk" boolean DEFAULT false NOT NULL,
	"afk_reason" text,
	"last_active" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"nick_prefix" text,
	"last_fish_at" timestamp,
	"fish_count_today" integer DEFAULT 0 NOT NULL,
	"last_invisibility_at" timestamp,
	"transform_protection_until" timestamp,
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id")
);
--> statement-breakpoint
CREATE TABLE "warnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"chat_id" bigint NOT NULL,
	"reason" text,
	"issued_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bans" ADD CONSTRAINT "bans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bans" ADD CONSTRAINT "bans_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_purchases" ADD CONSTRAINT "currency_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_challenger_id_users_id_fk" FOREIGN KEY ("challenger_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_opponent_id_users_id_fk" FOREIGN KEY ("opponent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marriages" ADD CONSTRAINT "marriages_user1_id_users_id_fk" FOREIGN KEY ("user1_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marriages" ADD CONSTRAINT "marriages_user2_id_users_id_fk" FOREIGN KEY ("user2_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutes" ADD CONSTRAINT "mutes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutes" ADD CONSTRAINT "mutes_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_proposals" ADD CONSTRAINT "pending_proposals_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_proposals" ADD CONSTRAINT "pending_proposals_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_purchases" ADD CONSTRAINT "premium_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_user1_id_users_id_fk" FOREIGN KEY ("user1_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_user2_id_users_id_fk" FOREIGN KEY ("user2_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;