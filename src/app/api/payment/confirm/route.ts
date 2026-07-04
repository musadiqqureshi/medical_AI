import { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Grants credits for a paid order. SECURE endpoint — must be called by:
 *   • a payment gateway webhook (e.g. Safepay), or
 *   • an admin confirming a JazzCash/Easypaisa/bank transfer,
 * with the shared PAYMENT_WEBHOOK_SECRET header. It uses the Supabase
 * service-role key (never exposed to the browser) to update credits.
 *
 * Body: { reference: string }
 */
export async function POST(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;

  if (!serviceKey || !supaUrl) {
    return json({ error: "Payment confirmation not configured (missing service role key)." }, 501);
  }
  if (!secret || req.headers.get("x-payment-secret") !== secret) {
    return json({ error: "Unauthorized." }, 401);
  }

  let reference: string | undefined;
  try {
    reference = (await req.json())?.reference;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  if (!reference) return json({ error: "Missing reference." }, 400);

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  // Look up the pending order by reference.
  const oRes = await fetch(
    `${supaUrl}/rest/v1/orders?reference=eq.${encodeURIComponent(reference)}&status=eq.pending&select=*`,
    { headers },
  );
  const orders = oRes.ok ? await oRes.json() : [];
  const order = orders?.[0];
  if (!order) return json({ error: "Order not found or already processed." }, 404);

  // Grant credits (RPC runs with definer rights).
  const gRes = await fetch(`${supaUrl}/rest/v1/rpc/grant_credits`, {
    method: "POST",
    headers,
    body: JSON.stringify({ p_user: order.user_id, p_amount: order.credits, p_plan: order.plan }),
  });
  if (!gRes.ok) return json({ error: "Failed to grant credits." }, 500);

  // Mark the order paid.
  await fetch(`${supaUrl}/rest/v1/orders?id=eq.${order.id}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ status: "paid" }),
  });

  return json({ ok: true, credited: order.credits });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
