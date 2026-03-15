"use client";

import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

interface OddsData {
  home: number;
  draw: number;
  away: number;
}

interface OddsDisplayProps {
  odds: OddsData | null;
  title?: string;
  showTrend?: boolean;
  size?: "sm" | "md" | "lg";
}

export function OddsDisplay({ 
  odds, 
  title = "Odds", 
  showTrend = true,
  size = "md" 
}: OddsDisplayProps) {
  if (!odds || (!odds.home && !odds.draw && !odds.away)) {
    return (
      <div className="text-xs text-zinc-500 italic">
        No odds available
      </div>
    );
  }

  const sizeClasses = {
    sm: {
      container: "p-2",
      title: "text-[10px]",
      label: "text-[10px]",
      value: "text-sm",
      padding: "py-1 px-2",
    },
    md: {
      container: "p-3",
      title: "text-xs",
      label: "text-xs",
      value: "text-lg",
      padding: "py-2 px-3",
    },
    lg: {
      container: "p-4",
      title: "text-sm",
      label: "text-sm",
      value: "text-2xl",
      padding: "py-3 px-4",
    },
  };

  const classes = sizeClasses[size];

  // Calcular el favorito
  const minOdd = Math.min(odds.home || 999, odds.draw || 999, odds.away || 999);
  const favorite = minOdd === odds.home ? 'home' : minOdd === odds.draw ? 'draw' : 'away';

  return (
    <div className={`bg-gradient-to-r from-amber-500/10 to-transparent rounded-lg border border-amber-500/20 ${classes.container}`}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-amber-500" />
        <h4 className={`${classes.title} font-bold text-amber-500`}>{title}</h4>
        {showTrend && (
          <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-400">
            {favorite === 'home' ? 'Home Fav' : favorite === 'away' ? 'Away Fav' : 'Balanced'}
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {/* Home */}
        <div className={`bg-[#262626] rounded-lg ${classes.padding} text-center ${favorite === 'home' ? 'ring-1 ring-emerald-500' : ''}`}>
          <p className={`${classes.label} text-zinc-500 mb-1`}>1</p>
          <p className={`${classes.value} font-bold ${favorite === 'home' ? 'text-emerald-400' : 'text-zinc-100'}`}>
            {odds.home?.toFixed(2) || '-'}
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">Home</p>
        </div>
        
        {/* Draw */}
        <div className={`bg-[#262626] rounded-lg ${classes.padding} text-center ${favorite === 'draw' ? 'ring-1 ring-amber-500' : ''}`}>
          <p className={`${classes.label} text-zinc-500 mb-1`}>X</p>
          <p className={`${classes.value} font-bold ${favorite === 'draw' ? 'text-amber-400' : 'text-zinc-100'}`}>
            {odds.draw?.toFixed(2) || '-'}
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">Draw</p>
        </div>
        
        {/* Away */}
        <div className={`bg-[#262626] rounded-lg ${classes.padding} text-center ${favorite === 'away' ? 'ring-1 ring-blue-500' : ''}`}>
          <p className={`${classes.label} text-zinc-500 mb-1`}>2</p>
          <p className={`${classes.value} font-bold ${favorite === 'away' ? 'text-blue-400' : 'text-zinc-100'}`}>
            {odds.away?.toFixed(2) || '-'}
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">Away</p>
        </div>
      </div>
    </div>
  );
}
