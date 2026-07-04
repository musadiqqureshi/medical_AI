"use client";

import { Orb } from "@/components/Orb";
import { BottomNav } from "@/components/BottomNav";

export default function FavoritesPage() {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-40 pt-8">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-slate-900">Saved</h1>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="animate-float mb-6 opacity-90">
          <Orb size={110} />
        </div>
        <p className="text-lg font-semibold text-slate-800">No saved chats yet</p>
        <p className="mt-1 max-w-xs text-sm text-slate-500">
          Bookmark a conversation from the chat screen and it will show up here.
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
