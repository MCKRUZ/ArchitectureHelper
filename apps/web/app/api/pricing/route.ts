import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for Azure Retail Prices API.
 * Avoids CORS issues and adds server-side caching.
 * https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices
 */

const AZURE_PRICING_API = 'https://prices.azure.com/api/retail/prices';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const filter = searchParams.get('$filter');

  if (!filter) {
    return NextResponse.json(
      { error: 'Missing $filter parameter' },
      { status: 400 },
    );
  }

  try {
    const url = new URL(AZURE_PRICING_API);
    url.searchParams.set('$filter', filter);

    const response = await fetch(url.toString(), {
      next: { revalidate: 900 }, // 15-minute server-side cache
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Azure API returned ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to fetch Azure prices: ${message}` },
      { status: 502 },
    );
  }
}
