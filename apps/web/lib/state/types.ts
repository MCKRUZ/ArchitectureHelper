/**
 * AzureCraft State Types
 *
 * Shared state types used by both the frontend and AG-UI agent.
 */

// Azure service categories for palette organization
export type AzureServiceCategory =
  | 'compute'
  | 'networking'
  | 'databases'
  | 'storage'
  | 'security'
  | 'integration'
  | 'ai-ml'
  | 'analytics'
  | 'devops'
  | 'identity'
  | 'management'
  | 'web'
  | 'containers'
  | 'messaging';

// Azure service type identifiers
export type AzureServiceType =
  | 'app-service'
  | 'function-app'
  | 'virtual-machine'
  | 'container-apps'
  | 'aks'
  | 'azure-sql'
  | 'cosmos-db'
  | 'storage-account'
  | 'redis-cache'
  | 'virtual-network'
  | 'application-gateway'
  | 'load-balancer'
  | 'front-door'
  | 'key-vault'
  | 'api-management'
  | 'service-bus'
  | 'event-hub'
  | 'azure-openai'
  | 'entra-id'
  | 'log-analytics'
  | 'application-insights'
  | 'ai-search'
  | 'ddos-protection'
  | 'event-grid'
  | 'static-web-app'
  | 'resource-group';

// Group container types
export type GroupType = 'resource-group' | 'virtual-network' | 'subnet';

// Node status
export type NodeStatus = 'proposed' | 'healthy' | 'warning' | 'error';

// Connection types between services
export type ConnectionType =
  | 'private-endpoint'
  | 'vnet-integration'
  | 'public'
  | 'service-endpoint'
  | 'peering';

// Data attached to each Azure node
export interface AzureNodeData extends Record<string, unknown> {
  serviceType: AzureServiceType;
  displayName: string;
  /** AI-generated description of why this service exists and its role */
  description?: string;
  resourceId?: string;
  sku?: string;
  region?: string;
  monthlyCost?: number;
  status: NodeStatus;
  properties: Record<string, unknown>;
  category: AzureServiceCategory;
  groupType?: GroupType;
  subtitle?: string;
}

// Azure node (extends React Flow node)
export interface AzureNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: AzureNodeData;
  parentId?: string;
}

// Edge data for connections
export interface AzureEdgeData extends Record<string, unknown> {
  connectionType: ConnectionType;
  protocol?: string;
  port?: number;
  isEncrypted: boolean;
  label?: string;
}

// Azure edge (extends React Flow edge)
export interface AzureEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: AzureEdgeData;
}

// Resource group boundary
export interface ResourceGroup {
  id: string;
  name: string;
  location: string;
  childNodeIds: string[];
}

// Cost summary
export interface CostSummary {
  monthly: number;
  byService: Record<string, number>;
  byResourceGroup: Record<string, number>;
}

// Well-Architected review finding
export interface ArchReviewFinding {
  pillar: 'reliability' | 'security' | 'cost' | 'operational-excellence' | 'performance';
  severity: 'critical' | 'warning' | 'info';
  nodeId: string;
  title: string;
  description: string;
  recommendation: string;
}

// Optimization suggestion
export interface Optimization {
  id: string;
  title: string;
  currentCost: number;
  optimizedCost: number;
  savings: number;
  affectedNodes: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

// Main diagram state (shared with agent)
export interface DiagramState {
  // Canvas state
  nodes: AzureNode[];
  edges: AzureEdge[];
  groups: ResourceGroup[];

  // UI state
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  viewMode: '2d' | 'isometric' | 'cost-heatmap' | 'compliance';
  zoom: number;

  // Agent-computed
  costSummary: CostSummary;
  validationResults: ArchReviewFinding[];
  suggestedOptimizations: Optimization[];

  // Metadata
  diagramId?: string;
  diagramName: string;
  lastModified: string;
  version: number;
}

// Initial state factory
export function createInitialState(): DiagramState {
  return {
    nodes: [],
    edges: [],
    groups: [],
    selectedNodeId: null,
    selectedEdgeId: null,
    viewMode: '2d',
    zoom: 1,
    costSummary: {
      monthly: 0,
      byService: {},
      byResourceGroup: {},
    },
    validationResults: [],
    suggestedOptimizations: [],
    diagramName: 'Untitled Architecture',
    lastModified: new Date().toISOString(),
    version: 1,
  };
}
