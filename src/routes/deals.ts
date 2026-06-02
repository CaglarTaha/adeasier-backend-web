import { Hono } from "hono";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "../db";
import { deals, listings, offers } from "../db/schema";
import type { Deal, NewOffer } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { badRequest, conflict, forbidden, notFound } from "../middleware/error";
import { saveUpload } from "../lib/upload";
import type { AppBindings, SafeUser } from "../types";

const route = new Hono<AppBindings>();

const OFFER_KINDS = ["message", "price", "accept", "reject"] as const;
const ASSET_TYPES = ["logo", "endcard"] as const;

type DealStatus = Deal["status"];
const ALL_STATUSES: readonly DealStatus[] = [
  "requested", "negotiating", "agreed", "delivered", "completed", "cancelled", "rejected",
];
// Deal'in hâlâ "açık" sayıldığı durumlar (yeni deal / pazarlık engeli için).
const OPEN_STATUSES: readonly DealStatus[] = ["requested", "negotiating", "agreed", "delivered"];
// Pazarlık (offer ekleme / accept / reject) yapılabilen durumlar.
const NEGOTIABLE_STATUSES: readonly DealStatus[] = ["requested", "negotiating"];

function numericOrThrow(v: unknown, field: string): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || Number.isNaN(n) || n < 0)
    throw badRequest(`${field} must be a non-negative number`, "invalid_number");
  return String(n);
}

// Deal'i yükle ve kullanıcının taraf olduğunu doğrula; değilse 403.
async function loadDealAsParty(
  dealId: string,
  user: SafeUser
): Promise<Deal> {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw notFound("Deal not found");
  if (deal.initiatorId !== user.id && deal.counterpartyId !== user.id)
    throw forbidden("Not a party to this deal");
  return deal;
}

// En son pazarlık teklifini (price|message) döndür — accept/reject sahibi kontrolü için.
async function lastNegotiationOffer(dealId: string) {
  const [row] = await db
    .select()
    .from(offers)
    .where(
      and(eq(offers.dealId, dealId), inArray(offers.kind, ["price", "message"]))
    )
    .orderBy(desc(offers.createdAt))
    .limit(1);
  return row ?? null;
}

// En son fiyat teklifinin tutarı (agreedPrice için).
async function lastPriceAmount(dealId: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(offers)
    .where(and(eq(offers.dealId, dealId), eq(offers.kind, "price")))
    .orderBy(desc(offers.createdAt))
    .limit(1);
  return row?.amount ?? null;
}

// ---------------------------------------------------------------------------
// POST /deals  { listingId, message?, amount? }  -> Deal 'requested'
// ---------------------------------------------------------------------------
route.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  if (!body) throw badRequest("Invalid JSON body");
  const { listingId, message, amount } = body as Record<string, unknown>;

  if (typeof listingId !== "string")
    throw badRequest("listingId required", "invalid_listing");

  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, listingId));
  if (!listing) throw notFound("Listing not found");

  if (listing.ownerId === user.id)
    throw badRequest("Cannot open a deal on your own listing", "self_deal");

  // Aynı listing + initiator için zaten açık bir deal varsa tekrar açma.
  const [existing] = await db
    .select({ id: deals.id })
    .from(deals)
    .where(
      and(
        eq(deals.listingId, listingId),
        eq(deals.initiatorId, user.id),
        inArray(deals.status, [...OPEN_STATUSES])
      )
    );
  if (existing)
    throw conflict("You already have an open deal on this listing", "deal_exists");

  const [deal] = await db
    .insert(deals)
    .values({
      listingId,
      initiatorId: user.id,
      counterpartyId: listing.ownerId,
      status: "requested",
    })
    .returning();

  // Açılış teklif(ler)ini thread'e ekle (mesaj/fiyat ile).
  const opening: NewOffer[] = [];
  if (amount !== undefined && amount !== null) {
    opening.push({
      dealId: deal!.id,
      fromUserId: user.id,
      kind: "price",
      amount: numericOrThrow(amount, "amount"),
      message: typeof message === "string" ? message : null,
    });
  } else if (typeof message === "string" && message.trim()) {
    opening.push({
      dealId: deal!.id,
      fromUserId: user.id,
      kind: "message",
      message,
    });
  }
  if (opening.length) await db.insert(offers).values(opening);

  return c.json({ deal }, 201);
});

// ---------------------------------------------------------------------------
// GET /deals  ?status=   -> initiator VEYA counterparty olduğum deal'ler
// ---------------------------------------------------------------------------
route.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const status = c.req.query("status");

  const party = or(
    eq(deals.initiatorId, user.id),
    eq(deals.counterpartyId, user.id)
  );
  const where =
    status && ALL_STATUSES.includes(status as DealStatus)
      ? and(party, eq(deals.status, status as DealStatus))
      : party;

  const rows = await db
    .select()
    .from(deals)
    .where(where)
    .orderBy(desc(deals.updatedAt));
  return c.json({ deals: rows });
});

// ---------------------------------------------------------------------------
// GET /deals/:id  -> deal + offers thread (kronolojik); sadece taraflar
// ---------------------------------------------------------------------------
route.get("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const deal = await loadDealAsParty(c.req.param("id"), user);
  const thread = await db
    .select()
    .from(offers)
    .where(eq(offers.dealId, deal.id))
    .orderBy(asc(offers.createdAt));
  return c.json({ deal, offers: thread });
});

// ---------------------------------------------------------------------------
// POST /deals/:id/offers  { kind, amount?, message? }
// ---------------------------------------------------------------------------
route.post("/:id/offers", requireAuth, async (c) => {
  const user = c.get("user");
  const deal = await loadDealAsParty(c.req.param("id"), user);

  const body = await c.req.json().catch(() => null);
  if (!body) throw badRequest("Invalid JSON body");
  const { kind, amount, message } = body as Record<string, unknown>;
  if (typeof kind !== "string" || !OFFER_KINDS.includes(kind as never))
    throw badRequest("kind must be message|price|accept|reject", "invalid_kind");

  // accept/reject dışındaki işlemler yalnızca pazarlık edilebilir durumlarda.
  if (!NEGOTIABLE_STATUSES.includes(deal.status as never)) {
    throw conflict(
      `Cannot post offers on a '${deal.status}' deal`,
      "invalid_state"
    );
  }

  if (kind === "message") {
    if (typeof message !== "string" || !message.trim())
      throw badRequest("message required", "invalid_message");
    const [row] = await db
      .insert(offers)
      .values({ dealId: deal.id, fromUserId: user.id, kind: "message", message })
      .returning();
    return c.json({ offer: row, deal }, 201);
  }

  if (kind === "price") {
    const amt = numericOrThrow(amount, "amount");
    const [row] = await db
      .insert(offers)
      .values({
        dealId: deal.id,
        fromUserId: user.id,
        kind: "price",
        amount: amt,
        message: typeof message === "string" ? message : null,
      })
      .returning();
    const [updated] = await db
      .update(deals)
      .set({ status: "negotiating", updatedAt: new Date() })
      .where(eq(deals.id, deal.id))
      .returning();
    return c.json({ offer: row, deal: updated }, 201);
  }

  // accept / reject — kendi son teklifini onaylayamaz/reddedemezsin.
  const last = await lastNegotiationOffer(deal.id);
  if (!last)
    throw conflict("Nothing to accept/reject yet", "no_offers");
  if (last.fromUserId === user.id)
    throw conflict(
      "You cannot accept/reject your own latest offer",
      "self_accept"
    );

  // İşlemi thread'e kaydet.
  await db.insert(offers).values({
    dealId: deal.id,
    fromUserId: user.id,
    kind: kind as "accept" | "reject",
    message: typeof message === "string" ? message : null,
  });

  if (kind === "reject") {
    const [updated] = await db
      .update(deals)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(deals.id, deal.id))
      .returning();
    return c.json({ deal: updated });
  }

  // accept -> agreed, agreedPrice = son fiyat teklifi (yoksa listing fiyatına düş).
  let agreedPrice = await lastPriceAmount(deal.id);
  if (agreedPrice === null) {
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, deal.listingId));
    agreedPrice = listing?.price ?? listing?.payoutPerDelivery ?? null;
  }
  const [updated] = await db
    .update(deals)
    .set({ status: "agreed", agreedPrice, updatedAt: new Date() })
    .where(eq(deals.id, deal.id))
    .returning();
  return c.json({ deal: updated });
});

// ---------------------------------------------------------------------------
// POST /deals/:id/asset  (brand tarafı, multipart) — deal 'agreed' olmalı
// ---------------------------------------------------------------------------
route.post("/:id/asset", requireAuth, async (c) => {
  const user = c.get("user");
  const deal = await loadDealAsParty(c.req.param("id"), user);

  if (user.role !== "brand")
    throw forbidden("Only the brand side uploads the overlay asset", "not_brand");
  if (deal.status !== "agreed")
    throw conflict("Deal must be 'agreed' before uploading asset", "invalid_state");

  const form = await c.req.formData().catch(() => null);
  if (!form) throw badRequest("multipart/form-data expected");

  const assetTypeRaw = form.get("assetType");
  if (typeof assetTypeRaw !== "string" || !ASSET_TYPES.includes(assetTypeRaw as never))
    throw badRequest("assetType must be logo|endcard", "invalid_asset_type");

  const file = form.get("asset");
  if (!(file instanceof File)) throw badRequest("asset file required", "missing_asset");
  const assetUrl = await saveUpload(file);

  const [updated] = await db
    .update(deals)
    .set({
      assetUrl,
      assetType: assetTypeRaw as "logo" | "endcard",
      updatedAt: new Date(),
    })
    .where(eq(deals.id, deal.id))
    .returning();
  return c.json({ deal: updated });
});

// ---------------------------------------------------------------------------
// PATCH /deals/:id/cancel  (taraf) -> 'cancelled'
//   İzin: requested | negotiating | agreed.  delivered/completed sonrası iptal YOK.
// ---------------------------------------------------------------------------
route.patch("/:id/cancel", requireAuth, async (c) => {
  const user = c.get("user");
  const deal = await loadDealAsParty(c.req.param("id"), user);

  const cancellable = ["requested", "negotiating", "agreed"];
  if (!cancellable.includes(deal.status))
    throw conflict(
      `Cannot cancel a '${deal.status}' deal`,
      "invalid_state"
    );

  const [updated] = await db
    .update(deals)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(deals.id, deal.id))
    .returning();
  return c.json({ deal: updated });
});

export default route;
