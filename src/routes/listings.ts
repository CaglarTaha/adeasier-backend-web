import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { listings } from "../db/schema";
import type { NewListing } from "../db/schema";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { badRequest, forbidden, notFound } from "../middleware/error";
import { saveUpload } from "../lib/upload";
import {
  serializeListing,
  serializeListings,
  listingsWithViewerDeal,
} from "../lib/listingVisibility";
import type { AppBindings } from "../types";

const route = new Hono<AppBindings>();

const PRICE_MODELS = ["fixed", "negotiable"] as const;
const TERMS_VIS = ["public", "hidden", "on_request"] as const;
const ASSET_TYPES = ["logo", "endcard"] as const;
const STATUSES = ["active", "paused", "closed"] as const;

function reqString(v: unknown, field: string): string {
  if (typeof v !== "string" || v.trim().length === 0)
    throw badRequest(`${field} required`, "invalid_field");
  return v.trim();
}

function optNumericString(v: unknown, field: string): string | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || Number.isNaN(n) || n < 0)
    throw badRequest(`${field} must be a non-negative number`, "invalid_number");
  return String(n);
}

// POST /listings
// creator -> creator_offer (JSON);  brand -> brand_campaign (multipart with asset)
route.post("/", requireAuth, async (c) => {
  const user = c.get("user");

  if (user.role === "creator") {
    const body = await c.req.json().catch(() => null);
    if (!body) throw badRequest("Invalid JSON body");
    const b = body as Record<string, unknown>;

    let priceModel: (typeof PRICE_MODELS)[number] | null = null;
    if (b.priceModel !== undefined && b.priceModel !== null) {
      if (!PRICE_MODELS.includes(b.priceModel as never))
        throw badRequest("priceModel must be fixed|negotiable", "invalid_price_model");
      priceModel = b.priceModel as (typeof PRICE_MODELS)[number];
    }
    let termsVisibility: (typeof TERMS_VIS)[number] | null = null;
    if (b.termsVisibility !== undefined && b.termsVisibility !== null) {
      if (!TERMS_VIS.includes(b.termsVisibility as never))
        throw badRequest("termsVisibility must be public|hidden|on_request", "invalid_terms_visibility");
      termsVisibility = b.termsVisibility as (typeof TERMS_VIS)[number];
    }

    const values: NewListing = {
      ownerId: user.id,
      type: "creator_offer",
      title: reqString(b.title, "title"),
      description: reqString(b.description, "description"),
      niche: reqString(b.niche, "niche"),
      priceModel,
      price: optNumericString(b.price, "price"),
      terms: typeof b.terms === "string" ? b.terms : null,
      termsVisibility,
      sampleAssetUrl: typeof b.sampleAssetUrl === "string" ? b.sampleAssetUrl : null,
    };
    const [row] = await db.insert(listings).values(values).returning();
    return c.json({ listing: row }, 201);
  }

  // brand -> brand_campaign (multipart)
  const form = await c.req.formData().catch(() => null);
  if (!form) throw badRequest("multipart/form-data expected for brand_campaign");

  const assetTypeRaw = form.get("assetType");
  const assetType =
    typeof assetTypeRaw === "string" && ASSET_TYPES.includes(assetTypeRaw as never)
      ? (assetTypeRaw as (typeof ASSET_TYPES)[number])
      : null;
  if (!assetType)
    throw badRequest("assetType must be logo|endcard", "invalid_asset_type");

  const file = form.get("asset");
  let assetUrl: string | null = null;
  if (file instanceof File) {
    assetUrl = await saveUpload(file);
  } else {
    throw badRequest("asset file required", "missing_asset");
  }

  const values: NewListing = {
    ownerId: user.id,
    type: "brand_campaign",
    title: reqString(form.get("title"), "title"),
    description: reqString(form.get("description"), "description"),
    niche: reqString(form.get("niche"), "niche"),
    assetUrl,
    assetType,
    payoutPerDelivery: optNumericString(form.get("payoutPerDelivery"), "payoutPerDelivery"),
    budget: optNumericString(form.get("budget"), "budget"),
  };
  const [row] = await db.insert(listings).values(values).returning();
  return c.json({ listing: row }, 201);
});

// GET /listings/mine  (auth, owner sees own terms in full)
route.get("/mine", requireAuth, async (c) => {
  const user = c.get("user");
  const rows = await db
    .select()
    .from(listings)
    .where(eq(listings.ownerId, user.id))
    .orderBy(desc(listings.createdAt));
  return c.json({ listings: rows });
});

// GET /listings   ?type=&niche=&status=  (defaults to status=active)
route.get("/", optionalAuth, async (c) => {
  const user = c.get("user") ?? null;
  const type = c.req.query("type");
  const niche = c.req.query("niche");
  const status = c.req.query("status") ?? "active";

  const conds = [];
  if (type === "creator_offer" || type === "brand_campaign")
    conds.push(eq(listings.type, type));
  if (niche) conds.push(eq(listings.niche, niche));
  if (STATUSES.includes(status as never))
    conds.push(eq(listings.status, status as (typeof STATUSES)[number]));

  const rows = await db
    .select()
    .from(listings)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(listings.createdAt));

  const out = await serializeListings(rows, user?.id ?? null);
  return c.json({ listings: out });
});

// GET /listings/:id   (termsVisibility uygulanır)
route.get("/:id", optionalAuth, async (c) => {
  const user = c.get("user") ?? null;
  const id = c.req.param("id");
  const [row] = await db.select().from(listings).where(eq(listings.id, id));
  if (!row) throw notFound("Listing not found");

  const withDeal = await listingsWithViewerDeal(user?.id ?? null, [row.id]);
  return c.json({ listing: serializeListing(row, user?.id ?? null, withDeal) });
});

// PATCH /listings/:id  (owner only)
route.patch("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const [row] = await db.select().from(listings).where(eq(listings.id, id));
  if (!row) throw notFound("Listing not found");
  if (row.ownerId !== user.id) throw forbidden("Not the listing owner");

  const body = await c.req.json().catch(() => null);
  if (!body) throw badRequest("Invalid JSON body");
  const b = body as Record<string, unknown>;

  const patch: Partial<NewListing> = {};
  if (typeof b.title === "string") patch.title = b.title.trim();
  if (typeof b.description === "string") patch.description = b.description.trim();
  if (typeof b.niche === "string") patch.niche = b.niche.trim();
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status as never))
      throw badRequest("status must be active|paused|closed", "invalid_status");
    patch.status = b.status as (typeof STATUSES)[number];
  }
  if (b.priceModel !== undefined) {
    if (b.priceModel !== null && !PRICE_MODELS.includes(b.priceModel as never))
      throw badRequest("priceModel must be fixed|negotiable", "invalid_price_model");
    patch.priceModel = b.priceModel as (typeof PRICE_MODELS)[number] | null;
  }
  if (b.price !== undefined) patch.price = optNumericString(b.price, "price");
  if (b.terms !== undefined) patch.terms = b.terms === null ? null : String(b.terms);
  if (b.termsVisibility !== undefined) {
    if (b.termsVisibility !== null && !TERMS_VIS.includes(b.termsVisibility as never))
      throw badRequest("termsVisibility must be public|hidden|on_request", "invalid_terms_visibility");
    patch.termsVisibility = b.termsVisibility as (typeof TERMS_VIS)[number] | null;
  }
  if (typeof b.sampleAssetUrl === "string") patch.sampleAssetUrl = b.sampleAssetUrl;
  if (b.payoutPerDelivery !== undefined)
    patch.payoutPerDelivery = optNumericString(b.payoutPerDelivery, "payoutPerDelivery");
  if (b.budget !== undefined) patch.budget = optNumericString(b.budget, "budget");

  if (Object.keys(patch).length === 0)
    throw badRequest("No updatable fields provided", "empty_patch");

  const [updated] = await db
    .update(listings)
    .set(patch)
    .where(eq(listings.id, id))
    .returning();
  return c.json({ listing: updated });
});

// DELETE /listings/:id  (owner only)
route.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const [row] = await db.select().from(listings).where(eq(listings.id, id));
  if (!row) throw notFound("Listing not found");
  if (row.ownerId !== user.id) throw forbidden("Not the listing owner");

  await db.delete(listings).where(eq(listings.id, id));
  return c.json({ ok: true });
});

export default route;
