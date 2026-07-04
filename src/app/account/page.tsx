"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { useCredits } from "@/lib/useCredits";
import { supabase } from "@/lib/supabase";
import { Orb } from "@/components/Orb";
import { BottomNav } from "@/components/BottomNav";
import { LogoutIcon, SparkleIcon } from "@/components/icons";

export default function AccountPage() {
  const router = useRouter();
  const { session, configured } = useSession();
  const { credits, plan } = useCredits();

  const name =
    (session?.user?.user_metadata?.full_name as string) ||
    session?.user?.email?.split("@")[0] ||
    "Guest";
  const email = session?.user?.email || "Not signed in";

  async function signOut() {
    await supabase?.auth.signOut();
    router.replace("/");
  }

  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-md px-5 pb-40 pt-8">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-slate-900">Account</h1>

      <div className="glass mb-4 flex items-center gap-4 rounded-3xl p-5">
        <Orb size={72} />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-slate-800">{name}</p>
          <p className="truncate text-sm text-slate-500">{email}</p>
        </div>
      </div>

      <div className="glass mb-4 flex items-center justify-between rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <span className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white">
            <SparkleIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold capitalize text-slate-800">{plan} plan</p>
            <p className="text-xs text-slate-500">
              {credits ?? "—"} messages left
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/pricing")}
          className="rounded-full border border-violet-300 px-4 py-1.5 text-xs font-semibold text-violet-600"
        >
          Upgrade
        </button>
      </div>

      {configured && session ? (
        <button
          onClick={signOut}
          className="glass flex w-full items-center justify-center gap-2 rounded-3xl p-4 text-sm font-semibold text-red-500"
        >
          <LogoutIcon /> Sign out
        </button>
      ) : (
        <button
          onClick={() => router.push("/login")}
          className="brand-gradient flex w-full items-center justify-center gap-2 rounded-3xl p-4 text-sm font-semibold text-white"
        >
          Log in
        </button>
      )}

      <BottomNav />
    </div>
  );
}
