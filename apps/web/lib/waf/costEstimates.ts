import type { AzureServiceType } from '@/lib/state/types';

/**
 * Estimated monthly cost (USD) for each Azure service type.
 * Based on typical production SKUs in East US region.
 * These are rough estimates for architectural planning — not billing-accurate.
 */
export const COST_ESTIMATES: Record<AzureServiceType, number> = {
  'app-service': 250,
  'function-app': 75,
  'virtual-machine': 150,
  'container-apps': 75,
  'aks': 350,
  'azure-sql': 450,
  'cosmos-db': 200,
  'storage-account': 50,
  'redis-cache': 225,
  'virtual-network': 0,
  'application-gateway': 250,
  'load-balancer': 25,
  'front-door': 335,
  'key-vault': 5,
  'api-management': 50,
  'service-bus': 50,
  'event-hub': 275,
  'azure-openai': 1000,
  'entra-id': 0,
  'log-analytics': 50,
  'application-insights': 25,
  'ai-search': 250,
  'ddos-protection': 2944,
  'event-grid': 1,
  'static-web-app': 10,
  'resource-group': 0,
};
