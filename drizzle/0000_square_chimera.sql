CREATE TYPE "public"."asset_type" AS ENUM('logo', 'endcard');--> statement-breakpoint
CREATE TYPE "public"."deal_status" AS ENUM('requested', 'negotiating', 'agreed', 'delivered', 'completed', 'cancelled', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'paused', 'closed');--> statement-breakpoint
CREATE TYPE "public"."listing_type" AS ENUM('creator_offer', 'brand_campaign');--> statement-breakpoint
CREATE TYPE "public"."offer_kind" AS ENUM('message', 'price', 'accept', 'reject');--> statement-breakpoint
CREATE TYPE "public"."price_model" AS ENUM('fixed', 'negotiable');--> statement-breakpoint
CREATE TYPE "public"."terms_visibility" AS ENUM('public', 'hidden', 'on_request');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('brand', 'creator');--> statement-breakpoint
CREATE TYPE "public"."videojob_status" AS ENUM('pending', 'processing', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."wallet_tx_type" AS ENUM('earning', 'payout');--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"initiator_id" uuid NOT NULL,
	"counterparty_id" uuid NOT NULL,
	"status" "deal_status" DEFAULT 'requested' NOT NULL,
	"agreed_price" numeric,
	"asset_url" text,
	"asset_type" "asset_type",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"type" "listing_type" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"niche" text NOT NULL,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"price_model" "price_model",
	"price" numeric,
	"terms" text,
	"terms_visibility" "terms_visibility",
	"sample_asset_url" text,
	"asset_url" text,
	"asset_type" "asset_type",
	"payout_per_delivery" numeric,
	"budget" numeric
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"from_user_id" uuid NOT NULL,
	"kind" "offer_kind" NOT NULL,
	"amount" numeric,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"display_name" text NOT NULL,
	"niche" text,
	"bio" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "video_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"raw_video_url" text NOT NULL,
	"processed_video_url" text,
	"status" "videojob_status" DEFAULT 'pending' NOT NULL,
	"tracking_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_tx" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric NOT NULL,
	"type" "wallet_tx_type" NOT NULL,
	"ref_deal_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_initiator_id_users_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_counterparty_id_users_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_tx" ADD CONSTRAINT "wallet_tx_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_tx" ADD CONSTRAINT "wallet_tx_ref_deal_id_deals_id_fk" FOREIGN KEY ("ref_deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;