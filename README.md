# Adeasier — Backend API

Short-form (9:16) video için influencer ↔ marka çift taraflı pazaryeri + yayın
öncesi sponsor overlay MVP'sinin backend'i.

**Stack:** Bun + Hono + Drizzle ORM + PostgreSQL, JWT auth (access + refresh),
`Bun.password` hashing, ffmpeg overlay via `Bun.spawn` (sonraki adımlar).

## Kurulum

```bash
bun install
cp .env.example .env          # DATABASE_URL ve JWT secret'larını doldur
bun run db:generate           # Drizzle migration üret (./drizzle)
bun run db:migrate            # Migration'ları PostgreSQL'e uygula
bun run dev                   # http://localhost:4000
```

> PostgreSQL'in çalışıyor ve `.env` içindeki `DATABASE_URL`'in geçerli olması gerekir.

## Klasör yapısı

```
src/
  index.ts              Hono app + Bun.serve, route mount, /uploads static, CORS
  types.ts              Paylaşılan tipler (JWTPayload, AppBindings)
  db/{schema,index}.ts  Drizzle şema + postgres.js client
  middleware/           auth (requireAuth, requireRole), error (tutarlı hata formatı)
  lib/                  jwt (access/refresh), ids, ffmpeg, upload
  routes/               auth, listings, deals, videojobs, wallet
uploads/                yüklenen + işlenmiş dosyalar (/uploads/* statik)
```

## Hata formatı

Tüm hatalar: `{ "error": { "message": string, "code": string } }`

## Endpoint'ler

### Auth (tamam)

```bash
# Register
curl -s -X POST localhost:4000/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"c1@example.com","password":"secret1","role":"creator","displayName":"Creator One","niche":"fitness"}'

# Login
curl -s -X POST localhost:4000/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"c1@example.com","password":"secret1"}'

# Me (access token ile)
curl -s localhost:4000/auth/me -H "Authorization: Bearer <accessToken>"

# Refresh
curl -s -X POST localhost:4000/auth/refresh \
  -H 'content-type: application/json' \
  -d '{"refreshToken":"<refreshToken>"}'
```

### Listings (tamam)

Type rol'e göre belirlenir: **creator → creator_offer (JSON)**, **brand → brand_campaign (multipart)**.
`termsVisibility` her okumada uygulanır (public herkese / hidden yalnız sahibe / on_request o ilana
deal'i olan karşı tarafa + sahibe); görünmüyorsa `terms` alanı yanıttan çıkarılır.

```bash
# creator_offer (JSON)
curl -s -X POST localhost:4000/listings -H "Authorization: Bearer <CREATOR_TOKEN>" \
  -H 'content-type: application/json' \
  -d '{"title":"30s shoutout","description":"reels","niche":"fitness","priceModel":"negotiable","price":500,"terms":"...","termsVisibility":"on_request"}'

# brand_campaign (multipart + overlay asset)
curl -s -X POST localhost:4000/listings -H "Authorization: Bearer <BRAND_TOKEN>" \
  -F title="Summer push" -F description="logo overlay" -F niche="fitness" \
  -F assetType="logo" -F asset=@./logo.png

curl -s "localhost:4000/listings?type=creator_offer&niche=fitness&status=active"
curl -s localhost:4000/listings/<id>
curl -s localhost:4000/listings/mine -H "Authorization: Bearer <TOKEN>"
curl -s -X PATCH localhost:4000/listings/<id> -H "Authorization: Bearer <OWNER_TOKEN>" \
  -H 'content-type: application/json' -d '{"status":"paused"}'
curl -s -X DELETE localhost:4000/listings/<id> -H "Authorization: Bearer <OWNER_TOKEN>"
```

### Deals (tamam)

Pazarlık + anlaşma. Her işlemde kullanıcının deal'in **tarafı** olması gerekir (yoksa 403),
geçersiz durum geçişleri **409** döner.

```bash
# Deal aç (karşı ilana). initiator=sen, counterparty=listing.ownerId
curl -s -X POST localhost:4000/deals -H "Authorization: Bearer <TOKEN>" \
  -H 'content-type: application/json' -d '{"listingId":"<id>","message":"ilgileniyorum","amount":500}'

curl -s localhost:4000/deals -H "Authorization: Bearer <TOKEN>"            # taraf olduklarım (?status= ops.)
curl -s localhost:4000/deals/<id> -H "Authorization: Bearer <TOKEN>"        # deal + offers thread (kronolojik)

# Pazarlık: price -> negotiating; accept -> agreed (agreedPrice=son fiyat); reject -> rejected
# accept/reject yapan SON teklifi yapan taraf olamaz
curl -s -X POST localhost:4000/deals/<id>/offers -H "Authorization: Bearer <TOKEN>" \
  -H 'content-type: application/json' -d '{"kind":"price","amount":600,"message":"600 olsun"}'
curl -s -X POST localhost:4000/deals/<id>/offers -H "Authorization: Bearer <TOKEN>" \
  -H 'content-type: application/json' -d '{"kind":"accept"}'

# Overlay asset (yalnız brand tarafı, deal 'agreed' olmalı)
curl -s -X POST localhost:4000/deals/<id>/asset -H "Authorization: Bearer <BRAND_TOKEN>" \
  -F assetType=logo -F asset=@./logo.png

# İptal (taraf; requested|negotiating|agreed iken, delivered/completed sonrası YOK)
curl -s -X PATCH localhost:4000/deals/<id>/cancel -H "Authorization: Bearer <TOKEN>"
```

### VideoJobs (tamam)

Creator ham 9:16 videoyu yükler; backend **arka planda** ffmpeg overlay uygular
(`Bun.spawn`). Deal `agreed` olmalı ve overlay asset yüklenmiş olmalı. İş bitince
(`done`) creator'a `agreedPrice` kadar **earning WalletTx** eklenir ve deal `completed` olur.

```bash
# Creator video yükler (deal 'agreed' + asset yüklü olmalı). Hemen 'pending' döner.
curl -s -X POST localhost:4000/videojobs -H "Authorization: Bearer <CREATOR_TOKEN>" \
  -F dealId="<id>" -F rawVideo=@./raw.mp4

curl -s localhost:4000/videojobs/<id> -H "Authorization: Bearer <TOKEN>"   # polling (pending->processing->done/failed)
curl -s localhost:4000/videojobs -H "Authorization: Bearer <TOKEN>"        # kullanıcının job'ları
```

> ffmpeg sistemde kurulu varsayılır. Binary `FFMPEG_BIN` / `FFPROBE_BIN` env ile
> override edilebilir. logo → sağ-üst köşeye son ~3 sn overlay; endcard → ham
> videonun sonuna concat (ham çözünürlük/fps'e scale, video-only).

### Wallet (tamam)

Simüle cüzdan (gerçek ödeme YOK). `balance = Σ earning − Σ payout`.

```bash
curl -s localhost:4000/wallet -H "Authorization: Bearer <TOKEN>"
# -> { "balance": 900, "transactions": [ { amount, type:"earning", refDealId, ... } ] }
```

## Uçtan uca akış (özet)

`register (brand + creator)` → creator `creator_offer` açar → brand `POST /deals`
(pazarlık `offers` ile) → biri `accept` → `agreed` → brand `POST /deals/:id/asset`
→ creator `POST /videojobs` (raw 9:16) → ffmpeg overlay arka planda → `done` →
creator'a `earning` WalletTx → `GET /wallet`.
# adeasier-backend-web
