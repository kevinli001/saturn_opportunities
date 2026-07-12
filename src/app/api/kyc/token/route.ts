import { isSumsubConfigured, createAccessToken } from "@/lib/sumsub";

export const runtime = "nodejs";

// POST /api/kyc/token  { address } -> { token }
// Generates a short-lived Sumsub Web SDK access token for the wallet.
export async function POST(request: Request) {
  if (!isSumsubConfigured()) {
    return Response.json({ error: "KYC not configured" }, { status: 501 });
  }

  let address: unknown;
  try {
    ({ address } = await request.json());
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return Response.json({ error: "Missing or invalid address" }, { status: 400 });
  }

  const token = await createAccessToken(address.toLowerCase());
  if (!token) {
    return Response.json({ error: "Failed to create access token" }, { status: 502 });
  }

  return Response.json({ token });
}
