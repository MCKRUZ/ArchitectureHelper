'use client';

import type { AzureServiceType } from '@/lib/state/types';

interface AzureServiceIconProps {
  serviceType: AzureServiceType;
  className?: string;
}

export function AzureServiceIcon({ serviceType, className = 'w-8 h-8' }: AzureServiceIconProps) {
  const Icon = ICONS[serviceType] || DefaultIcon;
  return <Icon className={className} />;
}

// Default icon for unknown services
function DefaultIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#0078D4" />
      <path d="M12 7v10M7 12h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// App Service
function AppServiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#0078D4" />
      <path d="M6 8h4v4H6V8z" fill="white" />
      <path d="M6 14h12M6 17h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Function App
function FunctionAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4h16v16H4V4z" fill="#FFA500" />
      <path d="M8 8l4 4-4 4M12 16h4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Virtual Machine
function VirtualMachineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="5" width="18" height="12" rx="1" fill="#0078D4" />
      <rect x="5" y="7" width="14" height="8" rx="1" fill="#50E6FF" />
      <path d="M8 19h8M12 17v2" stroke="#0078D4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Container Apps
function ContainerAppsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#326CE5" />
      <rect x="6" y="6" width="5" height="5" rx="1" fill="white" />
      <rect x="13" y="6" width="5" height="5" rx="1" fill="white" />
      <rect x="6" y="13" width="5" height="5" rx="1" fill="white" />
      <rect x="13" y="13" width="5" height="5" rx="1" fill="white" />
    </svg>
  );
}

// AKS (Kubernetes)
function AksIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="#326CE5" />
      <path d="M12 8l-4 2.5v5L12 18l4-2.5v-5L12 8z" fill="white" />
    </svg>
  );
}

// Azure SQL
function AzureSqlIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="6" rx="8" ry="3" fill="#0078D4" />
      <path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6" fill="#0078D4" />
      <ellipse cx="12" cy="6" rx="8" ry="3" fill="#50E6FF" />
      <path d="M4 10c0 1.66 3.58 3 8 3s8-1.34 8-3" stroke="#50E6FF" strokeWidth="1" />
      <path d="M4 14c0 1.66 3.58 3 8 3s8-1.34 8-3" stroke="#50E6FF" strokeWidth="1" />
    </svg>
  );
}

// Cosmos DB
function CosmosDbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#0078D4" />
      <ellipse cx="12" cy="12" rx="9" ry="4" stroke="#50E6FF" strokeWidth="1.5" fill="none" />
      <ellipse cx="12" cy="12" rx="9" ry="4" stroke="#50E6FF" strokeWidth="1.5" fill="none" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="4" stroke="#50E6FF" strokeWidth="1.5" fill="none" transform="rotate(120 12 12)" />
      <circle cx="12" cy="12" r="2" fill="white" />
    </svg>
  );
}

// Storage Account
function StorageAccountIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="16" height="4" rx="1" fill="#0078D4" />
      <rect x="4" y="10" width="16" height="4" rx="1" fill="#0078D4" />
      <rect x="4" y="16" width="16" height="4" rx="1" fill="#0078D4" />
      <circle cx="7" cy="6" r="1" fill="white" />
      <circle cx="7" cy="12" r="1" fill="white" />
      <circle cx="7" cy="18" r="1" fill="white" />
    </svg>
  );
}

// Redis Cache
function RedisCacheIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#DC382D" />
      <path d="M12 7v10M7 12h10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Virtual Network
function VirtualNetworkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#0078D4" />
      <circle cx="8" cy="8" r="2" fill="white" />
      <circle cx="16" cy="8" r="2" fill="white" />
      <circle cx="8" cy="16" r="2" fill="white" />
      <circle cx="16" cy="16" r="2" fill="white" />
      <path d="M10 8h4M10 16h4M8 10v4M16 10v4" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

// Application Gateway
function ApplicationGatewayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="8" width="20" height="8" rx="2" fill="#0078D4" />
      <path d="M6 12h2M10 12h2M14 12h2M18 12h2" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 4v4M12 16v4" stroke="#0078D4" strokeWidth="2" />
    </svg>
  );
}

// Load Balancer
function LoadBalancerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="5" r="3" fill="#0078D4" />
      <circle cx="6" cy="19" r="3" fill="#0078D4" />
      <circle cx="18" cy="19" r="3" fill="#0078D4" />
      <path d="M12 8v4M12 12l-6 4M12 12l6 4" stroke="#0078D4" strokeWidth="2" />
    </svg>
  );
}

// Front Door
function FrontDoorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 5h18v14H3V5z" fill="#0078D4" />
      <path d="M7 9h4v6H7V9z" fill="#50E6FF" />
      <circle cx="9" cy="15" r="0.5" fill="#0078D4" />
      <path d="M13 9h4v6h-4V9z" fill="white" />
    </svg>
  );
}

// Key Vault
function KeyVaultIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="10" width="14" height="10" rx="2" fill="#FFB900" />
      <path d="M12 4a4 4 0 00-4 4v2h8V8a4 4 0 00-4-4z" stroke="#FFB900" strokeWidth="2" fill="none" />
      <circle cx="12" cy="15" r="2" fill="white" />
      <path d="M12 17v2" stroke="white" strokeWidth="2" />
    </svg>
  );
}

// API Management
function ApiManagementIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#68217A" />
      <path d="M7 8h10M7 12h10M7 16h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Service Bus
function ServiceBusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="6" width="18" height="12" rx="2" fill="#0078D4" />
      <path d="M7 10h2v4H7v-4zM11 10h2v4h-2v-4zM15 10h2v4h-2v-4z" fill="white" />
    </svg>
  );
}

// Event Hub
function EventHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" fill="#0078D4" />
      <path d="M12 6v6l4 2" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="white" />
    </svg>
  );
}

// Azure OpenAI
function AzureOpenAiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="3" fill="#10A37F" />
      <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="white" />
    </svg>
  );
}

// Entra ID
function EntraIdIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="#0078D4" />
      <circle cx="12" cy="10" r="3" fill="white" />
      <path d="M12 14c-3 0-5 1.5-5 3v1h10v-1c0-1.5-2-3-5-3z" fill="white" />
    </svg>
  );
}

// Log Analytics
function LogAnalyticsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#0078D4" />
      <path d="M6 14l3-4 3 2 3-5 3 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 18h12" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

function ResourceGroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="3" fill="#3B82F6" />
      <rect x="6" y="6" width="12" height="12" rx="2" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" />
      <path d="M9 10h6M9 12h6M9 14h4" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// Icon mapping
const ICONS: Record<AzureServiceType, React.FC<{ className?: string }>> = {
  'app-service': AppServiceIcon,
  'function-app': FunctionAppIcon,
  'virtual-machine': VirtualMachineIcon,
  'container-apps': ContainerAppsIcon,
  'aks': AksIcon,
  'azure-sql': AzureSqlIcon,
  'cosmos-db': CosmosDbIcon,
  'storage-account': StorageAccountIcon,
  'redis-cache': RedisCacheIcon,
  'virtual-network': VirtualNetworkIcon,
  'application-gateway': ApplicationGatewayIcon,
  'load-balancer': LoadBalancerIcon,
  'front-door': FrontDoorIcon,
  'key-vault': KeyVaultIcon,
  'api-management': ApiManagementIcon,
  'service-bus': ServiceBusIcon,
  'event-hub': EventHubIcon,
  'azure-openai': AzureOpenAiIcon,
  'entra-id': EntraIdIcon,
  'log-analytics': LogAnalyticsIcon,
  'resource-group': ResourceGroupIcon,
};
