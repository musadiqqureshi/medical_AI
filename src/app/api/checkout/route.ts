import { NextRequest } from "next/server";
import { getPlan } from "@/lib/plans";

export const runtime = "nodejs";

type Body = {
  planId?: string;
  method?: "jazzcash" | "easypaisa" | "bank" | "card";
  accessToken?: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const plan = getPlan(body.planId || "");
  if (!plan || plan.pricePkr <= 0) return json({ error: "Invalid plan." }, 400);
  const method = body.method || "jazzcash";

  // Human-friendly payment reference the user quotes with their transfer.
  const reference = "MED-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  // Record a pending order (best-effort — needs the signed-in user's token
  // so row-level security allows the insert).
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let orderId: string | null = null;

  if (supaUrl && supaKey && body.accessToken) {
    try {
      const userRes = await fetch(`${supaUrl}/auth/v1/user`, {
        headers: { apikey: supaKey, Authorization: `Bearer ${body.accessToken}` },
      });
      const user = userRes.ok ? await userRes.json() : null;
      if (user?.id) {
        const r = await fetch(`${supaUrl}/rest/v1/orders`, {
          method: "POST",
          headers: {
            apikey: supaKey,
            Authorization: `Bearer ${body.accessToken}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            user_id: user.id,
            plan: plan.id,
            amount_pkr: plan.pricePkr,
            credits: plan.credits,
            method,
            reference,
            status: "pending",
          }),
        });
        if (r.ok) {
          const rows = await r.json();
          orderId = rows?.[0]?.id ?? null;
        }
      }
    } catch {
      // best-effort; still return instructions below
    }
  }

  return json({
    ok: true,
    orderId,
    reference,
    planId: plan.id,
    planName: plan.name,
    amountPkr: plan.pricePkr,
    credits: plan.credits,
    method,
    status: "pending",
  });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
