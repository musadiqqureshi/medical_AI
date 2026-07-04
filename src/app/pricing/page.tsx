"use client";

import { useRouter } from "next/navigation";
import { PLANS, formatPkr } from "@/lib/plans";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeftIcon, CheckIcon, SparkleIcon } from "@/components/icons";

export default function PricingPage() {
  const router = useRouter();

  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-4xl px-5 pb-44 pt-8 md:px-8 md:pt-12">
      <header className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="glass grid h-10 w-10 place-items-center rounded-full text-slate-600"
          aria-label="Back"
        >
          <ArrowLeftIcon />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            Choose your plan
          </h1>
          <p className="text-sm text-slate-500">Prices in PKR · cancel anytime</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-3xl p-6 ${
              plan.highlight
                ? "brand-gradient text-white shadow-xl shadow-violet-500/30"
                : "glass text-slate-800"
            }`}
          >
            {plan.highlight && (
              <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold">
                <SparkleIcon className="h-3 w-3" /> Popular
              </span>
            )}
            <p className={`text-sm font-semibold ${plan.highlight ? "text-white/80" : "text-violet-600"}`}>
              {plan.name}
            </p>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-3xl font-extrabold">
                {plan.pricePkr === 0 ? "Free" : formatPkr(plan.pricePkr)}
              </span>
              {plan.pricePkr > 0 && (
                <span className={`pb-1 text-sm ${plan.highlight ? "text-white/70" : "text-slate-400"}`}>
                  {plan.period}
                </span>
              )}
            </div>
            <p className={`mt-1 text-sm ${plan.highlight ? "text-white/80" : "text-slate-500"}`}>
              {plan.tagline}
            </p>

            <ul className="my-5 flex flex-1 flex-col gap-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                      plan.highlight ? "bg-white/25 text-white" : "bg-violet-100 text-violet-600"
                    }`}
                  >
                    <CheckIcon className="h-3 w-3" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            {plan.pricePkr === 0 ? (
              <button
                onClick={() => router.push("/chat")}
                className="glass rounded-2xl py-3 text-sm font-semibold text-slate-700"
              >
                Current plan
              </button>
            ) : (
              <button
                onClick={() => router.push(`/checkout?plan=${plan.id}`)}
                className={`rounded-2xl py-3 text-sm font-semibold transition active:scale-[0.99] ${
                  plan.highlight
                    ? "bg-white text-violet-600"
                    : "brand-gradient text-white shadow-lg shadow-violet-500/30"
                }`}
              >
                Choose {plan.name}
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="mx-auto mt-6 max-w-lg text-center text-xs text-slate-400">
        Pay with JazzCash, Easypaisa, bank transfer, or debit/credit card. Your credits are
        added as soon as payment is confirmed.
      </p>

      <BottomNav />
    </div>
  );
}
