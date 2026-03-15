import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// TIER 1 - TOP ÉLITE
const TIER_1_LEAGUES = [
  39, 140, 135, 78, 61,  // Top 5 Europe
  2, 3, 848,             // European cups
  88, 94,                // Eredivisie, Primeira Liga
  71, 13, 16, 358, 128, 262, // Brasileirão, Libertadores, Sudamericana, Argentina, Liga MX, MLS
  99, 169, 155,          // Uruguay, Chile, Colombia
  98, 345,               // J1 League, Saudi
  32,                    // World Cup
];

// TIER 2 - MUY IMPORTANTES
const TIER_2_LEAGUES = [
  40, 141, 136, 79, 62,  // Championships
  144, 119, 172, 113, 103, 52, 244, 333, 203, 235, 345, 346, 197,
  418, 292,              // J2, K League
  96, 116, 117,          // Concacaf
];

// TIER 3 - RELEVANTES REGIONALES
const TIER_3_LEAGUES = [
  218, 1030, 196, 242, 343, 112, 384, 130,
  1132, 1133, 1134, 1135, 1136,
];

export async function POST() {
  try {
    const results = [];

    // Update Tier 1
    for (const id of TIER_1_LEAGUES) {
      const updated = await prisma.league.updateMany({
        where: { id },
        data: { tier: 1 },
      });
      if (updated.count > 0) {
        results.push({ id, tier: 1, status: 'updated' });
      }
    }

    // Update Tier 2
    for (const id of TIER_2_LEAGUES) {
      const updated = await prisma.league.updateMany({
        where: { id },
        data: { tier: 2 },
      });
      if (updated.count > 0) {
        results.push({ id, tier: 2, status: 'updated' });
      }
    }

    // Update Tier 3
    for (const id of TIER_3_LEAGUES) {
      const updated = await prisma.league.updateMany({
        where: { id },
        data: { tier: 3 },
      });
      if (updated.count > 0) {
        results.push({ id, tier: 3, status: 'updated' });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${results.length} leagues`,
      updated: results,
    });

  } catch (error: any) {
    console.error('Error updating tiers:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to update league tiers in database',
    tiers: {
      tier1: TIER_1_LEAGUES.length,
      tier2: TIER_2_LEAGUES.length,
      tier3: TIER_3_LEAGUES.length,
    },
  });
}
