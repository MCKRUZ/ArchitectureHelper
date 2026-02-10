'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { AzureServiceCategory, AzureServiceType, GroupType } from '@/lib/state/types';
import { AzureServiceIcon } from '@/components/icons/AzureServiceIcon';

// Container group definitions for the palette
interface GroupDefinition {
  groupType: GroupType;
  name: string;
  description: string;
  color: string;
}

const CONTAINER_GROUPS: GroupDefinition[] = [
  { groupType: 'resource-group', name: 'Resource Group', description: 'Logical container', color: '#3B82F6' },
  { groupType: 'virtual-network', name: 'Virtual Network', description: 'Private network boundary', color: '#10B981' },
  { groupType: 'subnet', name: 'Subnet', description: 'Network segment', color: '#8B5CF6' },
];

// Service definition for palette items
interface ServiceDefinition {
  type: AzureServiceType;
  name: string;
  category: AzureServiceCategory;
  description: string;
}

// Available Azure services organized by category
const AZURE_SERVICES: ServiceDefinition[] = [
  // Compute
  { type: 'app-service', name: 'App Service', category: 'compute', description: 'Web apps and APIs' },
  { type: 'function-app', name: 'Function App', category: 'compute', description: 'Serverless compute' },
  { type: 'virtual-machine', name: 'Virtual Machine', category: 'compute', description: 'IaaS compute' },
  { type: 'container-apps', name: 'Container Apps', category: 'containers', description: 'Serverless containers' },
  { type: 'aks', name: 'AKS', category: 'containers', description: 'Managed Kubernetes' },

  // Data
  { type: 'azure-sql', name: 'Azure SQL', category: 'databases', description: 'Managed SQL database' },
  { type: 'cosmos-db', name: 'Cosmos DB', category: 'databases', description: 'NoSQL database' },
  { type: 'storage-account', name: 'Storage Account', category: 'storage', description: 'Blob, file, queue storage' },
  { type: 'redis-cache', name: 'Redis Cache', category: 'databases', description: 'In-memory cache' },

  // Networking
  { type: 'virtual-network', name: 'Virtual Network', category: 'networking', description: 'Private network' },
  { type: 'application-gateway', name: 'App Gateway', category: 'networking', description: 'L7 load balancer' },
  { type: 'load-balancer', name: 'Load Balancer', category: 'networking', description: 'L4 load balancer' },
  { type: 'front-door', name: 'Front Door', category: 'networking', description: 'Global CDN & WAF' },

  // Security & Identity
  { type: 'key-vault', name: 'Key Vault', category: 'security', description: 'Secrets management' },
  { type: 'entra-id', name: 'Entra ID', category: 'identity', description: 'Identity management' },

  // Integration
  { type: 'api-management', name: 'API Management', category: 'integration', description: 'API gateway' },
  { type: 'service-bus', name: 'Service Bus', category: 'messaging', description: 'Message broker' },
  { type: 'event-hub', name: 'Event Hub', category: 'messaging', description: 'Event streaming' },

  // AI
  { type: 'azure-openai', name: 'Azure OpenAI', category: 'ai-ml', description: 'GPT models' },
  { type: 'ai-search', name: 'AI Search', category: 'ai-ml', description: 'Cognitive search' },

  // Management
  { type: 'log-analytics', name: 'Log Analytics', category: 'management', description: 'Monitoring & logs' },
  { type: 'application-insights', name: 'Application Insights', category: 'management', description: 'APM & telemetry' },

  // Security
  { type: 'ddos-protection', name: 'DDoS Protection', category: 'security', description: 'DDoS mitigation' },

  // Messaging
  { type: 'event-grid', name: 'Event Grid', category: 'messaging', description: 'Event routing' },

  // Web
  { type: 'static-web-app', name: 'Static Web App', category: 'web', description: 'Static site hosting' },
];

// Category display names and icons
const CATEGORY_INFO: Record<AzureServiceCategory, { name: string; color: string }> = {
  compute: { name: 'Compute', color: 'bg-orange-500' },
  networking: { name: 'Networking', color: 'bg-blue-500' },
  databases: { name: 'Databases', color: 'bg-purple-500' },
  storage: { name: 'Storage', color: 'bg-green-500' },
  security: { name: 'Security', color: 'bg-red-500' },
  integration: { name: 'Integration', color: 'bg-pink-500' },
  'ai-ml': { name: 'AI & ML', color: 'bg-indigo-500' },
  analytics: { name: 'Analytics', color: 'bg-cyan-500' },
  devops: { name: 'DevOps', color: 'bg-yellow-500' },
  identity: { name: 'Identity', color: 'bg-teal-500' },
  management: { name: 'Management', color: 'bg-gray-500' },
  web: { name: 'Web', color: 'bg-emerald-500' },
  containers: { name: 'Containers', color: 'bg-sky-500' },
  messaging: { name: 'Messaging', color: 'bg-violet-500' },
};

interface ServicePaletteProps {
  onDragStart?: (service: ServiceDefinition) => void;
}

export function ServicePalette({ onDragStart }: ServicePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AzureServiceCategory | 'all'>('all');

  // Filter services based on search and category
  const filteredServices = useMemo(() => {
    return AZURE_SERVICES.filter((service) => {
      const matchesSearch =
        searchQuery === '' ||
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Group services by category for display
  const groupedServices = useMemo(() => {
    const groups: Record<string, ServiceDefinition[]> = {};
    filteredServices.forEach((service) => {
      if (!groups[service.category]) {
        groups[service.category] = [];
      }
      groups[service.category].push(service);
    });
    return groups;
  }, [filteredServices]);

  // Handle drag start for services
  const handleDragStart = (e: React.DragEvent, service: ServiceDefinition) => {
    e.dataTransfer.setData('application/azurecraft-service', JSON.stringify(service));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(service);
  };

  // Handle drag start for group containers
  const handleGroupDragStart = (e: React.DragEvent, group: GroupDefinition) => {
    e.dataTransfer.setData('application/azurecraft-group', JSON.stringify({
      groupType: group.groupType,
      name: group.name,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="h-full flex flex-col bg-card border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Azure Services</h2>
        <p className="text-sm text-muted-foreground">Drag services onto the canvas</p>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <input
          type="text"
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Category Filter */}
      <div className="p-3 border-b">
        <div className="flex flex-wrap gap-1">
          <CategoryChip
            label="All"
            active={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
          />
          {Object.entries(CATEGORY_INFO).map(([category, info]) => (
            <CategoryChip
              key={category}
              label={info.name}
              color={info.color}
              active={selectedCategory === category}
              onClick={() => setSelectedCategory(category as AzureServiceCategory)}
            />
          ))}
        </div>
      </div>

      {/* Services List */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Container Groups Section */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Containers
          </h3>
          <div className="space-y-1">
            {CONTAINER_GROUPS.map((group) => (
              <div
                key={group.groupType}
                draggable
                onDragStart={(e) => handleGroupDragStart(e, group)}
                className="flex items-center gap-3 p-2 rounded-md cursor-grab hover:bg-muted/50 transition-colors active:cursor-grabbing"
              >
                <div
                  className="w-8 h-8 flex-shrink-0 rounded border-2 border-dashed flex items-center justify-center"
                  style={{ borderColor: group.color, background: `${group.color}10` }}
                >
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ background: group.color, opacity: 0.6 }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{group.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{group.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {Object.entries(groupedServices).map(([category, services]) => (
          <div key={category} className="mb-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {CATEGORY_INFO[category as AzureServiceCategory]?.name || category}
            </h3>
            <div className="space-y-1">
              {services.map((service) => (
                <ServiceItem
                  key={service.type}
                  service={service}
                  onDragStart={(e) => handleDragStart(e, service)}
                />
              ))}
            </div>
          </div>
        ))}

        {filteredServices.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No services found
          </div>
        )}
      </div>
    </div>
  );
}

// Category filter chip
function CategoryChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-1 text-xs rounded-full transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      )}
    >
      {color && <span className={cn('inline-block w-2 h-2 rounded-full mr-1', color)} />}
      {label}
    </button>
  );
}

// Draggable service item
function ServiceItem({
  service,
  onDragStart,
}: {
  service: ServiceDefinition;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-3 p-2 rounded-md cursor-grab hover:bg-muted/50 transition-colors active:cursor-grabbing"
    >
      {/* Azure Service Icon */}
      <AzureServiceIcon serviceType={service.type} className="w-8 h-8 flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{service.name}</div>
        <div className="text-xs text-muted-foreground truncate">{service.description}</div>
      </div>
    </div>
  );
}
