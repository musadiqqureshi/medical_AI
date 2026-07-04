"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlan, formatPkr, type Plan } from "@/lib/plans";
import { supabase } from "@/lib/supabase";
import { ArrowLeftIcon, CheckIcon } from "@/components/icons";

type Method = "jazzcash" | "easypaisa" | "bank" | "card";

const METHODS: { id: Method; name: string; sub: string; badge: string; color: string }[] = [
  { id: "jazzcash", name: "JazzCash", sub: "Mobile wallet", badge: "J", color: "bg-red-500" },
  { id: "easypaisa", name: "Easypaisa", sub: "Mobile wallet", badge: "E", color: "bg-green-600" },
  { id: "bank", name: "Bank Transfer", sub: "IBFT / online banking", badge: "₨", color: "bg-slate-700" },
  { id: "card", name: "Debit / Credit Card", sub: "Visa · Mastercard", badge: "▭", color: "bg-violet-600" },
];

type Result = { reference: string; amountPkr: number; credits: number; method: Method };

export default function CheckoutPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [method, setMethod] = useState<Method>("jazzcash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("plan") || "";
    const p = getPlan(id);
    if (!p || p.pricePkr <= 0) router.replace("/pricing");
    else setPlan(p);
  }, [router]);

  async function pay() {
    if (!plan) return;
    setError(null);
    setLoading(true);
    try {
      const accessToken = supabase
        ? (await supabase.auth.getSession()).data.session?.access_token
        : undefined;
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, method, accessToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed.");
      setResult({ reference: data.reference, amountPkr: data.amountPkr, credits: data.credits, method });
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!plan) return null;

  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-lg px-5 pb-16 pt-8 md:pt-12">
      <header className="mb-6 flex items-center gap-3">
        <button
          onClick={() => (result ? setResult(null) : router.push("/pricing"))}
          className="glass grid h-10 w-10 place-items-center rounded-full text-slate-600"
          aria-label="Back"
        >
          <ArrowLeftIcon />
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Checkout</h1>
      </header>

      {/* Plan summary */}
      <div className="glass mb-5 flex items-center justify-between rounded-3xl p-5">
        <div>
          <p className="text-sm text-slate-500">{plan.name} plan</p>
          <p className="text-lg font-bold text-slate-800">
            {plan.credits.toLocaleString()} messages {plan.period}
          </p>
        </div>
        <p className="text-2xl font-extrabold text-slate-900">{formatPkr(plan.pricePkr)}</p>
      </div>

      {result ? (
        <PaymentInstructions plan={plan} result={result} onDone={() => router.push("/account")} />
      ) : (
        <>
          <h2 className="mb-3 text-sm font-semibold text-slate-600">Payment method</h2>
          <div className="mb-5 flex flex-col gap-2.5">
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`glass flex items-center gap-3 rounded-2xl p-3.5 text-left transition ${
                  method === m.id ? "ring-2 ring-violet-400" : ""
                }`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg font-bold text-white ${m.color}`}>
                  {m.badge}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.sub}</p>
                </div>
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full border ${
                    method === m.id ? "brand-gradient border-transparent text-white" : "border-slate-300"
                  }`}
                >
                  {method === m.id && <CheckIcon className="h-3 w-3" />}
                </span>
              </button>
            ))}
          </div>

          {error && <p className="mb-3 text-center text-sm text-red-500">{error}</p>}

          <button
            onClick={pay}
            disabled={loading}
            className="brand-gradient w-full rounded-2xl py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/30 transition active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? "Processing…" : `Pay ${formatPkr(plan.pricePkr)}`}
          </button>
          <p className="mt-3 text-center text-[11px] text-slate-400">
            Secure checkout. You’ll get payment details on the next step.
          </p>
        </>
      )}
    </div>
  );
}

function PaymentInstructions({
  plan,
  result,
  onDone,
}: {
  plan: Plan;
  result: Result;
  onDone: () => void;
}) {
  const acct =
    result.method === "jazzcash"
      ? process.env.NEXT_PUBLIC_PAY_JAZZCASH
      : result.method === "easypaisa"
        ? process.env.NEXT_PUBLIC_PAY_EASYPAISA
        : result.method === "bank"
          ? process.env.NEXT_PUBLIC_PAY_BANK
          : null;

  return (
    <div className="glass rounded-3xl p-6 text-center">
      <div className="brand-gradient mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl text-white">
        <CheckIcon className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">Almost there!</h2>

      {result.method === "card" ? (
        <p className="mt-2 text-sm text-slate-500">
          Card payments are processed via Safepay. Once your gateway keys are added, you’ll be
          redirected to a secure card page. For now, use a wallet or bank transfer below.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-500">
            Send <b className="text-slate-800">{formatPkr(result.amountPkr)}</b> to the account
            below and include your reference. Your {result.credits.toLocaleString()} credits are
            added once we confirm the payment.
          </p>
          <div className="my-4 space-y-2 rounded-2xl bg-white/60 p-4 text-left text-sm">
            <Row label="Send to" value={acct || "Set NEXT_PUBLIC_PAY_… in .env.local"} />
            <Row label="Amount" value={formatPkr(result.amountPkr)} />
            <Row label="Reference" value={result.reference} highlight />
          </div>
        </>
      )}

      <button
        onClick={onDone}
        className="mt-2 w-full rounded-2xl border border-violet-300 py-3 text-sm font-semibold text-violet-600"
      >
        Done
      </button>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${highlight ? "text-violet-600" : "text-slate-800"}`}>
        {value}
      </span>
    </div>
  );
}
