/**
 * Mapping of Azure service types to official Microsoft Azure Architecture Icons
 * Icons downloaded from: https://learn.microsoft.com/en-us/azure/architecture/icons/
 */

import type { AzureServiceType } from '@/lib/state/types';

/**
 * Maps service types to their official Azure icon file paths
 * All paths are relative to /azure-icons/Azure_Public_Service_Icons/Icons/
 */
export const AZURE_ICON_PATHS: Record<AzureServiceType, string> = {
  // Compute
  'app-service': 'app services/10035-icon-service-App-Services.svg',
  'function-app': 'compute/10029-icon-service-Function-Apps.svg',
  'virtual-machine': 'compute/10021-icon-service-Virtual-Machine.svg',
  'container-apps': 'containers/10104-icon-service-Container-Instances.svg',
  'aks': 'compute/10023-icon-service-Kubernetes-Services.svg',

  // Databases
  'azure-sql': 'databases/02390-icon-service-Azure-SQL.svg',
  'cosmos-db': 'databases/10121-icon-service-Azure-Cosmos-DB.svg',

  // Storage
  'storage-account': 'storage/10086-icon-service-Storage-Accounts.svg',
  'redis-cache': 'new icons/03675-icon-service-Azure-Managed-Redis.svg',

  // Networking
  'virtual-network': 'networking/10061-icon-service-Virtual-Networks.svg',
  'application-gateway': 'networking/10076-icon-service-Application-Gateways.svg',
  'load-balancer': 'networking/10062-icon-service-Load-Balancers.svg',
  'front-door': 'networking/10073-icon-service-Front-Door-and-CDN-Profiles.svg',

  // Security
  'key-vault': 'security/10245-icon-service-Key-Vaults.svg',

  // Integration
  'api-management': 'integration/10042-icon-service-API-Management-Services.svg',
  'service-bus': 'integration/10836-icon-service-Azure-Service-Bus.svg',
  'event-hub': 'analytics/00039-icon-service-Event-Hubs.svg',

  // AI + Machine Learning
  'azure-openai': 'ai + machine learning/03438-icon-service-Azure-OpenAI.svg',
  'ai-search': 'app services/10044-icon-service-Cognitive-Search.svg',

  // Identity
  'entra-id': 'identity/10224-icon-service-Entra-Connect-Health.svg',

  // Management + Governance
  'log-analytics': 'analytics/00009-icon-service-Log-Analytics-Workspaces.svg',
  'application-insights': 'devops/00012-icon-service-Application-Insights.svg',

  // Other services
  'ddos-protection': 'networking/10072-icon-service-DDoS-Protection-Plans.svg',
  'event-grid': 'integration/10206-icon-service-Event-Grid-Topics.svg',
  'static-web-app': 'web/01007-icon-service-Static-Apps.svg',

  // Containers (groups)
  'resource-group': 'general/10007-icon-service-Resource-Groups.svg',
};

/**
 * Get the full path to an Azure service icon
 */
export function getAzureIconPath(serviceType: AzureServiceType): string {
  const iconPath = AZURE_ICON_PATHS[serviceType];
  if (!iconPath) {
    console.warn(`No icon mapping found for service type: ${serviceType}`);
    return '/azure-icons/Azure_Public_Service_Icons/Icons/general/10007-icon-service-Resource-Groups.svg'; // fallback
  }
  return `/azure-icons/Azure_Public_Service_Icons/Icons/${iconPath}`;
}
