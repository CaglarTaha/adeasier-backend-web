import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { walletTx } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import type { AppBindings } from "../types";

const route = new Hono<AppBindings>();

// GET /wallet -> { balance, transactions }   (simüle; gerçek ödeme YOK)
//   balance = Σ earning − Σ payout
route.get("/", requireAuth, async (c) => {
  const user = c.get("user");

  const transactions = await db
    .select()
    .from(walletTx)
    .where(eq(walletTx.userId, user.id))
    .orderBy(desc(walletTx.createdAt));

  const balance = transactions.reduce((sum, tx) => {
    const amt = Number(tx.amount) || 0;
    return tx.type === "payout" ? sum - amt : sum + amt;
  }, 0);

  return c.json({ balance, transactions });
});

export default route;
