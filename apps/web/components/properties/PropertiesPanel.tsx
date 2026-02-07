'use client';

import { cn } from '@/lib/utils';
import { useDiagramState } from '@/lib/state/useDiagramState';
import type { AzureNodeData, AzureNode, NodeStatus } from '@/lib/state/types';

export function PropertiesPanel() {
  const { selectedNode, selectedEdge, updateNode, removeNode, removeEdge } = useDiagramState();

  // Handle node data updates - merges partial data into full node update
  const handleNodeDataUpdate = (nodeId: string, currentData: AzureNodeData, updates: Partial<AzureNodeData>) => {
    const newData: AzureNodeData = { ...currentData, ...updates };
    updateNode(nodeId, { data: newData } as Partial<AzureNode>);
  };

  // Render appropriate panel based on selection
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

// Panel when nothing is selected
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

// Panel for node properties
interface NodePropertiesPanelProps {
  node: { id: string; data: AzureNodeData };
  onUpdate: (updates: Partial<AzureNodeData>) => void;
  onDelete: () => void;
}

function NodePropertiesPanel({ node, onUpdate, onDelete }: NodePropertiesPanelProps) {
  const { data } = node;

  const handleDataUpdate = (updates: Partial<AzureNodeData>) => {
    onUpdate(updates);
  };

  return (
    <div className="h-full flex flex-col bg-card border-l">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">{data.displayName}</h2>
          <StatusBadge status={data.status} />
        </div>
        <p className="text-sm text-muted-foreground capitalize">{data.serviceType.replace(/-/g, ' ')}</p>
      </div>

      {/* Properties form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Display Name */}
        <PropertyField label="Display Name">
          <input
            type="text"
            value={data.displayName}
            onChange={(e) => handleDataUpdate({ displayName: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </PropertyField>

        {/* SKU */}
        <PropertyField label="SKU / Tier">
          <input
            type="text"
            value={data.sku || ''}
            onChange={(e) => handleDataUpdate({ sku: e.target.value })}
            placeholder="e.g., Standard_D2s_v3"
            className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </PropertyField>

        {/* Region */}
        <PropertyField label="Region">
          <select
            value={data.region || ''}
            onChange={(e) => handleDataUpdate({ region: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select region...</option>
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

        {/* Status */}
        <PropertyField label="Status">
          <select
            value={data.status}
            onChange={(e) => handleDataUpdate({ status: e.target.value as NodeStatus })}
            className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="proposed">Proposed</option>
            <option value="healthy">Healthy</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </PropertyField>

        {/* Monthly Cost */}
        <PropertyField label="Est. Monthly Cost">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <input
              type="number"
              value={data.monthlyCost || ''}
              onChange={(e) => handleDataUpdate({ monthlyCost: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              min="0"
              step="0.01"
              className="w-full pl-7 pr-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">/mo</span>
          </div>
        </PropertyField>

        {/* Resource ID (read-only) */}
        {data.resourceId && (
          <PropertyField label="Resource ID">
            <input
              type="text"
              value={data.resourceId}
              readOnly
              className="w-full px-3 py-2 text-sm rounded-md border bg-muted text-muted-foreground cursor-not-allowed"
            />
          </PropertyField>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t">
        <button
          onClick={onDelete}
          className="w-full px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive rounded-md hover:bg-destructive/90 transition-colors"
        >
          Delete Service
        </button>
      </div>
    </div>
  );
}

// Panel for edge properties
interface EdgePropertiesPanelProps {
  edge: { id: string; source: string; target: string; data?: { connectionType?: string; isEncrypted?: boolean } };
  onDelete: () => void;
}

function EdgePropertiesPanel({ edge, onDelete }: EdgePropertiesPanelProps) {
  return (
    <div className="h-full flex flex-col bg-card border-l">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Connection</h2>
        <p className="text-sm text-muted-foreground">
          {edge.source} → {edge.target}
        </p>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <PropertyField label="Connection Type">
          <span className="text-sm capitalize">{edge.data?.connectionType || 'public'}</span>
        </PropertyField>

        <PropertyField label="Encrypted">
          <span className="text-sm">{edge.data?.isEncrypted ? 'Yes' : 'No'}</span>
        </PropertyField>
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

// Reusable property field wrapper
function PropertyField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

// Status badge component
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
