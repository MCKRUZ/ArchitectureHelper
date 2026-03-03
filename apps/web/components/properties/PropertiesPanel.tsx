'use client';

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useDiagramState } from '@/lib/state/useDiagramState';
import type { AzureNodeData, AzureNode, AzureEdge, AzureEdgeData, NodeStatus, ConnectionType } from '@/lib/state/types';
import type { CostBreakdown } from '@/lib/pricing/types';
import { PRICING_DESCRIPTORS } from '@/lib/pricing/descriptors';
import { calculateServiceCost, getDefaultPricingConfig, deriveSku } from '@/lib/pricing/calculateCost';
import { PricingConfigForm } from './PricingConfigForm';
import { PricingLineItems } from './PricingLineItems';
import { RefreshPricingButton } from './RefreshPricingButton';

export function PropertiesPanel() {
  const { selectedNode, selectedEdge, updateNode, removeNode, removeEdge, updateEdge, state } = useDiagramState();

  const handleNodeDataUpdate = (nodeId: string, currentData: AzureNodeData, updates: Partial<AzureNodeData>) => {
    const newData: AzureNodeData = { ...currentData, ...updates };
    updateNode(nodeId, { data: newData } as Partial<AzureNode>);
  };

  if (selectedNode) {
    return (
      <NodePropertiesPanel
        node={selectedNode}
        globalDiscountPercent={state?.discounts?.globalPercent ?? 0}
        onUpdate={(updates) => handleNodeDataUpdate(selectedNode.id, selectedNode.data, updates)}
        onDelete={() => removeNode(selectedNode.id)}
      />
    );
  }

  if (selectedEdge) {
    return (
      <EdgePropertiesPanel
        edge={selectedEdge}
        onUpdate={(updates) => updateEdge(selectedEdge.id, updates)}
        onDelete={() => removeEdge(selectedEdge.id)}
      />
    );
  }

  return <EmptyStatePanel />;
}

function EmptyStatePanel() {
  return (
    <div className="h-full flex flex-col bg-card border-l">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Properties</h2>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Select a service or connection</p>
          <p className="text-xs mt-1">to view and edit properties</p>
        </div>
      </div>
    </div>
  );
}

// ─── Node Properties Panel ────────────────────────────────────────────────────

interface NodePropertiesPanelProps {
  node: { id: string; data: AzureNodeData };
  globalDiscountPercent: number;
  onUpdate: (updates: Partial<AzureNodeData>) => void;
  onDelete: () => void;
}

function NodePropertiesPanel({ node, globalDiscountPercent, onUpdate, onDelete }: NodePropertiesPanelProps) {
  const { data } = node;
  const isGroup = data.groupType !== undefined;

  // Initialize pricing config from node data or defaults
  const pricingConfig = useMemo(() => {
    const stored = data.properties?.pricing as Record<string, unknown> | undefined;
    if (stored && Object.keys(stored).length > 0) return stored;
    return getDefaultPricingConfig(data.serviceType);
  }, [data.properties?.pricing, data.serviceType]);

  const region = data.region || 'eastus';

  // Compute current breakdown for display
  const breakdown = useMemo(() => {
    return calculateServiceCost(data.serviceType, pricingConfig, region);
  }, [data.serviceType, pricingConfig, region]);

  const hasDescriptor = PRICING_DESCRIPTORS[data.serviceType] !== undefined;

  // Effective discount: per-node override takes precedence over global
  const nodeDiscountPercent = data.nodeDiscountPercent;
  const isUsingGlobal = nodeDiscountPercent == null;
  const effectiveDiscount = isUsingGlobal ? globalDiscountPercent : nodeDiscountPercent;

  // Collapsible section state
  const [sections, setSections] = useState({
    general: true,
    pricing: true,
    cost: true,
    description: !!data.description,
    advanced: false,
  });

  const toggleSection = useCallback((key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handlePricingChange = useCallback(
    (newConfig: Record<string, unknown>, newBreakdown: CostBreakdown) => {
      onUpdate({
        properties: { ...data.properties, pricing: newConfig },
        monthlyCost: newBreakdown.totalMonthlyCost,
        sku: deriveSku(data.serviceType, newConfig),
      });
    },
    [data.properties, data.serviceType, onUpdate],
  );

  const handleRegionChange = useCallback(
    (newRegion: string) => {
      const newBreakdown = calculateServiceCost(data.serviceType, pricingConfig, newRegion);
      onUpdate({
        region: newRegion,
        monthlyCost: newBreakdown.totalMonthlyCost,
      });
    },
    [data.serviceType, pricingConfig, onUpdate],
  );

  return (
    <div className="h-full flex flex-col bg-card border-l">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg truncate">{data.displayName}</h2>
          <StatusBadge status={data.status} />
        </div>
        <p className="text-sm text-muted-foreground capitalize">{data.serviceType.replace(/-/g, ' ')}</p>
        {data.sku && (
          <p className="text-xs text-muted-foreground mt-0.5">{data.sku}</p>
        )}
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto">
        {/* General Section */}
        <CollapsibleSection
          title="General"
          isOpen={sections.general}
          onToggle={() => toggleSection('general')}
        >
          <PropertyField label="Display Name">
            <input
              type="text"
              value={data.displayName}
              onChange={(e) => onUpdate({ displayName: e.target.value })}
              className="w-full px-3 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </PropertyField>

          <PropertyField label="Region">
            <select
              value={region}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="eastus">East US</option>
              <option value="eastus2">East US 2</option>
              <option value="westus">West US</option>
              <option value="westus2">West US 2</option>
              <option value="centralus">Central US</option>
              <option value="northeurope">North Europe</option>
              <option value="westeurope">West Europe</option>
              <option value="uksouth">UK South</option>
              <option value="southeastasia">Southeast Asia</option>
              <option value="australiaeast">Australia East</option>
            </select>
          </PropertyField>

          <PropertyField label="Status">
            <select
              value={data.status}
              onChange={(e) => onUpdate({ status: e.target.value as NodeStatus })}
              className="w-full px-3 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="proposed">Proposed</option>
              <option value="healthy">Healthy</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </PropertyField>
        </CollapsibleSection>

        {/* Pricing Configuration - only for non-group nodes */}
        {!isGroup && hasDescriptor && (
          <CollapsibleSection
            title="Pricing Configuration"
            isOpen={sections.pricing}
            onToggle={() => toggleSection('pricing')}
          >
            <PricingConfigForm
              serviceType={data.serviceType}
              config={pricingConfig}
              region={region}
              onChange={handlePricingChange}
            />
            <RefreshPricingButton serviceType={data.serviceType} region={region} />
          </CollapsibleSection>
        )}

        {/* Cost Breakdown */}
        {!isGroup && (
          <CollapsibleSection
            title="Cost Breakdown"
            isOpen={sections.cost}
            onToggle={() => toggleSection('cost')}
            badge={effectiveDiscount > 0
              ? `$${Math.round(breakdown.totalMonthlyCost * (1 - effectiveDiscount / 100)).toLocaleString()}/mo`
              : `$${Math.round(breakdown.totalMonthlyCost).toLocaleString()}/mo`
            }
          >
            {/* Discount row */}
            <div className="rounded-md border bg-muted/30 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Discount</label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isUsingGlobal}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Revert to global
                        onUpdate({ nodeDiscountPercent: null });
                      } else {
                        // Start overriding with global value as initial
                        onUpdate({ nodeDiscountPercent: globalDiscountPercent });
                      }
                    }}
                    className="rounded"
                  />
                  Use global ({globalDiscountPercent}%)
                </label>
              </div>
              {!isUsingGlobal && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={nodeDiscountPercent ?? 0}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(100, Number(e.target.value)));
                      onUpdate({ nodeDiscountPercent: val });
                    }}
                    className="w-20 px-2 py-1 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              )}
            </div>
            <PricingLineItems breakdown={breakdown} discountPercent={effectiveDiscount} />
          </CollapsibleSection>
        )}

        {/* Description (AI-generated) */}
        {data.description && (
          <CollapsibleSection
            title="Description"
            isOpen={sections.description}
            onToggle={() => toggleSection('description')}
          >
            <p className="text-sm text-muted-foreground leading-relaxed">{data.description}</p>
          </CollapsibleSection>
        )}

        {/* Advanced */}
        <CollapsibleSection
          title="Advanced"
          isOpen={sections.advanced}
          onToggle={() => toggleSection('advanced')}
        >
          {data.resourceId && (
            <PropertyField label="Resource ID">
              <input
                type="text"
                value={data.resourceId}
                readOnly
                className="w-full px-3 py-1.5 text-sm rounded-md border bg-muted text-muted-foreground cursor-not-allowed"
              />
            </PropertyField>
          )}
          <PropertyField label="Node ID">
            <input
              type="text"
              value={node.id}
              readOnly
              className="w-full px-3 py-1.5 text-sm rounded-md border bg-muted text-muted-foreground cursor-not-allowed font-mono text-xs"
            />
          </PropertyField>
        </CollapsibleSection>
      </div>

      {/* Actions */}
      <div className="p-4 border-t">
        <button
          onClick={onDelete}
          className="w-full px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive rounded-md hover:bg-destructive/90 transition-colors"
        >
          {isGroup ? 'Delete Group' : 'Delete Service'}
        </button>
      </div>
    </div>
  );
}

// ─── Edge Properties Panel ────────────────────────────────────────────────────

const CONN_META: Record<string, {
  color: string;
  badge: string;
  label: string;
  description: string;
  wafLevel: 'best' | 'good' | 'warn';
  wafNote: string;
}> = {
  'private-endpoint': {
    color: '#34d399',
    badge: 'PE',
    label: 'Private Endpoint',
    description: 'Traffic routed via Azure Private Link — stays on the Azure backbone, never traverses the public internet.',
    wafLevel: 'best',
    wafNote: 'Azure Well-Architected best practice. Eliminates public-internet exposure for PaaS services.',
  },
  'vnet-integration': {
    color: '#a78bfa',
    badge: 'VNet',
    label: 'VNet Integration',
    description: 'Outbound traffic from the service flows through the VNet. The service itself retains a public endpoint.',
    wafLevel: 'good',
    wafNote: 'Good — outbound traffic is controlled. For full isolation also restrict inbound via Private Endpoint.',
  },
  'service-endpoint': {
    color: '#fb923c',
    badge: 'SE',
    label: 'Service Endpoint',
    description: 'Traffic goes over the optimised Azure backbone path, but the target service still exposes a public IP.',
    wafLevel: 'warn',
    wafNote: 'Consider upgrading to Private Endpoint for zero public-internet exposure (WAF: Security pillar).',
  },
  'peering': {
    color: '#22d3ee',
    badge: 'Peer',
    label: 'VNet Peering',
    description: 'Network-level routing between two VNets. Traffic is private and low-latency.',
    wafLevel: 'good',
    wafNote: 'Ensure NSG rules control cross-VNet traffic. Use hub-and-spoke or Azure Firewall for central inspection.',
  },
  'public': {
    color: '#94a3b8',
    badge: null as unknown as string,
    label: 'Public',
    description: 'Traffic routes over the public internet. Subject to internet latency and exposure.',
    wafLevel: 'warn',
    wafNote: 'Security risk — consider Private Endpoint or at minimum TLS + IP allowlisting.',
  },
};

const WAF_ICONS = { best: '✅', good: '✓', warn: '⚠️' };
const WAF_COLORS = {
  best: 'text-green-600 dark:text-green-400',
  good: 'text-blue-600 dark:text-blue-400',
  warn: 'text-amber-600 dark:text-amber-400',
};

interface EdgePropertiesPanelProps {
  edge: { id: string; source: string; target: string; data?: Partial<AzureEdgeData> };
  onUpdate: (updates: Partial<AzureEdge>) => void;
  onDelete: () => void;
}

function EdgePropertiesPanel({ edge, onUpdate, onDelete }: EdgePropertiesPanelProps) {
  const { state } = useDiagramState();

  const sourceNode = state.nodes.find(n => n.id === edge.source);
  const targetNode = state.nodes.find(n => n.id === edge.target);

  const connType = edge.data?.connectionType || 'public';
  const meta = CONN_META[connType] ?? CONN_META['public'];

  // Resolve which container each node sits in
  const resolveContainer = (node: typeof sourceNode) => {
    if (!node) return null;
    const parent = node.data.logicalParent
      ? state.nodes.find(n => n.id === node.data.logicalParent)
      : null;
    return parent?.data.displayName ?? null;
  };

  const srcContainer = resolveContainer(sourceNode);
  const tgtContainer = resolveContainer(targetNode);

  return (
    <div className="h-full flex flex-col bg-card border-l">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: meta.color }}
          />
          <h2 className="font-semibold text-lg">Connection</h2>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground truncate max-w-[90px]">
            {sourceNode?.data.displayName ?? edge.source}
          </span>
          <span>→</span>
          <span className="font-medium text-foreground truncate max-w-[90px]">
            {targetNode?.data.displayName ?? edge.target}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Endpoints */}
        <CollapsibleSection title="Endpoints" isOpen={true} onToggle={() => {}}>
          <div className="space-y-3">
            {/* Source */}
            <div className="rounded-md border bg-muted/30 p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">FROM</span>
              </div>
              <p className="text-sm font-medium">{sourceNode?.data.displayName ?? edge.source}</p>
              {sourceNode && (
                <p className="text-xs text-muted-foreground capitalize mt-0.5">
                  {sourceNode.data.serviceType.replace(/-/g, ' ')}
                  {srcContainer ? ` · ${srcContainer}` : ''}
                </p>
              )}
            </div>
            {/* Target */}
            <div className="rounded-md border bg-muted/30 p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">TO</span>
              </div>
              <p className="text-sm font-medium">{targetNode?.data.displayName ?? edge.target}</p>
              {targetNode && (
                <p className="text-xs text-muted-foreground capitalize mt-0.5">
                  {targetNode.data.serviceType.replace(/-/g, ' ')}
                  {tgtContainer ? ` · ${tgtContainer}` : ''}
                </p>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* Connection Details */}
        <CollapsibleSection title="Connection Details" isOpen={true} onToggle={() => {}}>
          <PropertyField label="Type">
            <select
              value={connType}
              onChange={(e) => onUpdate({
                data: {
                  isEncrypted: true,
                  ...edge.data,
                  connectionType: e.target.value as ConnectionType,
                } as AzureEdgeData,
              })}
              className="w-full text-sm bg-muted border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="private-endpoint">Private Endpoint</option>
              <option value="vnet-integration">VNet Integration</option>
              <option value="service-endpoint">Service Endpoint</option>
              <option value="peering">VNet Peering</option>
              <option value="public">Public</option>
            </select>
          </PropertyField>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">{meta.description}</p>

          <PropertyField label="Encrypted">
            <span className={cn('text-sm font-medium', edge.data?.isEncrypted !== false ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
              {edge.data?.isEncrypted !== false ? '✓ Yes' : '✗ No'}
            </span>
          </PropertyField>

          {edge.data?.protocol && (
            <PropertyField label="Protocol">
              <span className="text-sm font-mono">{edge.data.protocol}</span>
            </PropertyField>
          )}

          {edge.data?.port && (
            <PropertyField label="Port">
              <span className="text-sm font-mono">{edge.data.port}</span>
            </PropertyField>
          )}

          {edge.data?.label && (
            <PropertyField label="Label">
              <span className="text-sm">{edge.data.label}</span>
            </PropertyField>
          )}
        </CollapsibleSection>

        {/* WAF Assessment */}
        <CollapsibleSection title="WAF Assessment" isOpen={true} onToggle={() => {}}>
          <div className={cn('flex gap-2 text-sm', WAF_COLORS[meta.wafLevel])}>
            <span className="flex-shrink-0 mt-0.5">{WAF_ICONS[meta.wafLevel]}</span>
            <p className="text-xs leading-relaxed">{meta.wafNote}</p>
          </div>
        </CollapsibleSection>
      </div>

      {/* Actions */}
      <div className="p-4 border-t">
        <button
          onClick={onDelete}
          className="w-full px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive rounded-md hover:bg-destructive/90 transition-colors"
        >
          Delete Connection
        </button>
      </div>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}

function CollapsibleSection({ title, isOpen, onToggle, badge, children }: CollapsibleSectionProps) {
  return (
    <div className="border-b">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <ChevronIcon isOpen={isOpen} />
          <span className="text-sm font-medium">{title}</span>
        </div>
        {badge && (
          <span className="text-xs font-mono text-muted-foreground">{badge}</span>
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', isOpen && 'rotate-90')}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function PropertyField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: NodeStatus }) {
  const colors = {
    proposed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    healthy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', colors[status])}>
      {status}
    </span>
  );
}
