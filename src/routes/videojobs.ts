import { Hono } from "hono";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "../db";
import { deals, videoJobs, walletTx } from "../db/schema";
import type { Deal } from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";
import { badRequest, conflict, forbidden, notFound } from "../middleware/error";
import { saveUpload } from "../lib/upload";
import { trackingCode } from "../lib/ids";
import { renderOverlay } from "../lib/ffmpeg";
import type { AppBindings, SafeUser } from "../types";

const route = new Hono<AppBindings>();

function isParty(deal: Deal, user: SafeUser): boolean {
  return deal.initiatorId === user.id || deal.counterpartyId === user.id;
}

// done olunca creator'a earning WalletTx ekle (agreedPrice) — yalnız bir kez.
async function creditEarning(deal: Deal, creatorId: string): Promise<void> {
  const [existing] = await db
    .select({ id: walletTx.id })
    .from(walletTx)
    .where(and(eq(walletTx.refDealId, deal.id), eq(walletTx.type, "earning")));
  if (existing) return; // already credited

  await db.insert(walletTx).values({
    userId: creatorId,
    amount: deal.agreedPrice ?? "0",
    type: "earning",
    refDealId: deal.id,
  });
  // Teslim tamamlandı: deal'i 'completed' yap (tekrar job/earning'i de engeller).
  await db
    .update(deals)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(deals.id, deal.id));
}

// ARKA PLAN: pending -> processing -> done/failed. creator = video'yu yükleyen.
async function processJob(jobId: string, creatorId: string): Promise<void> {
  await db
    .update(videoJobs)
    .set({ status: "processing" })
    .where(eq(videoJobs.id, jobId));

  const [job] = await db.select().from(videoJobs).where(eq(videoJobs.id, jobId));
  if (!job) return;
  const [deal] = await db.select().from(deals).where(eq(deals.id, job.dealId));

  if (!deal || !deal.assetUrl || !deal.assetType) {
    await db.update(videoJobs).set({ status: "failed" }).where(eq(videoJobs.id, jobId));
    return;
  }

  try {
    const processedVideoUrl = await renderOverlay(
      job.rawVideoUrl,
      deal.assetUrl,
      deal.assetType
    );
    await db
      .update(videoJobs)
      .set({ status: "done", processedVideoUrl })
      .where(eq(videoJobs.id, jobId));
    await creditEarning(deal, creatorId);
  } catch (e) {
    console.error("[videojob] processing failed", jobId, (e as Error).message);
    await db.update(videoJobs).set({ status: "failed" }).where(eq(videoJobs.id, jobId));
  }
}

// ---------------------------------------------------------------------------
// POST /videojobs  (creator, multipart: rawVideo + dealId)  — deal 'agreed'
// ---------------------------------------------------------------------------
route.post("/", requireAuth, requireRole("creator"), async (c) => {
  const user = c.get("user");
  const form = await c.req.formData().catch(() => null);
  if (!form) throw badRequest("multipart/form-data expected");

  const dealId = form.get("dealId");
  if (typeof dealId !== "string") throw badRequest("dealId required", "invalid_deal");

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw notFound("Deal not found");
  if (!isParty(deal, user)) throw forbidden("Not a party to this deal");
  if (deal.status !== "agreed")
    throw conflict("Deal must be 'agreed' to submit a video", "invalid_state");
  if (!deal.assetUrl || !deal.assetType)
    throw conflict("Overlay asset not uploaded on this deal yet", "no_asset");

  const file = form.get("rawVideo");
  if (!(file instanceof File)) throw badRequest("rawVideo file required", "missing_video");
  const rawVideoUrl = await saveUpload(file);

  const [job] = await db
    .insert(videoJobs)
    .values({ dealId, rawVideoUrl, status: "pending", trackingCode: trackingCode() })
    .returning();

  // Fire-and-forget background overlay (handler returns immediately).
  void processJob(job!.id, user.id);

  return c.json({ videoJob: job }, 201);
});

// ---------------------------------------------------------------------------
// GET /videojobs/:id   (polling) — yalnız deal taraflarına
// ---------------------------------------------------------------------------
route.get("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const [job] = await db
    .select()
    .from(videoJobs)
    .where(eq(videoJobs.id, c.req.param("id")));
  if (!job) throw notFound("Video job not found");
  const [deal] = await db.select().from(deals).where(eq(deals.id, job.dealId));
  if (!deal || !isParty(deal, user)) throw forbidden("Not a party to this deal");
  return c.json({ videoJob: job });
});

// ---------------------------------------------------------------------------
// GET /videojobs   — kullanıcının taraf olduğu deal'lerin job'ları
// ---------------------------------------------------------------------------
route.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const myDeals = await db
    .select({ id: deals.id })
    .from(deals)
    .where(or(eq(deals.initiatorId, user.id), eq(deals.counterpartyId, user.id)));
  const ids = myDeals.map((d) => d.id);
  const jobs = ids.length
    ? await db
        .select()
        .from(videoJobs)
        .where(inArray(videoJobs.dealId, ids))
        .orderBy(desc(videoJobs.createdAt))
    : [];
  return c.json({ videoJobs: jobs });
});

export default route;
