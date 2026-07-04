"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HomeIcon, ChatIcon, HeartIcon, UserIcon, MicIcon } from "./icons";

// The floating bottom tab bar with a raised center mic button (per mockup).
export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-4">
      <div className="glass-strong pointer-events-auto flex w-[min(100%-1.5rem,26rem)] items-center justify-between rounded-[1.75rem] px-6 py-2.5 shadow-xl">
        <Tab href="/home" label="Home" active={pathname === "/home"}>
          <HomeIcon />
        </Tab>
        <Tab href="/chat" label="Chat" active={pathname === "/chat"}>
          <ChatIcon />
        </Tab>

        {/* Raised center mic — jumps into chat */}
        <button
          onClick={() => router.push("/chat")}
          aria-label="Start talking"
          className="brand-gradient -mt-8 grid h-16 w-16 shrink-0 place-items-center rounded-full text-white shadow-lg shadow-violet-500/40 ring-4 ring-white/70 transition active:scale-95"
        >
          <MicIcon className="h-6 w-6" />
        </button>

        <Tab href="/favorites" label="Saved" active={pathname === "/favorites"}>
          <HeartIcon />
        </Tab>
        <Tab href="/account" label="Account" active={pathname === "/account"}>
          <UserIcon />
        </Tab>
      </div>
    </nav>
  );
}

function Tab({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex w-12 flex-col items-center gap-0.5 text-[10px] font-medium transition ${
        active ? "text-violet-600" : "text-slate-400"
      }`}
    >
      {children}
      <span>{label}</span>
    </Link>
  );
}
