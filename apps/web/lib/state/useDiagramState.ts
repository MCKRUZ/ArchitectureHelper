'use client';

import { useCallback, useMemo, useState } from 'react';
import type { DiagramState, AzureNode, AzureEdge, GroupType } from './types';
import { createInitialState } from './types';

/**
 * Hook for managing diagram state.
 * TODO: Integrate with CopilotKit useCoAgent once AI features are enabled.
 */
export function useDiagramState() {
  const [state, setStateInternal] = useState<DiagramState>(createInitialState);

  // Wrapper to match CopilotKit's setState signature
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

  // Helper to get state with fallback
  const getState = (prev: DiagramState | undefined): DiagramState =>
    prev ?? createInitialState();

  // Get selected node
  const selectedNode = useMemo(() => {
    if (!state.selectedNodeId) return null;
    return state.nodes.find((n) => n.id === state.selectedNodeId) ?? null;
  }, [state.nodes, state.selectedNodeId]);

  // Get selected edge
  const selectedEdge = useMemo(() => {
    if (!state.selectedEdgeId) return null;
    return state.edges.find((e) => e.id === state.selectedEdgeId) ?? null;
  }, [state.edges, state.selectedEdgeId]);

  // Add a node
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

  // Remove a node
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

  // Update a node
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

  // Add an edge
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

  // Remove an edge
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

  // Select a node
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

  // Select an edge
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

  // Update nodes positions (for drag)
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

  // Set diagram name
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

  // Clear diagram
  const clearDiagram = useCallback(() => {
    setState(createInitialState());
  }, [setState]);

  // Add a group node
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

  // Assign a node to a group (set parentId, convert to relative position)
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

  // Remove a node from its group (clear parentId, convert to absolute position)
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

  // Remove a group (ungroup all children, preserving absolute positions)
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

  return {
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
  };
}
