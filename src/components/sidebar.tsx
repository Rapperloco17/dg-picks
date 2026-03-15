"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Trophy, 
  Activity, 
  Users, 
  BarChart3, 
  Zap,
  Settings,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: Activity },
  { name: "Leagues", href: "/leagues", icon: Trophy },
  { name: "Live Matches", href: "/live", icon: Zap },
  { name: "Teams", href: "/teams", icon: Users },
  { name: "Predictions", href: "/predictions", icon: Target },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#0f0f0f] border-r border-[#262626] flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-[#262626]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
            <Target className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gold">DG Picks</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Pro Analytics</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-[#1a1a1a]"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-amber-500")} />
              {item.name}
              {item.name === "Live Matches" && (
                <span className="ml-auto w-2 h-2 rounded-full bg-red-500 live-indicator" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom stats */}
      <div className="p-4 border-t border-[#262626]">
        <div className="glass rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Model Accuracy</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-gold">44.6%</span>
            <span className="text-xs text-zinc-400 mb-1">last 30 days</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
