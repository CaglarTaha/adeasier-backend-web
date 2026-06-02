import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const userRoleEnum = pgEnum("user_role", ["brand", "creator"]);
export const listingTypeEnum = pgEnum("listing_type", [
  "creator_offer",
  "brand_campaign",
]);
export const listingStatusEnum = pgEnum("listing_status", [
  "active",
  "paused",
  "closed",
]);
export const priceModelEnum = pgEnum("price_model", ["fixed", "negotiable"]);
export const termsVisibilityEnum = pgEnum("terms_visibility", [
  "public",
  "hidden",
  "on_request",
]);
export const assetTypeEnum = pgEnum("asset_type", ["logo", "endcard"]);
export const dealStatusEnum = pgEnum("deal_status", [
  "requested",
  "negotiating",
  "agreed",
  "delivered",
  "completed",
  "cancelled",
  "rejected",
]);
export const offerKindEnum = pgEnum("offer_kind", [
  "message",
  "price",
  "accept",
  "reject",
]);
export const videojobStatusEnum = pgEnum("videojob_status", [
  "pending",
  "processing",
  "done",
  "failed",
]);
export const walletTxTypeEnum = pgEnum("wallet_tx_type", [
  "earning",
  "payout",
]);

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  displayName: text("display_name").notNull(),
  niche: text("niche"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: listingTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  niche: text("niche").notNull(),
  status: listingStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  // creator_offer fields
  priceModel: priceModelEnum("price_model"),
  price: numeric("price"),
  terms: text("terms"),
  termsVisibility: termsVisibilityEnum("terms_visibility"),
  sampleAssetUrl: text("sample_asset_url"),

  // brand_campaign fields
  assetUrl: text("asset_url"),
  assetType: assetTypeEnum("asset_type"),
  payoutPerDelivery: numeric("payout_per_delivery"),
  budget: numeric("budget"),
});

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  initiatorId: uuid("initiator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  counterpartyId: uuid("counterparty_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: dealStatusEnum("status").notNull().default("requested"),
  agreedPrice: numeric("agreed_price"),
  assetUrl: text("asset_url"), // sponsor overlay asset
  assetType: assetTypeEnum("asset_type"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  fromUserId: uuid("from_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: offerKindEnum("kind").notNull(),
  amount: numeric("amount"),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const videoJobs = pgTable("video_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  rawVideoUrl: text("raw_video_url").notNull(),
  processedVideoUrl: text("processed_video_url"),
  status: videojobStatusEnum("status").notNull().default("pending"),
  trackingCode: text("tracking_code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const walletTx = pgTable("wallet_tx", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: numeric("amount").notNull(),
  type: walletTxTypeEnum("type").notNull(),
  refDealId: uuid("ref_deal_id").references(() => deals.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;
export type VideoJob = typeof videoJobs.$inferSelect;
export type NewVideoJob = typeof videoJobs.$inferInsert;
export type WalletTx = typeof walletTx.$inferSelect;
export type NewWalletTx = typeof walletTx.$inferInsert;
