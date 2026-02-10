/**
 * Client for fetching live Azure retail prices via our API proxy.
 * Includes 15-minute in-memory cache to avoid redundant calls.
 */

export interface AzureRetailPrice {
  skuName: string;
  productName: string;
  meterName: string;
  retailPrice: number;
  unitOfMeasure: string;
  armRegionName: string;
  currencyCode: string;
  type: string;
  isPrimaryMeterRegion: boolean;
}

interface PricingApiResponse {
  Items: AzureRetailPrice[];
  NextPageLink: string | null;
  Count: number;
}

// In-memory cache with 15-min TTL
const cache = new Map<string, { data: AzureRetailPrice[]; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function getCacheKey(filter: string): string {
  return filter;
}

/**
 * Fetch retail prices from Azure via our API proxy.
 * @param filter - OData filter string, e.g.
 *   "serviceName eq 'Virtual Machines' and armRegionName eq 'eastus' and priceType eq 'Consumption'"
 */
export async function fetchAzureRetailPrices(filter: string): Promise<AzureRetailPrice[]> {
  const key = getCacheKey(filter);
  const cached = cache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url = `/api/pricing?${new URLSearchParams({ '$filter': filter })}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Pricing API returned ${response.status}`);
  }

  const json: PricingApiResponse = await response.json();
  const items = json.Items ?? [];

  cache.set(key, { data: items, expiresAt: Date.now() + CACHE_TTL_MS });
  return items;
}

/**
 * Build a common OData filter for a given service and region.
 */
export function buildServiceFilter(serviceName: string, region: string): string {
  return `serviceName eq '${serviceName}' and armRegionName eq '${region}' and priceType eq 'Consumption'`;
}
