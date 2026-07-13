# Saturn KYC

Standalone, shareable identity-verification site. Users connect a wallet, prove
ownership with a signature, and complete a Sumsub identity check. Verification
status is keyed by wallet address and shared with any app using the same Sumsub
credentials (e.g. the main Saturn opportunities app).

## Local development

```bash
cd kyc-app
npm install
# create .env.local (see below)
npm run dev
```

## Environment variables

Create `kyc-app/.env.local` (and set the same in your Vercel project):

```
SUMSUB_APP_TOKEN=prd:…
SUMSUB_SECRET_KEY=…
SUMSUB_LEVEL_NAME=id-and-liveness
```

Use the **same** values as the main app so KYC status is shared across both.

## Deploy (separate Vercel project)

This app lives in a subfolder of the main repo. Deploy it as its own Vercel
project:

1. New Vercel project → import the same GitHub repo.
2. Set **Root Directory** to `kyc-app`.
3. Add the three `SUMSUB_*` environment variables.
4. Deploy → you get a dedicated URL (e.g. `saturn-kyc.vercel.app`, or attach a
   subdomain like `kyc.saturn.credit`).

## Routes

- `/` — the verification flow (connect → verify ownership → Sumsub → done)
- `POST /api/kyc/token` — mints a short-lived Sumsub Web SDK token for a wallet
- `GET /api/kyc/status?address=0x…` — `{ onboarded }` (true when `reviewAnswer === "GREEN"`)
