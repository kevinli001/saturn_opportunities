import crypto from "crypto";

// Server-only Sumsub helper. Credentials live in env vars (never in source or
// client bundles). See .env.local:
//   SUMSUB_APP_TOKEN   — application token (prd:… or sbx:…)
//   SUMSUB_SECRET_KEY  — secret key used to sign requests
//   SUMSUB_LEVEL_NAME  — verification level, e.g. "id-and-liveness"
const BASE_URL = "https://api.sumsub.com";
const APP_TOKEN = process.env.SUMSUB_APP_TOKEN ?? "";
const SECRET_KEY = process.env.SUMSUB_SECRET_KEY ?? "";
const LEVEL_NAME = process.env.SUMSUB_LEVEL_NAME ?? "";

export function isSumsubConfigured(): boolean {
  return Boolean(APP_TOKEN && SECRET_KEY && LEVEL_NAME);
}

// Sumsub signs each request: HMAC-SHA256(secret, ts + METHOD + path + body),
// hex-encoded, sent alongside the app token and the unix-second timestamp.
async function signedFetch(
  method: "GET" | "POST",
  path: string,
  body?: string,
): Promise<Response> {
  const ts = Math.floor(Date.now() / 1000).toString();
  const payload = body ?? "";
  const sig = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(ts + method + path + payload)
    .digest("hex");

  return fetch(BASE_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-App-Token": APP_TOKEN,
      "X-App-Access-Sig": sig,
      "X-App-Access-Ts": ts,
    },
    body,
    cache: "no-store",
  });
}

/** Create a short-lived Web SDK access token bound to this user (wallet). */
export async function createAccessToken(userId: string): Promise<string | null> {
  const body = JSON.stringify({ userId, levelName: LEVEL_NAME, ttlInSecs: 600 });
  const res = await signedFetch("POST", "/resources/accessTokens/sdk", body);
  if (!res.ok) return null;
  const json = (await res.json()) as { token?: string };
  return json.token ?? null;
}

export interface KycStatus {
  onboarded: boolean;
  reviewAnswer?: string;
  reviewStatus?: string;
  notStarted?: boolean;
}

/** Look up an applicant by external user id (wallet) and read the review state. */
export async function getApplicantStatus(userId: string): Promise<KycStatus> {
  const path = `/resources/applicants/-;externalUserId=${userId}/one`;
  const res = await signedFetch("GET", path);
  if (res.status === 404) return { onboarded: false, notStarted: true };
  if (!res.ok) return { onboarded: false };

  const json = (await res.json()) as {
    review?: { reviewStatus?: string; reviewResult?: { reviewAnswer?: string } };
  };
  const reviewAnswer = json.review?.reviewResult?.reviewAnswer;
  const reviewStatus = json.review?.reviewStatus;
  return { onboarded: reviewAnswer === "GREEN", reviewAnswer, reviewStatus };
}
