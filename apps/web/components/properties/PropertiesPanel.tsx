'use client';

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useDiagramState } from '@/lib/state/useDiagramState';
import type { AzureNodeData, AzureNode, NodeStatus } from '@/lib/state/types';
import type { CostBreakdown } from '@/lib/pricing/types';
import { PRICING_DESCRIPTORS } from '@/lib/pricing/descriptors';
import { calculateServiceCost, getDefaultPricingConfig, deriveSku } from '@/lib/pricing/calculateCost';
import { PricingConfigForm } from './PricingConfigForm';
import { PricingLineItems } from './PricingLineItems';
import { RefreshPricingButton } from './RefreshPricingButton';

export function PropertiesPanel() {
  const { selectedNode, selectedEdge, updateNode, removeNode, removeEdge } = useDiagramState();

  const handleNodeDataUpdate = (nodeId: string, currentData: AzureNodeData, updates: Partial<AzureNodeData>) => {
    const newData: AzureNodeData = { ...currentData, ...updates };
    updateNode(nodeId, { data: newData } as Partial<AzureNode>);
  };

  if (selectedNode) {
    return (
      <NodePropertiesPanel
        node={selectedNode}
        onUpdate={(updates) => handleNodeDataUpdate(selectedNode.id, selectedNode.data, updates)}
        onDelete={() => removeNode(selectedNode.id)}
      />
    );
  }

  if (selectedEdge) {
    return (
      <EdgePropertiesPanel
        edge={selectedEdge}
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
  onUpdate: (updates: Partial<AzureNodeData>) => void;
  onDelete: () => void;
}

function NodePropertiesPanel({ node, onUpdate, onDelete }: NodePropertiesPanelProps) {
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
            badge={`$${Math.round(breakdown.totalMonthlyCost).toLocaleString()}/mo`}
          >
            <PricingLineItems breakdown={breakdown} />
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

interface EdgePropertiesPanelProps {
  edge: { id: string; source: string; target: string; data?: { connectionType?: string; isEncrypted?: boolean } };
  onDelete: () => void;
}

function EdgePropertiesPanel({ edge, onDelete }: EdgePropertiesPanelProps) {
  return (
    <div className="h-full flex flex-col bg-card border-l">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Connection</h2>
        <p className="text-sm text-muted-foreground">
          {edge.source} &rarr; {edge.target}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <PropertyField label="Connection Type">
          <span className="text-sm capitalize">{edge.data?.connectionType || 'public'}</span>
        </PropertyField>
        <PropertyField label="Encrypted">
          <span className="text-sm">{edge.data?.isEncrypted ? 'Yes' : 'No'}</span>
        </PropertyField>
      </div>

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
