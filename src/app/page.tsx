"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { Orb } from "@/components/Orb";
import { ArrowRightIcon } from "@/components/icons";

export default function WelcomePage() {
  const router = useRouter();
  const { session, configured } = useSession();
  const signedIn = configured && !!session;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-between px-6 py-10 text-center">
      <div className="pt-6">
        <span className="glass rounded-full px-4 py-1.5 text-xs font-medium text-violet-700">
          🩺 Medical AI Assistant
        </span>
      </div>

      <div className="flex flex-col items-center">
        <h1 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          Your <span className="brand-text">Smart Health</span> Assistant
        </h1>

        <div className="relative my-10">
          <div className="animate-float">
            <Orb size={190} />
          </div>
          <span className="glass absolute -left-6 top-2 rounded-2xl rounded-bl-sm px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg">
            Hello! 👋
          </span>
        </div>

        <p className="max-w-sm text-[15px] leading-relaxed text-slate-500">
          Understand your symptoms, decode lab results, and know when to see a doctor —
          instant guidance, anytime.
        </p>
      </div>

      <div className="w-full max-w-md">
        {signedIn ? (
          <button
            onClick={() => router.push("/chat")}
            className="brand-gradient flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold text-white shadow-xl shadow-violet-500/30 transition active:scale-[0.99]"
          >
            Continue to app <ArrowRightIcon />
          </button>
        ) : (
          <>
            <Link
              href="/signup"
              className="brand-gradient flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold text-white shadow-xl shadow-violet-500/30 transition active:scale-[0.99]"
            >
              Get started <ArrowRightIcon />
            </Link>
            <p className="mt-4 text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-violet-600 hover:underline">
                Log in
              </Link>
            </p>
          </>
        )}
        <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
          Informational only — not a diagnosis or prescription. In an emergency, call your
          local emergency number.
        </p>
      </div>
    </div>
  );
}
