import type { AzureServiceType } from '@/lib/state/types';
import type { ServicePricingDescriptor } from '../types';

// Compute
import { appServiceDescriptor, functionAppDescriptor, virtualMachineDescriptor, containerAppsDescriptor, aksDescriptor } from './compute';
// Databases
import { azureSqlDescriptor, cosmosDbDescriptor, redisCacheDescriptor } from './databases';
// Storage
import { storageAccountDescriptor } from './storage';
// Networking
import { virtualNetworkDescriptor, applicationGatewayDescriptor, loadBalancerDescriptor, frontDoorDescriptor } from './networking';
// Security
import { keyVaultDescriptor, ddosProtectionDescriptor } from './security';
// Identity
import { entraIdDescriptor } from './identity';
// Integration
import { apiManagementDescriptor, serviceBusDescriptor, eventHubDescriptor, eventGridDescriptor } from './integration';
// AI
import { azureOpenaiDescriptor, aiSearchDescriptor } from './ai';
// Management
import { logAnalyticsDescriptor, applicationInsightsDescriptor } from './management';
// Web
import { staticWebAppDescriptor } from './web';

/**
 * Registry of pricing descriptors keyed by service type.
 * Groups (resource-group, virtual-network as group, subnet) have no pricing.
 */
export const PRICING_DESCRIPTORS: Partial<Record<AzureServiceType, ServicePricingDescriptor>> = {
  'app-service': appServiceDescriptor,
  'function-app': functionAppDescriptor,
  'virtual-machine': virtualMachineDescriptor,
  'container-apps': containerAppsDescriptor,
  'aks': aksDescriptor,
  'azure-sql': azureSqlDescriptor,
  'cosmos-db': cosmosDbDescriptor,
  'storage-account': storageAccountDescriptor,
  'redis-cache': redisCacheDescriptor,
  'virtual-network': virtualNetworkDescriptor,
  'application-gateway': applicationGatewayDescriptor,
  'load-balancer': loadBalancerDescriptor,
  'front-door': frontDoorDescriptor,
  'key-vault': keyVaultDescriptor,
  'ddos-protection': ddosProtectionDescriptor,
  'entra-id': entraIdDescriptor,
  'api-management': apiManagementDescriptor,
  'service-bus': serviceBusDescriptor,
  'event-hub': eventHubDescriptor,
  'event-grid': eventGridDescriptor,
  'azure-openai': azureOpenaiDescriptor,
  'ai-search': aiSearchDescriptor,
  'log-analytics': logAnalyticsDescriptor,
  'application-insights': applicationInsightsDescriptor,
  'static-web-app': staticWebAppDescriptor,
};
