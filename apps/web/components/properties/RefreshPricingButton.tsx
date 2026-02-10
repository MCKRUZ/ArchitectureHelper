'use client';

import { useState, useCallback } from 'react';
import type { AzureServiceType } from '@/lib/state/types';
import { fetchAzureRetailPrices, buildServiceFilter } from '@/lib/pricing/azureRetailPrices';

/** Maps our service types to Azure Retail API service names */
const SERVICE_API_NAMES: Partial<Record<AzureServiceType, string>> = {
  'app-service': 'Azure App Service',
  'function-app': 'Functions',
  'virtual-machine': 'Virtual Machines',
  'container-apps': 'Azure Container Apps',
  'aks': 'Azure Kubernetes Service',
  'azure-sql': 'SQL Database',
  'cosmos-db': 'Azure Cosmos DB',
  'storage-account': 'Storage',
  'redis-cache': 'Azure Cache for Redis',
  'application-gateway': 'Application Gateway',
  'load-balancer': 'Load Balancer',
  'front-door': 'Azure Front Door Service',
  'key-vault': 'Key Vault',
  'api-management': 'API Management',
  'service-bus': 'Service Bus',
  'event-hub': 'Event Hubs',
  'event-grid': 'Event Grid',
  'azure-openai': 'Azure OpenAI Service',
  'ai-search': 'Azure AI Search',
  'log-analytics': 'Log Analytics',
  'application-insights': 'Application Insights',
  'ddos-protection': 'Azure DDoS Protection',
  'static-web-app': 'Azure Static Web Apps',
};

interface RefreshPricingButtonProps {
  serviceType: AzureServiceType;
  region: string;
  onPricesLoaded?: (prices: Array<{ skuName: string; retailPrice: number; meterName: string }>) => void;
}

export function RefreshPricingButton({ serviceType, region, onPricesLoaded }: RefreshPricingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<'success' | 'error' | null>(null);

  const apiServiceName = SERVICE_API_NAMES[serviceType];

  const handleRefresh = useCallback(async () => {
    if (!apiServiceName) return;

    setIsLoading(true);
    setLastResult(null);

    try {
      const filter = buildServiceFilter(apiServiceName, region || 'eastus');
      const prices = await fetchAzureRetailPrices(filter);

      setLastResult('success');
      onPricesLoaded?.(
        prices
          .filter(p => p.isPrimaryMeterRegion && p.retailPrice > 0)
          .map(p => ({ skuName: p.skuName, retailPrice: p.retailPrice, meterName: p.meterName })),
      );
    } catch {
      setLastResult('error');
    } finally {
      setIsLoading(false);
    }
  }, [apiServiceName, region, onPricesLoaded]);

  if (!apiServiceName) return null;

  return (
    <div className="mt-2">
      <button
        onClick={handleRefresh}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Spinner />
            Fetching live prices...
          </>
        ) : (
          <>
            <RefreshIcon />
            Refresh from Azure
          </>
        )}
      </button>
      {lastResult === 'success' && (
        <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 text-center">
          Live prices loaded (15-min cache)
        </p>
      )}
      {lastResult === 'error' && (
        <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 text-center">
          Failed to fetch prices. Using local estimates.
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
