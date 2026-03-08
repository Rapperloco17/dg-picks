'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Flame } from 'lucide-react';
import { formatEV, getEVColor, getGradeColor, getRecommendationLabel } from '@/lib/ev-calculator';

interface EVBadgeProps {
  ev?: number;
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function EVBadge({ ev = 0, grade, showIcon = true, size = 'md' }: EVBadgeProps) {
  const isPositive = ev > 0;
  const isStrong = ev >= 0.10;
  
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        sizeClasses[size],
        isStrong
          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
          : isPositive
          ? 'bg-green-500/20 border-green-500/50 text-green-400'
          : 'bg-red-500/20 border-red-500/50 text-red-400'
      )}
    >
      {showIcon && (
        isStrong ? (
          <Flame className="w-3 h-3" />
        ) : isPositive ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )
      )}
      <span>{formatEV(ev)} EV</span>
      {grade && (
        <span className={cn(
          'ml-1 px-1 rounded text-[10px]',
          grade === 'A' && 'bg-emerald-500/30 text-emerald-300',
          grade === 'B' && 'bg-green-500/30 text-green-300',
          grade === 'C' && 'bg-blue-500/30 text-blue-300',
          grade === 'D' && 'bg-yellow-500/30 text-yellow-300',
          grade === 'F' && 'bg-red-500/30 text-red-300'
        )}>
          {grade}
        </span>
      )}
    </div>
  );
}

interface GradeBadgeProps {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  size?: 'sm' | 'md' | 'lg';
}

export function GradeBadge({ grade, size = 'md' }: GradeBadgeProps) {
  const sizeClasses = {
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-6 h-6 text-xs',
    lg: 'w-8 h-8 text-sm',
  };

  const colors = {
    A: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
    B: 'bg-green-500/20 text-green-400 border-green-500/50',
    C: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    D: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    F: 'bg-red-500/20 text-red-400 border-red-500/50',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full border font-bold',
        sizeClasses[size],
        colors[grade]
      )}
    >
      {grade}
    </div>
  );
}

interface ProbabilityBarProps {
  probability: number;  // 0-100 o 0-1
  impliedProbability: number;  // 0-100 o 0-1
  size?: 'sm' | 'md' | 'lg';
}

export function ProbabilityBar({ probability, impliedProbability, size = 'md' }: ProbabilityBarProps) {
  const prob = probability > 1 ? probability : probability * 100;
  const impl = impliedProbability > 1 ? impliedProbability : impliedProbability * 100;
  const edge = prob - impl;

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">Prob: {prob.toFixed(1)}%</span>
        <span className="text-slate-500">Impl: {impl.toFixed(1)}%</span>
        <span className={cn(
          'font-medium',
          edge >= 5 ? 'text-emerald-400' : edge >= 0 ? 'text-green-400' : 'text-red-400'
        )}>
          Edge: {edge >= 0 ? '+' : ''}{edge.toFixed(1)}%
        </span>
      </div>
      <div className={cn('bg-slate-800 rounded-full overflow-hidden', heightClasses[size])}>
        {/* Implied probability (market) */}
        <div
          className="bg-slate-600 h-full float-left"
          style={{ width: `${impl}%` }}
        />
        {/* Edge (value) */}
        <div
          className={cn(
            'h-full float-left',
            edge >= 5 ? 'bg-emerald-500' : edge >= 0 ? 'bg-green-500' : 'bg-red-500'
          )}
          style={{ width: `${Math.abs(edge)}%` }}
        />
      </div>
    </div>
  );
}
