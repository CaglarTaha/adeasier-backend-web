import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../db";
import { deals } from "../db/schema";
import type { Listing } from "../db/schema";

/**
 * termsVisibility kuralı — HER listing okumasında uygulanır.
 *
 *  - public:     terms herkese görünür
 *  - hidden:     terms sadece ilan sahibine görünür
 *  - on_request: terms, o ilana deal'i olan karşı tarafa (ve sahibine) görünür
 *
 * Görünür değilse `terms` alanı response'tan tamamen çıkarılır.
 */
export function canSeeTerms(
  listing: Pick<Listing, "ownerId" | "termsVisibility">,
  viewerId: string | null,
  viewerListingIdsWithDeal: Set<string> & { has(id: string): boolean },
  listingId: string
): boolean {
  // Nothing to hide if there's no visibility rule (e.g. brand_campaign).
  if (!listing.termsVisibility) return true;
  if (viewerId && viewerId === listing.ownerId) return true;

  switch (listing.termsVisibility) {
    case "public":
      return true;
    case "hidden":
      return false; // only owner, handled above
    case "on_request":
      return viewerId != null && viewerListingIdsWithDeal.has(listingId);
    default:
      return false;
  }
}

// Strip `terms` from a listing record when the viewer is not allowed to see it.
export function serializeListing(
  listing: Listing,
  viewerId: string | null,
  listingIdsWithDeal: Set<string>
): Listing | Omit<Listing, "terms"> {
  if (canSeeTerms(listing, viewerId, listingIdsWithDeal, listing.id)) {
    return listing;
  }
  const { terms: _terms, ...rest } = listing;
  return rest;
}

/**
 * For a viewer and a set of listing ids, return the subset of those ids on
 * which the viewer is a party (initiator or counterparty) in any deal.
 * Used to evaluate `on_request` visibility in one query for list endpoints.
 */
export async function listingsWithViewerDeal(
  viewerId: string | null,
  listingIds: string[]
): Promise<Set<string>> {
  if (!viewerId || listingIds.length === 0) return new Set();
  const rows = await db
    .select({ listingId: deals.listingId })
    .from(deals)
    .where(
      and(
        inArray(deals.listingId, listingIds),
        or(
          eq(deals.initiatorId, viewerId),
          eq(deals.counterpartyId, viewerId)
        )
      )
    );
  return new Set(rows.map((r) => r.listingId));
}

// Convenience: serialize a list of listings, resolving on_request deals once.
export async function serializeListings(
  listings: Listing[],
  viewerId: string | null
): Promise<Array<Listing | Omit<Listing, "terms">>> {
  const ids = listings.map((l) => l.id);
  const withDeal = await listingsWithViewerDeal(viewerId, ids);
  return listings.map((l) => serializeListing(l, viewerId, withDeal));
}
