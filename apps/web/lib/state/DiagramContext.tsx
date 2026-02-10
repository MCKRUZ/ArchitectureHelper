'use client';

import { createContext } from 'react';
import type { DiagramState, AzureNode, AzureEdge, GroupType, ArchReviewFinding, CostSummary } from './types';

export interface DiagramContextValue {
  state: DiagramState;
  setState: (updater: DiagramState | ((prev: DiagramState | undefined) => DiagramState)) => void;
  selectedNode: AzureNode | null;
  selectedEdge: AzureEdge | null;
  addNode: (node: AzureNode) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<AzureNode>) => void;
  addEdge: (edge: AzureEdge) => void;
  removeEdge: (edgeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  updateNodesPositions: (updates: Array<{ id: string; position: { x: number; y: number } }>) => void;
  setDiagramName: (name: string) => void;
  clearDiagram: () => void;
  addGroup: (group: {
    id: string;
    position: { x: number; y: number };
    displayName: string;
    groupType: GroupType;
    subtitle?: string;
    width?: number;
    height?: number;
  }) => void;
  assignNodeToGroup: (nodeId: string, groupId: string) => void;
  removeNodeFromGroup: (nodeId: string) => void;
  removeGroup: (groupId: string) => void;
  batchUpdate: (ops: {
    addNodes?: AzureNode[];
    addEdges?: AzureEdge[];
    positionUpdates?: Array<{ id: string; position: { x: number; y: number } }>;
    nodeUpdates?: Array<{ id: string; updates: Partial<AzureNode> }>;
    parentAssignments?: Array<{ nodeId: string; groupId: string }>;
  }) => void;
  setValidationResults: (results: ArchReviewFinding[]) => void;
  setCostSummary: (summary: CostSummary) => void;
}

export const DiagramContext = createContext<DiagramContextValue | null>(null);
