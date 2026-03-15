import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY || process.env.NEXT_PUBLIC_API_FOOTBALL_KEY || '';
const API_URL = process.env.NEXT_PUBLIC_API_FOOTBALL_URL || 'https://v3.football.api-sports.io';

// Simple in-memory cache for API responses
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Rate limiting
let lastCallTime = 0;
const MIN_DELAY = 6000; // 6 seconds between calls

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || '/fixtures';
  
  // Build cache key
  const cacheKey = `${endpoint}?${searchParams.toString()}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[API Route] Cache hit for:', endpoint);
    return NextResponse.json(cached.data);
  }
  
  // Rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < MIN_DELAY) {
    const waitTime = MIN_DELAY - timeSinceLastCall;
    console.log(`[API Route] Rate limiting: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Build params object from all search params except 'endpoint'
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key !== 'endpoint') {
      params[key] = value;
    }
  });

  // Build URL
  const url = new URL(`${API_URL}${endpoint}`);
  console.log('[API Route] Received params:', params);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      // Sanitize date parameters (from/to) to YYYY-MM-DD format
      let sanitizedValue = value;
      if ((key === 'from' || key === 'to')) {
        // Extract YYYY-MM-DD from ISO date string or any date format
        const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        console.log(`[API Route] Date param ${key}: ${value} -> match:`, dateMatch);
        if (dateMatch) {
          sanitizedValue = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        }
      }
      url.searchParams.append(key, sanitizedValue);
    }
  });

  console.log('[API Route] Fetching:', url.toString());

  try {
    lastCallTime = Date.now();
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Store in cache
    cache.set(cacheKey, { data, timestamp: Date.now() });
    
    // Clean old cache entries periodically
    if (cache.size > 100) {
      const now = Date.now();
      for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > CACHE_TTL) {
          cache.delete(key);
        }
      }
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Route] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch from football API' },
      { status: 500 }
    );
  }
}
