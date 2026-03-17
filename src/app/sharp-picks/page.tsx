import { ValuePicksDashboard } from '@/components/sharbet/ValuePicksDashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sharp Picks | DG Picks',
  description: 'Picks de valor detectados con modelo Poisson y análisis de edge'
};

export default function SharpPicksPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <ValuePicksDashboard />
      </div>
    </main>
  );
}
