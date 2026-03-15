"use client";

import { Search, Bell, Calendar } from "lucide-react";
import { format } from "date-fns";

export function Header() {
  return (
    <header className="h-16 bg-[#0f0f0f] border-b border-[#262626] flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search teams, leagues, matches..."
            className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Date */}
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <Calendar className="w-4 h-4" />
          <span>{format(new Date(), "MMM d, yyyy")}</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-zinc-400 hover:text-zinc-100 hover:bg-[#1a1a1a] rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
        </button>

        {/* User */}
        <div className="flex items-center gap-3 pl-4 border-l border-[#262626]">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-zinc-100">Admin</p>
            <p className="text-xs text-zinc-500">Pro Plan</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-black font-bold text-sm">
            A
          </div>
        </div>
      </div>
    </header>
  );
}
