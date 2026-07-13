import { isSumsubConfigured, getApplicantStatus } from "@/lib/sumsub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/kyc/status?address=0x… -> { configured, onboarded, reviewAnswer, reviewStatus, notStarted }
export async function GET(request: Request) {
  if (!isSumsubConfigured()) {
    return Response.json({ configured: false, onboarded: false });
  }

  const address = new URL(request.url).searchParams.get("address");
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return Response.json({ error: "Missing or invalid address" }, { status: 400 });
  }

  const status = await getApplicantStatus(address.toLowerCase());
  return Response.json({ configured: true, ...status });
}
