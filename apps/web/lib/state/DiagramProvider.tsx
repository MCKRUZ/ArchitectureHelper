'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DiagramContext, type DiagramContextValue } from './DiagramContext';
import type { DiagramState, AzureNode, AzureEdge, GroupType, ArchReviewFinding, CostSummary } from './types';
import { createInitialState } from './types';
import { COST_ESTIMATES } from '@/lib/waf/costEstimates';
import type { AzureServiceType } from './types';

interface DiagramProviderProps {
  children: ReactNode;
}

export function DiagramProvider({ children }: DiagramProviderProps) {
  const [state, setStateInternal] = useState<DiagramState>(createInitialState);

  const setState = useCallback(
    (updater: DiagramState | ((prev: DiagramState | undefined) => DiagramState)) => {
      if (typeof updater === 'function') {
        setStateInternal((prev) => updater(prev));
      } else {
        setStateInternal(updater);
      }
    },
    []
  );

  const getState = (prev: DiagramState | undefined): DiagramState =>
    prev ?? createInitialState();

  const selectedNode = useMemo(() => {
    if (!state.selectedNodeId) return null;
    return state.nodes.find((n) => n.id === state.selectedNodeId) ?? null;
  }, [state.nodes, state.selectedNodeId]);

  const selectedEdge = useMemo(() => {
    if (!state.selectedEdgeId) return null;
    return state.edges.find((e) => e.id === state.selectedEdgeId) ?? null;
  }, [state.edges, state.selectedEdgeId]);

  const addNode = useCallback(
    (node: AzureNode) => {
      setState((prev) => {
        const s = getState(prev);
        return {
          ...s,
          nodes: [...s.nodes, node],
          lastModified: new Date().toISOString(),
          version: s.version + 1,
        };
      });
    },
    [setState]
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      setState((prev) => {
        const s = getState(prev);
        return {
          ...s,
          nodes: s.nodes.filter((n) => n.id !== nodeId),
          edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
          selectedNodeId: s.selectedNodeId === nodeId ? null : s.selectedNodeId,
          lastModified: new Date().toISOString(),
          version: s.version + 1,
        };
      });
    },
    [setState]
  );

  const updateNode = useCallback(
    (nodeId: string, updates: Partial<AzureNode>) => {
      setState((prev) => {
        const s = getState(prev);
        return {
          ...s,
          nodes: s.nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
          lastModified: new Date().toISOString(),
          version: s.version + 1,
        };
      });
    },
    [setState]
  );

  const addEdge = useCallback(
    (edge: AzureEdge) => {
      setState((prev) => {
        const s = getState(prev);
        return {
          ...s,
          edges: [...s.edges, edge],
          lastModified: new Date().toISOString(),
          version: s.version + 1,
        };
      });
    },
    [setState]
  );

  const removeEdge = useCallback(
    (edgeId: string) => {
      setState((prev) => {
        const s = getState(prev);
        return {
          ...s,
          edges: s.edges.filter((e) => e.id !== edgeId),
          selectedEdgeId: s.selectedEdgeId === edgeId ? null : s.selectedEdgeId,
          lastModified: new Date().toISOString(),
          version: s.version + 1,
        };
      });
    },
    [setState]
  );

  const selectNode = useCallback(
    (nodeId: string | null) => {
      setState((prev) => {
        const s = getState(prev);
        return {
          ...s,
          selectedNodeId: nodeId,
          selectedEdgeId: null,
        };
      });
    },
    [setState]
  );

  const selectEdge = useCallback(
    (edgeId: string | null) => {
      setState((prev) => {
        const s = getState(prev);
        return {
          ...s,
          selectedEdgeId: edgeId,
          selectedNodeId: null,
        };
      });
    },
    [setState]
  );

  const updateNodesPositions = useCallback(
    (updates: Array<{ id: string; position: { x: number; y: number } }>) => {
      setState((prev) => {
        const s = getState(prev);
        return {
          ...s,
          nodes: s.nodes.map((n) => {
            const update = updates.find((u) => u.id === n.id);
            return update ? { ...n, position: update.position } : n;
          }),
        };
      });
    },
    [setState]
  );

  const setDiagramName = useCallback(
    (name: string) => {
      setState((prev) => {
        const s = getState(prev);
        return {
          ...s,
          diagramName: name,
          lastModified: new Date().toISOString(),
        };
      });
    },
    [setState]
  );

  const clearDiagram = useCallback(() => {
    setState(createInitialState());
  }, [setState]);

  const setValidationResults = useCallback(
    (results: ArchReviewFinding[]) => {
      setState((prev) => {
        const s = getState(prev);
        return {
          ...s,
          validationResults: results,
        };
      });
    },
    [setState]
  );

  const setCostSummary = useCallback(
    (summary: CostSummary) => {
      setState((prev) => {
        const s = getState(prev);
        return {
          ...s,
          costSummary: summary,
        };
      });
    },
    [setState]
  );

  const addGroup = useCallback(
    (group: {
      id: string;
      position: { x: number; y: number };
      displayName: string;
      groupType: GroupType;
      subtitle?: string;
      width?: number;
      height?: number;
    }) => {
      setState((prev) => {
        const s = getState(prev);
        const groupNode: AzureNode = {
          id: group.id,
          type: 'group',
          position: group.position,
          data: {
            serviceType: 'resource-group',
            displayName: group.displayName,
            category: 'networking',
            status: 'proposed',
            properties: {
              width: group.width ?? 400,
              height: group.height ?? 200,
            },
            groupType: group.groupType,
            subtitle: group.subtitle,
          },
        };
        return {
          ...s,
          nodes: [groupNode, ...s.nodes],
          lastModified: new Date().toISOString(),
          version: s.version + 1,
        };
      });
    },
    [setState]
  );

  const assignNodeToGroup = useCallback(
    (nodeId: string, groupId: string) => {
      setState((prev) => {
        const s = getState(prev);
        const node = s.nodes.find((n) => n.id === nodeId);
        const group = s.nodes.find((n) => n.id === groupId);
        if (!node || !group) return s;

        const relativePosition = {
          x: node.position.x - group.position.x,
          y: node.position.y - group.position.y,
        };

        return {
          ...s,
          nodes: s.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, parentId: groupId, position: relativePosition }
              : n
          ),
          lastModified: new Date().toISOString(),
          version: s.version + 1,
        };
      });
    },
    [setState]
  );

  const removeNodeFromGroup = useCallback(
    (nodeId: string) => {
      setState((prev) => {
        const s = getState(prev);
        const node = s.nodes.find((n) => n.id === nodeId);
        if (!node || !node.parentId) return s;

        const group = s.nodes.find((n) => n.id === node.parentId);
        const absolutePosition = group
          ? { x: node.position.x + group.position.x, y: node.position.y + group.position.y }
          : node.position;

        return {
          ...s,
          nodes: s.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, parentId: undefined, position: absolutePosition }
              : n
          ),
          lastModified: new Date().toISOString(),
          version: s.version + 1,
        };
      });
    },
    [setState]
  );

  const batchUpdate = useCallback(
    (ops: {
      addNodes?: AzureNode[];
      addEdges?: AzureEdge[];
      positionUpdates?: Array<{ id: string; position: { x: number; y: number } }>;
      nodeUpdates?: Array<{ id: string; updates: Partial<AzureNode> }>;
      parentAssignments?: Array<{ nodeId: string; groupId: string }>;
    }) => {
      setState((prev) => {
        let s = getState(prev);

        if (ops.addNodes && ops.addNodes.length > 0) {
          const groups = ops.addNodes.filter((n) => n.type === 'group');
          const services = ops.addNodes.filter((n) => n.type !== 'group');
          s = { ...s, nodes: [...groups, ...s.nodes, ...services] };
        }

        if (ops.addEdges && ops.addEdges.length > 0) {
          s = { ...s, edges: [...s.edges, ...ops.addEdges] };
        }

        if (ops.parentAssignments && ops.parentAssignments.length > 0) {
          const assignMap = new Map(
            ops.parentAssignments.map((a) => [a.nodeId, a.groupId])
          );
          s = {
            ...s,
            nodes: s.nodes.map((n) => {
              const groupId = assignMap.get(n.id);
              return groupId ? { ...n, parentId: groupId } : n;
            }),
          };
        }

        if (ops.positionUpdates && ops.positionUpdates.length > 0) {
          const posMap = new Map(
            ops.positionUpdates.map((u) => [u.id, u.position])
          );
          s = {
            ...s,
            nodes: s.nodes.map((n) => {
              const pos = posMap.get(n.id);
              return pos ? { ...n, position: pos } : n;
            }),
          };
        }

        if (ops.nodeUpdates && ops.nodeUpdates.length > 0) {
          const updateMap = new Map(
            ops.nodeUpdates.map((u) => [u.id, u.updates])
          );
          s = {
            ...s,
            nodes: s.nodes.map((n) => {
              const upd = updateMap.get(n.id);
              if (!upd) return n;
              return {
                ...n,
                ...upd,
                data: upd.data ? { ...n.data, ...upd.data } : n.data,
              };
            }),
          };
        }

        return {
          ...s,
          lastModified: new Date().toISOString(),
          version: s.version + 1,
        };
      });
    },
    [setState]
  );

  const removeGroup = useCallback(
    (groupId: string) => {
      setState((prev) => {
        const s = getState(prev);
        const group = s.nodes.find((n) => n.id === groupId);
        if (!group) return s;

        return {
          ...s,
          nodes: s.nodes
            .filter((n) => n.id !== groupId)
            .map((n) =>
              n.parentId === groupId
                ? {
                    ...n,
                    parentId: undefined,
                    position: {
                      x: n.position.x + group.position.x,
                      y: n.position.y + group.position.y,
                    },
                  }
                : n
            ),
          edges: s.edges.filter((e) => e.source !== groupId && e.target !== groupId),
          lastModified: new Date().toISOString(),
          version: s.version + 1,
        };
      });
    },
    [setState]
  );

  // Reactive cost summary: recompute whenever nodes change
  const nodesVersionRef = useRef(0);
  useEffect(() => {
    // Debounce: only recompute if version actually changed
    const currentVersion = state.version;
    if (currentVersion === nodesVersionRef.current) return;
    nodesVersionRef.current = currentVersion;

    const nonGroupNodes = state.nodes.filter(n => n.type !== 'group');
    if (nonGroupNodes.length === 0) return;

    let monthly = 0;
    const byService: Record<string, number> = {};
    const byResourceGroup: Record<string, number> = {};

    nonGroupNodes.forEach(n => {
      const cost = n.data.monthlyCost ?? COST_ESTIMATES[n.data.serviceType as AzureServiceType] ?? 0;
      monthly += cost;

      // Aggregate by service type
      const svcKey = n.data.serviceType;
      byService[svcKey] = (byService[svcKey] ?? 0) + cost;

      // Aggregate by parent resource group
      const parentId = n.parentId;
      if (parentId) {
        const parent = state.nodes.find(p => p.id === parentId);
        const rgName = parent?.data.displayName ?? parentId;
        byResourceGroup[rgName] = (byResourceGroup[rgName] ?? 0) + cost;
      } else {
        byResourceGroup['Unassigned'] = (byResourceGroup['Unassigned'] ?? 0) + cost;
      }
    });

    setStateInternal(prev => ({
      ...prev,
      costSummary: { monthly, byService, byResourceGroup },
    }));
  }, [state.nodes, state.version]);

  const value: DiagramContextValue = useMemo(
    () => ({
      state,
      setState,
      selectedNode,
      selectedEdge,
      addNode,
      removeNode,
      updateNode,
      addEdge,
      removeEdge,
      selectNode,
      selectEdge,
      updateNodesPositions,
      setDiagramName,
      clearDiagram,
      addGroup,
      assignNodeToGroup,
      removeNodeFromGroup,
      removeGroup,
      batchUpdate,
      setValidationResults,
      setCostSummary,
    }),
    [
      state,
      setState,
      selectedNode,
      selectedEdge,
      addNode,
      removeNode,
      updateNode,
      addEdge,
      removeEdge,
      selectNode,
      selectEdge,
      updateNodesPositions,
      setDiagramName,
      clearDiagram,
      addGroup,
      assignNodeToGroup,
      removeNodeFromGroup,
      removeGroup,
      batchUpdate,
      setValidationResults,
      setCostSummary,
    ]
  );

  return (
    <DiagramContext.Provider value={value}>
      {children}
    </DiagramContext.Provider>
  );
}
