"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { Orb } from "@/components/Orb";
import { BottomNav } from "@/components/BottomNav";
import { BellIcon, PaperclipIcon, SparkleIcon } from "@/components/icons";

type Category = { label: string; emoji: string; tint: string; ask: string; tag: string };

const CATEGORIES: Category[] = [
  { label: "Symptom Check", emoji: "🩺", tint: "from-violet-500 to-purple-500", tag: "Symptoms", ask: "I'd like to check some symptoms I'm having." },
  { label: "Lab Results", emoji: "🧪", tint: "from-sky-500 to-blue-500", tag: "Labs", ask: "Help me understand my lab results — I'll upload a photo." },
  { label: "Medications", emoji: "💊", tint: "from-pink-500 to-rose-500", tag: "Meds", ask: "Help me set up a schedule for my medications." },
  { label: "Find Care", emoji: "🔎", tint: "from-orange-500 to-amber-500", tag: "Care", ask: "Help me figure out what kind of care I should seek." },
];

const HISTORY = [
  { title: "Sore throat", preview: "I've had a sore throat and mild fever for 2 days…", tag: "Symptoms" },
  { title: "Blood test results", preview: "Can you explain what my CBC values mean?", tag: "Labs" },
  { title: "Medication schedule", preview: "Set reminders for my blood pressure meds.", tag: "Meds" },
  { title: "Headache guidance", preview: "What could cause a headache behind my eyes?", tag: "Symptoms" },
];

const FILTERS = ["All", "Symptoms", "Labs", "Meds", "Care"];

export default function HomePage() {
  const router = useRouter();
  const { session, configured } = useSession();
  const [filter, setFilter] = useState("All");

  const name =
    (session?.user?.user_metadata?.full_name as string)?.split(" ")[0] ||
    session?.user?.email?.split("@")[0] ||
    "there";

  const goChat = (ask?: string) =>
    router.push(ask ? `/chat?ask=${encodeURIComponent(ask)}` : "/chat");

  const historyShown =
    filter === "All" ? HISTORY : HISTORY.filter((h) => h.tag === filter);

  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-md px-5 pb-40 pt-8">
      {/* Greeting */}
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Hi, {name}
          </h1>
          <p className="text-sm text-slate-500">How can I help you today?</p>
        </div>
        <button className="glass relative grid h-11 w-11 place-items-center rounded-full text-slate-600">
          <BellIcon />
          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white" />
        </button>
      </header>

      {/* Pro / hero card */}
      <button
        onClick={() => goChat()}
        className="glass mb-5 flex w-full items-center gap-4 overflow-hidden rounded-3xl p-4 text-left"
      >
        <div className="animate-float shrink-0">
          <Orb size={92} />
        </div>
        <div className="min-w-0 flex-1">
          <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
            <SparkleIcon className="h-3 w-3" /> Unlimited with Pro
          </span>
          <p className="text-[17px] font-bold leading-snug text-slate-800">
            Use AI at full power
          </p>
          <span className="mt-2 inline-block rounded-full border border-violet-300 px-4 py-1.5 text-xs font-semibold text-violet-600">
            Get started
          </span>
        </div>
      </button>

      {/* Categories */}
      <div className="mb-6 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((c) => (
          <button
            key={c.label}
            onClick={() => goChat(c.ask)}
            className="glass flex w-32 shrink-0 flex-col gap-4 rounded-3xl p-4 text-left"
          >
            <span
              className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${c.tint} text-xl shadow-md`}
            >
              {c.emoji}
            </span>
            <span className="text-sm font-semibold text-slate-800">{c.label}</span>
          </button>
        ))}
      </div>

      {/* History */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">History</h2>
        <button className="text-sm font-medium text-violet-600">View all</button>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === f
                ? "brand-gradient text-white shadow-md shadow-violet-500/30"
                : "glass text-slate-600"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {historyShown.map((h) => (
          <button
            key={h.title}
            onClick={() => goChat(h.preview)}
            className="glass rounded-2xl px-4 py-3 text-left"
          >
            <p className="text-sm font-semibold text-slate-800">{h.title}</p>
            <p className="truncate text-xs text-slate-500">{h.preview}</p>
          </button>
        ))}
        {historyShown.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Nothing here yet.</p>
        )}
      </div>

      {/* Quick message bar */}
      <button
        onClick={() => goChat()}
        className="glass-strong fixed inset-x-0 bottom-24 mx-auto flex w-[min(100%-2.5rem,24rem)] items-center gap-3 rounded-full px-4 py-3 text-left shadow-lg"
      >
        <PaperclipIcon className="h-5 w-5 text-slate-400" />
        <span className="flex-1 text-sm text-slate-400">Message…</span>
        <span className="flex items-center gap-1 text-sm font-semibold text-violet-600">
          <SparkleIcon className="h-4 w-4" /> 24
        </span>
      </button>

      <BottomNav />
    </div>
  );
}
