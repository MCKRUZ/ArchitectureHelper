/**
 * Azure Service Classification
 *
 * Single source of truth for categorizing Azure services into architectural roles.
 * Used by architectureValidator.ts, wafReview.ts, and deepWafReview.ts.
 */

import type { AzureServiceType } from '@/lib/state/types';

/**
 * Services that are global/regional and should NEVER be placed inside a VNet/subnet.
 */
export const GLOBAL_SERVICES: readonly AzureServiceType[] = [
  'front-door',
  'entra-id',
  'ddos-protection',
  'log-analytics',
  'application-insights',
] as const;

/**
 * Compute services — should be in App Subnet, connected to Key Vault + App Insights.
 */
export const COMPUTE_SERVICES: readonly AzureServiceType[] = [
  'app-service',
  'function-app',
  'container-apps',
  'aks',
  'virtual-machine',
] as const;

/**
 * Data services — should be in Data Subnet, accessed via private endpoint.
 */
export const DATA_SERVICES: readonly AzureServiceType[] = [
  'azure-sql',
  'cosmos-db',
  'redis-cache',
  'storage-account',
] as const;

/**
 * Networking/gateway services — should be in App Subnet or dedicated Gateway Subnet.
 */
export const NETWORKING_SERVICES: readonly AzureServiceType[] = [
  'api-management',
  'application-gateway',
] as const;

/**
 * Security services — can be in App Subnet or dedicated Security Subnet.
 */
export const SECURITY_SERVICES: readonly AzureServiceType[] = [
  'key-vault',
] as const;

/**
 * AI/ML services — should be in Data Subnet (accessed via private endpoint).
 */
export const AI_SERVICES: readonly AzureServiceType[] = [
  'azure-openai',
  'ai-search',
] as const;

/**
 * Integration/messaging services — should be in Data Subnet for connectivity.
 */
export const INTEGRATION_SERVICES: readonly AzureServiceType[] = [
  'event-grid',
  'service-bus',
  'event-hub',
] as const;

/**
 * Web services — should be in App Subnet.
 */
export const WEB_SERVICES: readonly AzureServiceType[] = [
  'static-web-app',
] as const;

/**
 * Services that require private endpoint connections (no public access in production).
 */
export const PRIVATE_ENDPOINT_SERVICES: readonly AzureServiceType[] = [
  'azure-sql',
  'cosmos-db',
  'storage-account',
  'redis-cache',
  'azure-openai',
  'ai-search',
  'key-vault',
  'service-bus',
  'event-hub',
] as const;

/**
 * Services that are entry points to the architecture (web-facing).
 */
export const ENTRY_POINT_SERVICES: readonly AzureServiceType[] = [
  'front-door',
  'application-gateway',
  'load-balancer',
  'api-management',
] as const;

/**
 * Observability services.
 */
export const OBSERVABILITY_SERVICES: readonly AzureServiceType[] = [
  'application-insights',
  'log-analytics',
] as const;

// Pre-built Sets for O(1) lookups
export const globalServiceSet = new Set<AzureServiceType>(GLOBAL_SERVICES);
export const computeServiceSet = new Set<AzureServiceType>(COMPUTE_SERVICES);
export const dataServiceSet = new Set<AzureServiceType>(DATA_SERVICES);
export const networkingServiceSet = new Set<AzureServiceType>(NETWORKING_SERVICES);
export const securityServiceSet = new Set<AzureServiceType>(SECURITY_SERVICES);
export const aiServiceSet = new Set<AzureServiceType>(AI_SERVICES);
export const integrationServiceSet = new Set<AzureServiceType>(INTEGRATION_SERVICES);
export const webServiceSet = new Set<AzureServiceType>(WEB_SERVICES);
export const privateEndpointServiceSet = new Set<AzureServiceType>(PRIVATE_ENDPOINT_SERVICES);
export const entryPointServiceSet = new Set<AzureServiceType>(ENTRY_POINT_SERVICES);
export const observabilityServiceSet = new Set<AzureServiceType>(OBSERVABILITY_SERVICES);

/**
 * Determine which subnet a service should belong to.
 * Returns 'app-subnet', 'data-subnet', or null (for global services).
 */
export function getTargetSubnet(serviceType: AzureServiceType): 'app-subnet' | 'data-subnet' | null {
  if (globalServiceSet.has(serviceType)) return null;
  if (dataServiceSet.has(serviceType)) return 'data-subnet';
  // Everything else goes to app-subnet
  return 'app-subnet';
}

/**
 * Check if a service type is a compute service (needs Key Vault + App Insights connections).
 */
export function isComputeService(serviceType: AzureServiceType): boolean {
  return computeServiceSet.has(serviceType);
}

/**
 * Check if a service type requires private endpoint access.
 */
export function requiresPrivateEndpoint(serviceType: AzureServiceType): boolean {
  return privateEndpointServiceSet.has(serviceType);
}
